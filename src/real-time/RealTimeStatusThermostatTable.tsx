import type { ReactNode } from "react";

interface RealTimeStatusThermostatTableProps {
    thermostatNames: string[] | null,
    readings: Record<string, number>,
    isSpruce: boolean,
}

export default function RealTimeStatusThermostatTable({ thermostatNames, readings, isSpruce }: RealTimeStatusThermostatTableProps) {
    if (isSpruce) {
        const channelNames = Object.keys(readings);
        const zoneTempChannels = channelNames
            .filter((name) => {
                const lowered = name.toLowerCase();
                return lowered.includes('zone') && lowered.includes('floor-temp');
            })
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
        const zoneHeatcallChannels = channelNames
            .filter((name) => {
                const lowered = name.toLowerCase();
                return lowered.includes('zone') && lowered.includes('heat-call');
            })
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        return (
            <>
                <div>
                    <table className="dashboard-zone-table">
                        <thead>
                            <tr>
                                <th>Zone</th>
                                <th>Temperature</th>
                            </tr>
                        </thead>
                        <tbody>
                            {zoneTempChannels.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="p-2 text-center">
                                        No zone temperature channels.
                                    </td>
                                </tr>
                            ) : (
                                zoneTempChannels.map((channelName) => (
                                    <tr key={channelName}>
                                        <td>{channelName}</td>
                                        <td>{readings[channelName]}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div>
                    <table className="dashboard-zone-table">
                        <thead>
                            <tr>
                                <th>Zone</th>
                                <th>State</th>
                            </tr>
                        </thead>
                        <tbody>
                            {zoneHeatcallChannels.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="p-2 text-center">
                                        No zone heatcall channels.
                                    </td>
                                </tr>
                            ) : (
                                zoneHeatcallChannels.map((channelName) => (
                                    <tr key={channelName}>
                                        <td>{channelName}</td>
                                        <td>{readings[channelName]}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </>
        );
    }

    const derivedThermostatNames = Object.keys(readings)
        .map((key) => key.match(/^zone\d+-(.+)-(temp|set|state)$/))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => match[1])
        .filter((name, index, arr) => arr.indexOf(name) === index);

    const resolvedThermostatNames =
        thermostatNames && thermostatNames.length > 0
            ? thermostatNames
            : derivedThermostatNames;

    let zoneElements : ReactNode;
    if (!resolvedThermostatNames.length) {
        zoneElements = <tr>
            <td colSpan={4} className="p-2 text-center">
                Loading thermostat names...
            </td>
        </tr>
    } else {
        const zones = resolvedThermostatNames.map((name, index) => ({
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
