import { describe, expect, it } from 'vitest';
import { Unit } from '../enums/Unit';
import { SpaceheatTelemetryName } from '../enums/SpaceheatTelemetryName';

describe('spaceheat.telemetry.name 007', () => {
    it('accepts the temperature units the fleet declares', () => {
        for (const value of ['CelsiusTimes100', 'WaterTempCTimes1000', 'AirTempFTimes1000']) {
            expect(SpaceheatTelemetryName.parse(value)).toBe(value);
        }
    });

    it('decodes a value outside the enum to the default, and rejects a non-string', () => {
        expect(SpaceheatTelemetryName.parse('CelsiusX100')).toBe('Unknown');
        expect(SpaceheatTelemetryName.parse('celsiustimes100')).toBe('Unknown');
        expect(SpaceheatTelemetryName.safeParse(7).success).toBe(false);
    });
});

describe('gw1.unit 003', () => {
    it('accepts the derived-channel units', () => {
        expect(Unit.parse('FahrenheitX100')).toBe('FahrenheitX100');
        expect(Unit.parse('GpmX100')).toBe('GpmX100');
    });

    it('decodes a telemetry-name spelling of the same quantity to Unknown', () => {
        expect(Unit.parse('GpmTimes100')).toBe('Unknown');
    });
});
