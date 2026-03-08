import { useEffect, useState } from "react";
import { data, useParams } from "react-router";

import GridworksApi from '../_util/GridWorksApi';
import SidebarNavLayout from "../_layout/SidebarNavLayout";

import './RealTimeStatusPage.css';
import RealTimeStatusHeader from "./RealTimeStatusHeader";
import RealTimeStatusTimestamp from "./RealTimeStatusTimestamp";
import RealTimeStatusThermostatTable from "./RealTimeStatusThermostatTable";
import { Spinner } from "react-bootstrap";
import RealTimeStatusSystemDiagram from "./RealTimeStatusSystemDiagram";

interface RelayInfo {
    name: string,
    channel_name: string,
    display_name: string,
    state: string,
    last_update: number,
}

interface Reading {
    ChannelName: string,
    Value: number,
}

interface Snapshot {
    SnapshotTimeUnixMs: number,
    LatestReadingList: Reading[]
}

export default function SnapshotPage() {

    // const { homeId } = useParams();
    const homeId = 'a';

    const [targetGNode, setTargetGNode] = useState('');
    const [thermostatNames, setThermostatNames] = useState(null);
    const [relays, setRelays] = useState<Record<string, RelayInfo>>({});
    const [updateTime, setUpdateTime] = useState<Date>();
    const [latestReadings, setLatestReadings] = useState<Record<string, number>>();
    const [isConnected, setIsConnected] = useState(false);
    const [err, setErr] = useState(null);
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        const websocket = new WebSocket('ws://localhost:5173/ws/snapshot');
        setWs(websocket);

        websocket.onopen = () => {
            console.log('Connected to WebSocket server');
            setErr(null);
            setIsConnected(true);
        };
        websocket.onclose = () => {
            console.log('Disconnected from WebSocket server');
            setErr(null);
        };
        websocket.onerror = (error) => {
            console.error('Dashboard WebSocket error:', error);
            console.error('WebSocket readyState:', websocket.readyState);
            console.error('WebSocket URL:', websocket.url);
            if (window.location.hostname.includes('github.io')) {
                console.warn('WebSocket connection failed from GitHub Pages - checking if port 8080 is accessible');
            } else {
                console.warn('WebSocket connection failed locally - check if WebSocket server is running on port 8080');
            }
        };
        websocket.onmessage = (event) => {
            setErr(null);

            const message = JSON.parse(event.data);
            if (message.type === 'status') {
                setTargetGNode(message.target_gnode);
                setThermostatNames(message.thermostat_names);
                setRelays(message.relays);
            } else if (message.type === 'mqtt_message') {
                if (message.message_type === 'single.reading' && message.payload) {
                    const { relay_name, state } = message.payload;
                    if (relay_name && state) {
                        const existingRelayInfo = relays[message.payload.relay_name];
                        const newRelays = {
                            ...relays,
                            relay_name: {
                                ...existingRelayInfo,
                                state
                            }
                        }
                        setRelays(newRelays);
                    }
                } else if (message.message_type === 'snapshot.spaceheat') {
                    const snapshot: Snapshot = message.payload;
                    setUpdateTime(new Date(snapshot.SnapshotTimeUnixMs / 1000));
                    setLatestReadings(Object.fromEntries(snapshot.LatestReadingList.map(r => [r.ChannelName, r.Value])));
                }
            } else if (message.type === 'error') {
                console.error('Dashboard Error: ' + message.message);
            }
        };

        // Cleanup on unmount
        return () => {
            websocket.close();
        };

    }, [homeId]);


    // function updateDashboardMonitoringTables(snapshotData) {
    //     updateDashboardSnapshotTimestamp(snapshotData);
    //     updateDashboardThermostatTable(snapshotData);
    //     updateDashboardPowerPumpTable(snapshotData);
    //     updateTankTemperatures(snapshotData);
    //     updateDashboardPipeColors(snapshotData);
    // }


    return <SidebarNavLayout>
        <h1>Real-Time Status</h1>

        <div className="p-4">
            <RealTimeStatusHeader {...{ isConnected, targetGNode, err }} />
            {updateTime &&
                <RealTimeStatusTimestamp updateTime={updateTime} />
            }
            {latestReadings ?
                <>
                    {/* System Diagram */}
                    <RealTimeStatusSystemDiagram relays={relays} readings={latestReadings} />

                    {/* System Monitoring Tables */}
                    <div id="dashboard-monitoring-tables">
                        <RealTimeStatusThermostatTable thermostatNames={thermostatNames} readings={latestReadings} />

                        {/* HP Power Table */}
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

                        {/* Pump Table */}
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
        </div>


    </SidebarNavLayout>
}