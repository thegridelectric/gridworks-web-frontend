import type { ReactNode } from "react";

interface RealTimeStatusThermostatTableProps {
    thermostatNames: string[] | null,
    readings: Record<string, number>
}

export default function RealTimeStatusThermostatTable({ thermostatNames, readings }: RealTimeStatusThermostatTableProps) {

    let zoneElements : ReactNode;
    if (!thermostatNames || !thermostatNames.length) {
        zoneElements = <tr>
            <td colSpan={4} className="p-2 text-center">
                Loading thermostat names...
            </td>
        </tr>
    } else {
        const zones = thermostatNames.map((name, index) => ({
            key: `zone${index + 1}-${name}`,
            display: `zone${index + 1}-${name}`
        }));

        zoneElements = zones.map(zone => {
            const tempReading = readings[`${zone.key}-temp`];
            const setPointReading = readings[`${zone.key}-set`];
            const stateReading = readings[`${zone.key}-state`];
            
            const tempF = tempReading ? (tempReading / 1000).toFixed(1) : '-';
            const setPointF = setPointReading ? (setPointReading / 1000).toFixed(1) : '-';
            const state = stateReading ? (stateReading > 0 ? 'heating' : 'idle') : 'idle';
            
            return <tr key={zone.key}>
                <td>{zone.display}</td>
                <td>{setPointF}°F</td>
                <td>{tempF}°F</td>
                <td>{state}</td>
            </tr>
        });

    }

    return <div>
        <table id="dashboard-thermostat-table">
            <thead>
                <tr>
                    <th>Thermostats</th>
                    <th>Setpoint</th>
                    <th>Temperature</th>
                    <th>State</th>
                </tr>
            </thead>
            <tbody id="dashboard-thermostat-tbody">
                {zoneElements}
            </tbody>
        </table>
    </div>

}