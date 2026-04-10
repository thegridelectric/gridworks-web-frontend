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

interface RelayInfo {
    name: string;
    channel_name: string;
    display_name: string;
    state: string;
    last_update: number;
}

interface Reading {
    ChannelName: string;
    Value: number;
}

interface SnapshotPayload {
    SnapshotTimeUnixMs: number;
    LatestReadingList: Reading[];
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

type DashboardInbound =
    | DashboardStatusMessage
    | DashboardMqttMessage
    | DashboardErrorMessage
    | { type: string };

function RealTimeStatusConnection({
    currentInstallationId,
    houseAlias,
    isSpruce,
}: {
    currentInstallationId: string | undefined;
    houseAlias: string;
    isSpruce: boolean;
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
    const [isConnected, setIsConnected] = useState(false);
    const [err, setErr] = useState<string | null>(null);

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
                if (s.relays) {
                    setRelays(s.relays);
                }
            } else if (data.type === 'mqtt_message') {
                const m = data as DashboardMqttMessage;
                if (m.message_type === 'single.reading' && m.payload && typeof m.payload === 'object') {
                    const p = m.payload as { relay_name?: string; state?: string };
                    const relayName = p.relay_name;
                    const state = p.state;
                    if (relayName && state) {
                        setRelays((prev) => ({
                            ...prev,
                            [relayName]: {
                                ...prev[relayName],
                                state,
                            },
                        }));
                    }
                } else if (m.message_type === 'snapshot.spaceheat' && m.payload && typeof m.payload === 'object') {
                    const snapshot = m.payload as SnapshotPayload;
                    if (isSpruce && !hasLoggedSpruceChannelsRef.current) {
                        hasLoggedSpruceChannelsRef.current = true;
                        console.log(
                            '[spruce] first snapshot.spaceheat channels',
                            (snapshot.LatestReadingList || []).map((r) => r.ChannelName),
                        );
                    }
                    setUpdateTime(new Date(snapshot.SnapshotTimeUnixMs));
                    setLatestReadings((previous) => {
                        const next = Object.fromEntries(
                            (snapshot.LatestReadingList || []).map((r) => [r.ChannelName, r.Value]),
                        ) as Record<string, number>;
                        if (!previous) {
                            return next;
                        }
                        for (const [channelName, value] of Object.entries(previous)) {
                            const lowered = channelName.toLowerCase();
                            const isZoneHeatCall =
                                lowered.includes('zone') && lowered.includes('heat-call');
                            if (isZoneHeatCall && !(channelName in next)) {
                                next[channelName] = value;
                            }
                        }
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

    function requestSnapshot() {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return;
        }
        ws.send(JSON.stringify({ type: 'request_snapshot', data: {} }));
    }

    return (
        <div className="card visualizer-card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Real-time</h5>
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
            <div className="p-4">
                <div className="mb-4">
                    <label className="form-label">Selected House</label>
                    <div className="selected-house-picker">
                        <InstallationPicker />
                    </div>
                </div>
                <RealTimeStatusHeader err={err} isConnected={isConnected} targetGNode={targetGNode} />
                {updateTime &&
                    <RealTimeStatusTimestamp updateTime={updateTime} />
                }
                <RealTimeStatusSystemDiagram relays={relays} readings={diagramReadings} isSpruce={isSpruce} />
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

    if (!showConnectedContent) {
        return (
            <div className="card visualizer-card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Real-time</h5>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        title="Request snapshot"
                        aria-label="Request snapshot"
                        disabled
                    >
                        Snapshot
                    </button>
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
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        title="Request snapshot"
                        aria-label="Request snapshot"
                        disabled
                    >
                        Snapshot
                    </button>
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
        />
    );
}
