import { useContext, useEffect, useRef, useState } from "react";

import './RealTimeStatusPage.css';
import RealTimeStatusHeader from "./RealTimeStatusHeader";
import RealTimeStatusTimestamp from "./RealTimeStatusTimestamp";
import RealTimeStatusThermostatTable from "./RealTimeStatusThermostatTable";
import { Spinner } from "react-bootstrap";
import RealTimeStatusSystemDiagram from "./RealTimeStatusSystemDiagram";
import InstallationPicker from "../_shared/InstallationPicker";
import SessionContext, { installationForRouteId } from "../_util/SessionContext";
import { useRouteInfo } from "../_util/useRouteInfo";
import { getDashboardWebSocketUrl } from "../_util/visualizerApi";
import { hasRealTimeAccessForInstallationAlias } from "../auth/auth";
import { controlFromSnapshot, type SnapshotPayload } from "./snapshotState";

interface RelayInfo {
    name: string;
    channel_name: string;
    display_name: string;
    state: string;
    last_update: number;
}

/** Map SCADA names like `hp-failsafe-relay5` to diagram keys `relay5` (see `LatestReadingList`). */
function relayKeyFromScadaChannelName(channelName: string): string | null {
    const withSuffix = channelName.match(/-relay(\d+)$/i);
    if (withSuffix) {
        return `relay${withSuffix[1]}`;
    }
    const plain = channelName.match(/^relay(\d+)$/i);
    if (plain) {
        return `relay${plain[1]}`;
    }
    return null;
}

function scadaValueToRelayState(value: number): string {
    return value !== 0 ? 'energized' : 'deenergized';
}

function relayMapFromScadaReadings(readings: Record<string, number>): Record<string, RelayInfo> {
    const out: Record<string, RelayInfo> = {};
    const now = Date.now();
    for (const [channelName, value] of Object.entries(readings)) {
        const key = relayKeyFromScadaChannelName(channelName);
        if (!key) {
            continue;
        }
        out[key] = {
            name: key,
            channel_name: channelName,
            display_name: channelName,
            state: scadaValueToRelayState(value),
            last_update: now,
        };
    }
    return out;
}

interface DashboardStatusMessage {
    type: 'status';
    target_gnode?: string;
    thermostat_names?: string[];
    relays?: Record<string, RelayInfo>;
}

interface DashboardMqttMessage {
    type: 'mqtt_message';
    message_type: string;
    payload?: unknown;
}

interface DashboardErrorMessage {
    type: 'error';
    message?: string;
}

interface DashboardErrorMessage {
    type: 'error';
    message?: string;
}

type DashboardInbound =
    | DashboardStatusMessage
    | DashboardMqttMessage
    | DashboardErrorMessage
    | { type: string };

/** Set true to log each raw WebSocket frame (very noisy during snapshots). */
const LOG_RAW_DASHBOARD_WS_INBOUND = false;

// ── [auto-snapshot] Disabled: the centralized gateway pushes snapshots on the SCADA's
// ~30s cadence, so on-demand polling is unnecessary. To restore, uncomment everything
// tagged [auto-snapshot] in this file (and in RealTimeStatusTimestamp.tsx), and re-add
// `useCallback` to the react import. Note: against the gateway, `request_snapshot` is
// answered from its cache (no SCADA round-trip), so polling faster than ~30s only
// re-sends the same cached snapshot.
//
// /**
//  * Milliseconds until the next local snapshot tick on the minute grid: offsets i·x seconds from
//  * each minute start for i ≥ 0 while i·x ≤ 60. The next tick is strictly after `fromMs`.
//  */
// function msUntilNextSnapshotGridTick(fromMs: number, xSeconds: number): number {
//     const periodMs = xSeconds * 1000;
//     const d = new Date(fromMs);
//     d.setMilliseconds(0);
//     d.setSeconds(0);
//     let baseMs = d.getTime();
//     for (let guard = 0; guard < 4; guard++) {
//         for (let i = 0; i * xSeconds <= 60; i++) {
//             const t = baseMs + i * periodMs;
//             if (t > fromMs) {
//                 return t - fromMs;
//             }
//         }
//         baseMs += 60_000;
//     }
//     return periodMs;
// }
//
// const DEFAULT_SNAPSHOT_INTERVAL_SEC = 2;

