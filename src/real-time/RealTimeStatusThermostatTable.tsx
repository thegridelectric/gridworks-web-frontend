import type { ReactNode } from "react";
import type { DisplayReading, DisplayReadings } from "../sema/displayReadings";
import { formatReading } from "../sema/displayReadings";

interface RealTimeStatusThermostatTableProps {
    thermostatNames: string[] | null,
    readings: DisplayReadings,
    isSpruce: boolean,
}

export default function RealTimeStatusThermostatTable({ thermostatNames, readings, isSpruce }: RealTimeStatusThermostatTableProps) {
    if (isSpruce) {
        function formatState(value: number | undefined): string {
            if (value === undefined) {
                return '-';
            }
            if (value === 0) {
                return 'idle';
            }
            if (value === 1) {
                return 'heating';
            }
            return String(value);
        }

        const channelNames = Object.keys(readings);
        const spruceZoneRows = new Map<string, { zoneLabel?: string; temperature?: DisplayReading; state?: number }>();
        for (const channelName of channelNames) {
            const lowered = channelName.toLowerCase();
            const zoneMatch = lowered.match(/^(zone[1-9]\d*)/);
            if (!zoneMatch) {
                continue;
            }
            const zoneKey = zoneMatch[1];
            const existing = spruceZoneRows.get(zoneKey) ?? {};
            if (lowered.includes('gw-temp')) {
                existing.zoneLabel = channelName.replace(/-gw-temp$/i, '');
                existing.temperature = readings[channelName];
            }
            if (lowered.includes('heat-call')) {
                existing.state = readings[channelName].raw;
            }
            spruceZoneRows.set(zoneKey, existing);
        }
        const rows = Array.from(spruceZoneRows.entries())
            .filter(([, row]) => row.temperature !== undefined || row.state !== undefined)
            .sort((a, b) => {
                const aIndex = Number(a[0].replace('zone', ''));
                const bIndex = Number(b[0].replace('zone', ''));
                return aIndex - bIndex;
            });

        return (
            <div>
                <table className="dashboard-zone-table">
                    <thead>
                        <tr>
                            <th>Zone</th>
                            <th>Temperature</th>
                            <th>State</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="p-2 text-center">
                                    No zone gw-temp or heat-call channels.
                                </td>
                            </tr>
                        ) : (
                            rows.map(([zoneKey, row]) => (
                                <tr key={zoneKey}>
                                    <td>{row.zoneLabel ?? zoneKey}</td>
                                    <td>{formatReading(row.temperature, 1, '°F')}</td>
                                    <td>{formatState(row.state)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        );
    }

    const derivedThermostatNames = Object.keys(readings)
        .map((key) => key.match(/^zone\d+-(.+)-(temp|set|state)$/))
        .filter((match): match is RegExpMatchArray => Boolean(match))
        .map((match) => match[1])
        .filter((name, index, arr) => arr.indexOf(name) === index);

    const resolvedThermostatNames = (
        thermostatNames && thermostatNames.length > 0
            ? thermostatNames
            : derivedThermostatNames
    ).filter((name) => !name.endsWith('-gw'));

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
            
            const state = (stateReading?.raw ?? 0) > 0 ? 'heating' : 'idle';

            return <tr key={zone.key}>
                <td>{zone.display}</td>
                <td>{formatReading(setPointReading, 1, '°F')}</td>
                <td>{formatReading(tempReading, 1, '°F')}</td>
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
