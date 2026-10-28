/** The one table from a channel's declared unit to its display value and
 *  hover format. Keys are values of `spaceheat.telemetry.name` (a data
 *  channel's TelemetryName) and `gw1.unit` (a derived channel's
 *  OutputUnit). A unit with no row is shown as the raw integer. */
import type { Gw1Unit } from './enums/Gw1Unit';
import type { SpaceheatTelemetryName } from './enums/SpaceheatTelemetryName';

export type ChannelUnitValue = SpaceheatTelemetryName | Gw1Unit;
export type ConverterFunction = (x: number) => number;

export const C2F: ConverterFunction = (c) => (9 * c) / 5 + 32;

export const UNIT_CONVERSIONS: Partial<Record<ChannelUnitValue, ConverterFunction>> = {
    FahrenheitX100: (x) => x * 0.01,
    FahrenheitX10: (x) => x * 0.1,
    WaterTempCTimes1000: (x) => C2F(x * 0.001),
    WaterTempFTimes1000: (x) => x * 0.001,
    AirTempCTimes1000: (x) => C2F(x * 0.001),
    AirTempFTimes1000: (x) => x * 0.001,
    CelsiusTimes100: (x) => C2F(x * 0.01),
    PowerW: (x) => x * 0.001,
    Watts: (x) => x * 0.001,
    GpmTimes100: (x) => x * 0.01,
    GpmX100: (x) => x * 0.01,
    WattHours: (x) => x * 0.001,
    MilliWattHours: (x) => x * 0.000001,
    KilowattHoursX1000: (x) => x * 0.001,
};

export const UNIT_HOVER_FORMATS: Partial<Record<ChannelUnitValue, string>> = {
    FahrenheitX100: '%{y:.1f}°F',
    FahrenheitX10: '%{y:.1f}°F',
    WaterTempCTimes1000: '%{y:.1f}°F',
    WaterTempFTimes1000: '%{y:.1f}°F',
    AirTempCTimes1000: '%{y:.1f}°F',
    AirTempFTimes1000: '%{y:.1f}°F',
    CelsiusTimes100: '%{y:.1f}°F',
    PowerW: '%{y:.1f} kW',
    Watts: '%{y:.1f} kW',
    GpmTimes100: '%{y:.1f} GPM',
    GpmX100: '%{y:.1f} GPM',
    WattHours: '%{y:.1f} kWh',
    MilliWattHours: '%{y:.1f} kWh',
    KilowattHoursX1000: '%{y:.1f} kWh',
};

function conversionFor(unit: string): ConverterFunction | undefined {
    return UNIT_CONVERSIONS[unit as ChannelUnitValue];
}

/** The display value of a raw reading in `unit`, or undefined when the
 *  table has no row for the unit. */
export function toDisplayValue(unit: string, raw: number): number | undefined {
    const convert = conversionFor(unit);
    return convert === undefined ? undefined : convert(raw);
}

export function getValueConverter(unit: string, scale: number): ConverterFunction {
    const convert = conversionFor(unit) ?? ((x) => x);
    return (x) => (typeof x === 'number' ? convert(x) * scale : x);
}

export function getHoverTemplate(unit: string, scale?: number | null): string {
    let yFormat = UNIT_HOVER_FORMATS[unit as ChannelUnitValue] ?? '%{y}';
    if (scale) {
        yFormat += `/${scale}`;
    }
    return `%{x|%H:%M:%S} | ${yFormat}<extra></extra>`;
}
