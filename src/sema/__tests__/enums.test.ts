import { describe, expect, it } from 'vitest';
import { Gw1Unit } from '../enums/Gw1Unit';
import { SpaceheatTelemetryName } from '../enums/SpaceheatTelemetryName';

describe('spaceheat.telemetry.name 007', () => {
    it('accepts the temperature units the fleet declares', () => {
        for (const value of ['CelsiusTimes100', 'WaterTempCTimes1000', 'AirTempFTimes1000']) {
            expect(SpaceheatTelemetryName.parse(value)).toBe(value);
        }
    });

    it('rejects a value outside the enum', () => {
        expect(SpaceheatTelemetryName.safeParse('CelsiusX100').success).toBe(false);
        expect(SpaceheatTelemetryName.safeParse('celsiustimes100').success).toBe(false);
    });
});

describe('gw1.unit 003', () => {
    it('accepts the derived-channel units', () => {
        expect(Gw1Unit.parse('FahrenheitX100')).toBe('FahrenheitX100');
        expect(Gw1Unit.parse('GpmX100')).toBe('GpmX100');
    });

    it('rejects a telemetry-name spelling of the same quantity', () => {
        expect(Gw1Unit.safeParse('GpmTimes100').success).toBe(false);
    });
});
