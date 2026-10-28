import { describe, expect, it } from 'vitest';
import beech011 from './fixtures/beech-layout.lite-011.json';
import elm013 from './fixtures/elm-layout.lite-013.json';
import { channelUnit } from '../layoutUnits';
import { AnyLayoutLite } from '../types/AnyLayoutLite';

describe('the layout unit resolver', () => {
    const elm = AnyLayoutLite.parse(elm013);
    const beech = AnyLayoutLite.parse(beech011);

    it('resolves a data channel to its TelemetryName', () => {
        expect(channelUnit(elm, 'hp-ewt')).toEqual({ kind: 'telemetry', unit: 'CelsiusTimes100' });
        expect(channelUnit(elm, 'zone1-living-kitchen-temp')).toEqual({ kind: 'telemetry', unit: 'CelsiusTimes100' });
    });

    it('resolves a derived channel to its OutputUnit', () => {
        expect(channelUnit(elm, 'tank1-depth1')).toEqual({ kind: 'derived', unit: 'FahrenheitX100' });
    });

    it('resolves a 011 house to the units that layout declares', () => {
        expect(channelUnit(beech, 'hp-ewt')).toEqual({ kind: 'telemetry', unit: 'WaterTempCTimes1000' });
    });

    it('returns undefined for a name the layout does not declare', () => {
        expect(channelUnit(elm, 'floor-swt')).toBeUndefined();
    });
});
