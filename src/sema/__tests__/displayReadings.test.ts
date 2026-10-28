import { describe, expect, it } from 'vitest';
import beech011 from './fixtures/beech-layout.lite-011.json';
import elm013 from './fixtures/elm-layout.lite-013.json';
import { displayReadings, formatReading, RAW_MARKER } from '../displayReadings';
import { hasPrimaryLoopFlow, layoutHasSecondaryLoop, layoutHasSiegLoop } from '../plantLoops';
import { AnyLayoutLite } from '../types/AnyLayoutLite';

const elm = AnyLayoutLite.parse(elm013);
const beech = AnyLayoutLite.parse(beech011);

describe('display readings through the layout', () => {
    it('converts each reading through the unit its layout declares', () => {
        const shown = displayReadings(elm, { 'hp-ewt': 2998, 'tank1-depth1': 10441, 'primary-flow': 312, 'hp-odu-pwr': 2500 });
        expect(formatReading(shown['hp-ewt'], 1, '°F')).toBe('86.0°F');
        expect(formatReading(shown['tank1-depth1'], 1, '°F')).toBe('104.4°F');
        expect(formatReading(shown['primary-flow'], 1)).toBe('3.1');
        expect(formatReading(shown['hp-odu-pwr'], 2)).toBe('2.50');
    });

    it('converts a 011 house through its own units', () => {
        const shown = displayReadings(beech, { 'hp-ewt': 29980, 'zone1-down-temp': 68500 });
        expect(formatReading(shown['hp-ewt'], 1)).toBe('86.0');
        expect(formatReading(shown['zone1-down-temp'], 1)).toBe('68.5');
    });

    it('keeps the raw value, marked, for a channel the layout does not declare', () => {
        const shown = displayReadings(elm, { 'floor-swt': 12345 });
        expect(shown['floor-swt']).toEqual({ raw: 12345 });
        expect(formatReading(shown['floor-swt'], 1, '°F')).toBe(`12345${RAW_MARKER}`);
    });

    it('keeps the raw value, marked, for a declared unit outside the table', () => {
        const shown = displayReadings(elm, { 'zone1-living-kitchen-ops-relay': 1 });
        expect(shown['zone1-living-kitchen-ops-relay']).toEqual({ raw: 1, unit: 'RelayState', display: undefined });
        expect(formatReading(shown['zone1-living-kitchen-ops-relay'], 0)).toBe(`1${RAW_MARKER}`);
    });

    it('marks everything raw when the page has no layout', () => {
        expect(displayReadings(undefined, { 'hp-ewt': 2998 })).toEqual({ 'hp-ewt': { raw: 2998 } });
    });

    it('shows a dash for a channel with no reading', () => {
        expect(formatReading(undefined, 1)).toBe('-');
    });
});

describe('the plant loops', () => {
    it('reads the secondary loop from a secondary-flow data channel', () => {
        expect(layoutHasSecondaryLoop(elm)).toBe(true);
        expect(layoutHasSecondaryLoop(beech)).toBe(false);
    });

    it('reads the sieg loop from a sieg-flow data channel', () => {
        expect(layoutHasSiegLoop(beech)).toBe(true);
        expect(layoutHasSiegLoop(elm)).toBe(false);
    });

    it('decides primary loop flow in GPM', () => {
        const siegSend = AnyLayoutLite.parse({ ...beech011, DataChannels: [...beech011.DataChannels, { ...beech011.DataChannels[0], Name: 'sieg-send', TelemetryName: 'GpmTimes100' }] });
        expect(hasPrimaryLoopFlow(displayReadings(siegSend, { 'sieg-send': 49 }), true)).toBe(false);
        expect(hasPrimaryLoopFlow(displayReadings(siegSend, { 'sieg-send': 50 }), true)).toBe(true);
        expect(hasPrimaryLoopFlow(displayReadings(elm, { 'primary-flow': 1 }), false)).toBe(true);
        expect(hasPrimaryLoopFlow(displayReadings(elm, { 'primary-flow': 0 }), false)).toBe(false);
    });
});
