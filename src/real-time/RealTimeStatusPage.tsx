import { useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

import './RealTimeStatusPage.css';
import RealTimeStatusHeader from "./RealTimeStatusHeader";
import RealTimeStatusTimestamp from "./RealTimeStatusTimestamp";
import RealTimeStatusThermostatTable from "./RealTimeStatusThermostatTable";
import { Spinner } from "react-bootstrap";
import RealTimeStatusSystemDiagram from "./RealTimeStatusSystemDiagram";
import InstallationPicker from "../_shared/InstallationPicker";
import { parsePathname } from "../_util/urlUtility";
import SessionContext, { installationForRouteId } from "../_util/SessionContext";
import { getDashboardWebSocketUrl } from "../visualizer/fetchVisualizerPlots";

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

export default function RealTimeStatusPage() {

    const [targetGNode, setTargetGNode] = useState('');
    const [thermostatNames, setThermostatNames] = useState<string[] | null>(null);
    const [relays, setRelays] = useState<Record<string, RelayInfo>>({});
    const [updateTime, setUpdateTime] = useState<Date | null>(null);
    const [latestReadings, setLatestReadings] = useState<Record<string, number> | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);

    const location = useLocation();
    const { currentInstallationId } = parsePathname(location.pathname);
    const session = useContext(SessionContext);

    const installation = installationForRouteId(session?.installations, currentInstallationId);
    const houseAlias = (installation?.houseAlias?.trim() || '').trim();

    useEffect(() => {
        setTargetGNode('');
        setThermostatNames(null);
        setRelays({});
        setUpdateTime(null);
        setLatestReadings(null);
        setIsConnected(false);
        setErr(null);

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
                    setUpdateTime(new Date(snapshot.SnapshotTimeUnixMs));
                    setLatestReadings(
                        Object.fromEntries(
                            (snapshot.LatestReadingList || []).map((r) => [r.ChannelName, r.Value]),
                        ),
                    );
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

    function requestSnapshot() {
        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            return;
        }
        ws.send(JSON.stringify({ type: 'request_snapshot', data: {} }));
    }

    const installationUnknown =
        !!currentInstallationId && !!session && !installation;
    const houseAliasMissing =
        !!currentInstallationId && !!installation && !houseAlias;

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

                {!currentInstallationId &&
                    <p className="text-muted mb-0">Select an installation to connect.</p>
                }
                {installationUnknown &&
                    <p className="text-danger mb-0">This installation is not in your current session.</p>
                }
                {houseAliasMissing &&
                    <p className="text-danger mb-0">Real-time needs a short house alias for this installation (the Alias column from the installations table / backoffice homes list).</p>
                }

                {currentInstallationId && houseAlias &&
                    <>
                        <RealTimeStatusHeader err={err} isConnected={isConnected} targetGNode={targetGNode} />
                        {updateTime &&
                            <RealTimeStatusTimestamp updateTime={updateTime} />
                        }
                        {latestReadings ?
                            <>
                                <RealTimeStatusSystemDiagram relays={relays} readings={latestReadings} />

                                <div id="dashboard-monitoring-tables">
                                    <RealTimeStatusThermostatTable thermostatNames={thermostatNames} readings={latestReadings} />

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
                            <div className="p-3 text-center">
                                <Spinner />
                            </div>
                        }
                    </>
                }
            </div>
        </div>
    );
}