/** True when `hardware_layout` has `"sieg": true` (JSON string or already-parsed object). */
function hardwareLayoutHasSiegEnabled(hardwareLayout: unknown): boolean {
    if (hardwareLayout == null) {
        return false;
    }
    if (typeof hardwareLayout === 'object' && !Array.isArray(hardwareLayout)) {
        return (hardwareLayout as Record<string, unknown>).sieg === true;
    }
    if (typeof hardwareLayout !== 'string') {
        return false;
    }
    const trimmed = hardwareLayout.trim();
    if (!trimmed) {
        return false;
    }
    try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return (parsed as Record<string, unknown>).sieg === true;
        }
    } catch {
        return false;
    }
    return false;
}

function RealTimeStatusConnection({
    currentInstallationId,
    houseAlias,
    isSpruce,
    defaultSiegLoop,
}: {
    currentInstallationId: string | undefined;
    houseAlias: string;
    isSpruce: boolean;
    defaultSiegLoop: boolean;
}) {
    function getSpruceResistiveElements(readings: Record<string, number>) {
        return Object.entries(readings)
            .filter(([channelName]) => channelName.startsWith('elt-') && channelName.endsWith('-pwr'))
            .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .map(([channelName, value]) => ({
                key: channelName,
                label: channelName.replace(/^elt-/, '').replace(/-pwr$/, ''),
                kw: value / 1000,
            }));
    }

    const [targetGNode, setTargetGNode] = useState('');
    const [thermostatNames, setThermostatNames] = useState<string[] | null>(null);
    const [relays, setRelays] = useState<Record<string, RelayInfo>>({});
    const [updateTime, setUpdateTime] = useState<Date | null>(null);
    const [latestReadings, setLatestReadings] = useState<Record<string, number> | null>(null);
    const [control, setControl] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    // [auto-snapshot]
    // const [snapshotIntervalSec, setSnapshotIntervalSec] = useState<number | ''>(DEFAULT_SNAPSHOT_INTERVAL_SEC);
    // const [autoSnapshotEnabled, setAutoSnapshotEnabled] = useState(false);
    /** Sieg loop is driven only by `hardware_layout` (no UI toggle). */
    const siegLoopEnabled = defaultSiegLoop;

    /** Kept (although currently only written) so the [auto-snapshot] code can be restored. */
    const wsRef = useRef<WebSocket | null>(null);
    const hasLoggedSpruceChannelsRef = useRef(false);
    const diagramReadings = latestReadings ?? {};
    const shouldShowLoadingSpinner = isConnected && !latestReadings;

    useEffect(() => {
        if (!currentInstallationId || !houseAlias) {
            return;
        }

        const wsUrl = getDashboardWebSocketUrl(houseAlias);
        const websocket = new WebSocket(wsUrl);
        wsRef.current = websocket;

        websocket.onopen = () => {
            setErr(null);
            setIsConnected(true);
        };

        websocket.onclose = () => {
            setIsConnected(false);
            if (wsRef.current === websocket) {
                wsRef.current = null;
            }
        };

        websocket.onerror = () => {
            setErr('connection failed');
            setIsConnected(false);
        };

        websocket.onmessage = (event) => {
            setErr(null);

            if (LOG_RAW_DASHBOARD_WS_INBOUND) {
                console.log(event.data);
            }

            let data: DashboardInbound;
            try {
                data = JSON.parse(event.data) as DashboardInbound;
            } catch {
                return;
            }

            if (data.type === 'status') {
                const s = data as DashboardStatusMessage;
                setTargetGNode(s.target_gnode || '');
                if (s.thermostat_names) {
                    setThermostatNames(s.thermostat_names);
                }
            } else if (data.type === 'mqtt_message') {
                const m = data as DashboardMqttMessage;
                if (m.message_type === 'snapshot.spaceheat' && m.payload && typeof m.payload === 'object') {
                    const snapshot = m.payload as SnapshotPayload;
                    if (isSpruce && !hasLoggedSpruceChannelsRef.current) {
                        hasLoggedSpruceChannelsRef.current = true;
                    }
                    setUpdateTime(new Date(snapshot.SnapshotTimeUnixMs));
                    setControl(controlFromSnapshot(snapshot));
                    setLatestReadings((previous) => {
                        const next = Object.fromEntries(
                            (snapshot.LatestReadingList || []).map((r) => [r.ChannelName, r.Value]),
                        ) as Record<string, number>;
                        if (previous) {
                            for (const [channelName, value] of Object.entries(previous)) {
                                const lowered = channelName.toLowerCase();
                                const isZoneHeatCall =
                                    lowered.includes('zone') && lowered.includes('heat-call');
                                if (isZoneHeatCall && !(channelName in next)) {
                                    next[channelName] = value;
                                }
                            }
                        }
                        setRelays(relayMapFromScadaReadings(next));
                        return next;
                    });
                }
            } else if (data.type === 'error') {
                const e = data as DashboardErrorMessage;
                setErr(e.message || 'Dashboard error');
            }
        };

        return () => {
            websocket.close();
            if (wsRef.current === websocket) {
                wsRef.current = null;
            }
        };
    }, [currentInstallationId, houseAlias]);

    useEffect(() => {
        hasLoggedSpruceChannelsRef.current = false;
    }, [currentInstallationId, houseAlias, isSpruce]);

    // [auto-snapshot]
    // const requestSnapshot = useCallback(() => {
    //     const ws = wsRef.current;
    //     if (!ws || ws.readyState !== WebSocket.OPEN) {
    //         return;
    //     }
    //     ws.send(JSON.stringify({ type: 'request_snapshot', data: {} }));
    // }, []);
    //
    // useEffect(() => {
    //     if (!autoSnapshotEnabled || !isConnected || snapshotIntervalSec === '') {
    //         return;
    //     }
    //     const sec = snapshotIntervalSec;
    //     if (sec < 1 || sec > 30) {
    //         return;
    //     }
    //     let cancelled = false;
    //     /** DOM timers use numeric handles; avoids Node `Timeout` vs `number` mismatch under `tsc -b`. */
    //     let timeoutId: number | undefined;
    //
    //     const scheduleNext = () => {
    //         if (cancelled) {
    //             return;
    //         }
    //         const delay = msUntilNextSnapshotGridTick(Date.now(), sec);
    //         timeoutId = window.setTimeout(() => {
    //             if (cancelled) {
    //                 return;
    //             }
    //             requestSnapshot();
    //             scheduleNext();
    //         }, delay);
    //     };
    //
    //     scheduleNext();
    //     return () => {
    //         cancelled = true;
    //         if (timeoutId !== undefined) {
    //             window.clearTimeout(timeoutId);
    //         }
    //     };
    // }, [autoSnapshotEnabled, isConnected, snapshotIntervalSec, requestSnapshot]);
    //
    // useEffect(() => {
    //     if (autoSnapshotEnabled && snapshotIntervalSec === '') {
    //         setSnapshotIntervalSec(DEFAULT_SNAPSHOT_INTERVAL_SEC);
    //     }
    // }, [autoSnapshotEnabled, snapshotIntervalSec]);
    //
    // useEffect(() => {
    //     const disableAutoSnapshot = () => {
    //         setAutoSnapshotEnabled(false);
    //     };
    //     const onVisibilityChange = () => {
    //         if (document.visibilityState === 'hidden') {
    //             disableAutoSnapshot();
    //         }
    //     };
    //     // `visibilitychange` covers switching tabs / minimizing; it does not fire when another
    //     // browser window is focused on top while this tab stays "visible" in the background window.
    //     document.addEventListener('visibilitychange', onVisibilityChange);
    //     window.addEventListener('blur', disableAutoSnapshot);
    //     return () => {
    //         document.removeEventListener('visibilitychange', onVisibilityChange);
    //         window.removeEventListener('blur', disableAutoSnapshot);
    //     };
    // }, []);

    return (
        <div className="card visualizer-card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Real-time</h5>
                {/* [auto-snapshot] controls — see note at top of file
                <div className="d-flex align-items-center gap-2">
                    <input
                        type="checkbox"
                        className="form-check-input m-0 flex-shrink-0"
                        id="realtime-auto-snapshot"
                        checked={autoSnapshotEnabled}
                        onChange={(e) => {
                            const next = e.target.checked;
                            setAutoSnapshotEnabled(next);
                            if (next && snapshotIntervalSec === '') {
                                setSnapshotIntervalSec(DEFAULT_SNAPSHOT_INTERVAL_SEC);
                            }
                        }}
                        disabled={!isConnected}
                        title="When checked, request snapshots automatically on the interval grid. Unchecks when this tab is hidden, or when this browser window loses focus (e.g. another window or tab is on top)."
                        aria-label="Automatically request snapshots on an interval; turns off when the page is hidden or the window loses focus"
                    />
                    <div className="d-flex align-items-center gap-1 flex-shrink-0">
                        <span className="small text-muted mb-0 text-nowrap">Every</span>
                        <input
                            id="realtime-snapshot-interval"
                            type="number"
                            className="form-control form-control-sm"
                            style={{ width: '4.25rem' }}
                            min={1}
                            max={30}
                            step={1}
                            value={snapshotIntervalSec === '' ? '' : snapshotIntervalSec}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                    if (autoSnapshotEnabled) {
                                        setSnapshotIntervalSec(DEFAULT_SNAPSHOT_INTERVAL_SEC);
                                    } else {
                                        setSnapshotIntervalSec('');
                                    }
                                    return;
                                }
                                const n = Number.parseInt(raw, 10);
                                if (Number.isNaN(n)) {
                                    return;
                                }
                                setSnapshotIntervalSec(Math.min(30, Math.max(1, n)));
                            }}
                            onBlur={() => {
                                setSnapshotIntervalSec((prev) => {
                                    if (prev === '') {
                                        return autoSnapshotEnabled ? DEFAULT_SNAPSHOT_INTERVAL_SEC : '';
                                    }
                                    return Math.min(30, Math.max(1, prev));
                                });
                            }}
                            title="Snapshots on minute grid at 0, N, 2N, … seconds while i·N≤60 (1–30). With auto snapshots on, the step defaults to 2 if empty."
                            aria-label="Snapshot step in seconds on the minute grid, 1 to 30; with auto snapshots enabled, empty becomes 2"
                            disabled={!isConnected}
                        />
                        <span className="small text-muted mb-0 text-nowrap">seconds</span>
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        title="Request snapshot"
                        aria-label="Request snapshot"
                        disabled={!isConnected}
                        onClick={requestSnapshot}
                    >
                        Snapshot
                    </button>
                </div>
                */}
            </div>
            <div className="p-4">
                <div className="mb-4">
                    <label className="form-label">Selected House</label>
                    <div className="selected-house-picker">
                        <InstallationPicker />
                    </div>
                </div>
                <RealTimeStatusHeader
                    err={err}
                    isConnected={isConnected}
                    targetGNode={targetGNode}
                    control={control}
                />
                {updateTime &&
                    <RealTimeStatusTimestamp
                        updateTime={updateTime}
                        // [auto-snapshot]
                        // autoSnapshotEnabled={autoSnapshotEnabled}
                        // snapshotStepSeconds={typeof snapshotIntervalSec === 'number' ? snapshotIntervalSec : DEFAULT_SNAPSHOT_INTERVAL_SEC}
                    />
                }
                <RealTimeStatusSystemDiagram
                    relays={relays}
                    readings={diagramReadings}
                    isSpruce={isSpruce}
                    siegLoop={siegLoopEnabled}
                />
                {latestReadings ?
                    <>
                        <div id="dashboard-monitoring-tables">
                            <RealTimeStatusThermostatTable thermostatNames={thermostatNames} readings={latestReadings} isSpruce={isSpruce} />

                            <div>
                                <table id="dashboard-hp-power-table">
                                    <thead>
                                        <tr>
                                            <th>Heat pump</th>
                                            <th>kW</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dashboard-hp-power-tbody">
                                        <tr>
                                            <td>Outdoor Unit</td>
                                            <td>{((latestReadings['hp-odu-pwr'] ?? 0) / 1000).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td>Indoor Unit</td>
                                            <td>{((latestReadings['hp-idu-pwr'] ?? 0) / 1000).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td>Total</td>
                                            <td>{(((latestReadings['hp-idu-pwr'] ?? 0) + (latestReadings['hp-odu-pwr'] ?? 0)) / 1000).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {isSpruce && (
                                <div>
                                    <table id="dashboard-resistive-table">
                                        <thead>
                                            <tr>
                                                <th>Resistive element</th>
                                                <th>kW</th>
                                            </tr>
                                        </thead>
                                        <tbody id="dashboard-resistive-tbody">
                                            {getSpruceResistiveElements(latestReadings).map((element) => (
                                                <tr key={element.key}>
                                                    <td>{element.label}</td>
                                                    <td>{element.kw.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div>
                                <table id="dashboard-pump-table">
                                    <thead>
                                        <tr>
                                            <th>Pumps</th>
                                            <th>GPM</th>
                                            <th>W</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dashboard-pump-tbody">
                                        <tr>
                                            <td>Primary</td>
                                            <td>{((latestReadings['primary-flow'] ?? 0) / 100).toFixed(1)}</td>
                                            <td>{Math.max(0, (latestReadings['primary-pump-pwr'] ?? 0)).toFixed(1)}</td>
                                        </tr>
                                        <tr>
                                            <td>Distribution</td>
                                            <td>{((latestReadings['dist-flow'] ?? 0) / 100).toFixed(1)}</td>
                                            <td>{Math.max(0, (latestReadings['dist-pump-pwr'] ?? 0)).toFixed(1)}</td>
                                        </tr>
                                        <tr>
                                            <td>Store</td>
                                            <td>{((latestReadings['store-flow'] ?? 0) / 100).toFixed(1)}</td>
                                            <td>{Math.max(0, (latestReadings['store-pump-pwr'] ?? 0)).toFixed(1)}</td>
                                        </tr>
                                        {siegLoopEnabled &&
                                            <tr>
                                                <td>Sieg Loop</td>
                                                <td>{((latestReadings['sieg-flow'] ?? 0) / 100).toFixed(1)}</td>
                                                <td>-</td>
                                            </tr>
                                        }
                                        {siegLoopEnabled &&
                                            <tr>
                                                <td>Sieg Send</td>
                                                <td>{((latestReadings['sieg-send'] ?? 0) / 100).toFixed(1)}</td>
                                                <td>-</td>
                                            </tr>
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </> :
                    shouldShowLoadingSpinner ?
                        <div className="p-3 text-center">
                            <Spinner />
                        </div> :
                        null
                }
            </div>
        </div>
    );
}

export default function RealTimeStatusPage() {
    const { currentInstallationId } = useRouteInfo();
    const session = useContext(SessionContext);
    const installation = installationForRouteId(session?.installations, currentInstallationId);
    const houseAlias = (installation?.houseAlias?.trim() || '').trim();
    const isSpruce = houseAlias.toLowerCase().includes('spruce');

    const installationUnknown =
        !!currentInstallationId && !!session && !installation;
    const houseAliasMissing =
        !!currentInstallationId && !!installation && !houseAlias;
    const showConnectedContent = Boolean(currentInstallationId && houseAlias);
    const realTimeNotPermittedForAlias =
        showConnectedContent && !hasRealTimeAccessForInstallationAlias(houseAlias);

    const defaultSiegLoop = hardwareLayoutHasSiegEnabled(installation?.hardwareLayout);

    if (!showConnectedContent) {
        return (
            <div className="card visualizer-card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Real-time</h5>
                    {/* [auto-snapshot] disabled placeholder controls
                    <div className="d-flex align-items-center gap-2">
                        <input
                            type="checkbox"
                            className="form-check-input m-0 flex-shrink-0"
                            disabled
                            aria-hidden
                            tabIndex={-1}
                        />
                        <div className="d-flex align-items-center gap-1 flex-shrink-0">
                            <span className="small text-muted mb-0 text-nowrap">Every</span>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                style={{ width: '4.25rem' }}
                                disabled
                                aria-hidden
                                tabIndex={-1}
                            />
                            <span className="small text-muted mb-0 text-nowrap">seconds</span>
                        </div>
                    </div>
                    */}
                </div>
                <div className="p-4">
                    <div className="mb-4">
                        <label className="form-label">Selected House</label>
                        <div className="selected-house-picker">
                            <InstallationPicker />
                        </div>
                    </div>
                    {installationUnknown &&
                        <p className="text-danger mb-0">This installation is not in your current session.</p>
                    }
                    {houseAliasMissing &&
                        <p className="text-danger mb-0">Real-time needs a short house alias for this installation (the Alias column from the installations table / backoffice homes list).</p>
                    }
                </div>
            </div>
        );
    }

    if (realTimeNotPermittedForAlias) {
        return (
            <div className="card visualizer-card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Real-time</h5>
                    {/* [auto-snapshot] disabled placeholder controls
                    <div className="d-flex align-items-center gap-2">
                        <input
                            type="checkbox"
                            className="form-check-input m-0 flex-shrink-0"
                            disabled
                            aria-hidden
                            tabIndex={-1}
                        />
                        <div className="d-flex align-items-center gap-1 flex-shrink-0">
                            <span className="small text-muted mb-0 text-nowrap">Every</span>
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                style={{ width: '4.25rem' }}
                                disabled
                                aria-hidden
                                tabIndex={-1}
                            />
                            <span className="small text-muted mb-0 text-nowrap">seconds</span>
                        </div>
                    </div>
                    */}
                </div>
                <div className="p-4">
                    <div className="mb-4">
                        <label className="form-label">Selected House</label>
                        <div className="selected-house-picker">
                            <InstallationPicker />
                        </div>
                    </div>
                    <p className="text-danger mb-0">
                        Real-time status is not available for this installation with your current access (viewer-only houses do not include live dashboard).
                    </p>
                </div>
            </div>
        );
    }

    return (
        <RealTimeStatusConnection
            key={`${currentInstallationId}:${houseAlias}`}
            currentInstallationId={currentInstallationId}
            houseAlias={houseAlias}
            isSpruce={isSpruce}
            defaultSiegLoop={defaultSiegLoop}
        />
    );
}
