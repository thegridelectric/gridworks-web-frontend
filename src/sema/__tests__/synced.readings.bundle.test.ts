import { describe, expect, it } from 'vitest';
import { StopgapPriceForecast } from '../types/StopgapPriceForecast';
import { OperatingStateSequence } from '../types/OperatingStateSequence';
import { SyncedReadingsBundle } from '../types/SyncedReadingsBundle';

/** The registry's synced.readings.bundle 003 example. */
const bundle = {
    AboutGNodeAlias: 'dw1.isone.me.versant.keene.apple.ta',
    StartTimestamp: '2025-02-26T00:00:00Z',
    EndTimestamp: '2025-02-26T00:02:00Z',
    TimestampList: ['2025-02-26T00:00:00Z', '2025-02-26T00:01:00Z', '2025-02-26T00:02:00Z'],
    ChannelReadingsList: [
        {
            ChannelName: 'buffer-depth1',
            ValueList: [4973, null, 4979],
            Unit: 'FahrenheitX100',
            UnitType: 'gw1.unit',
            TypeName: 'channel.readings.list.item',
            Version: '000',
        },
    ],
    OperatingStateSequenceList: [
        {
            ChannelName: 'local-control-all-tanks-state',
            ValueList: ['HpOffStoreOff', 'HpOffStoreDischarge'],
            TimestampList: ['2025-02-26T00:00:42.099Z', '2025-02-26T00:01:42.105Z'],
            TypeName: 'operating.state.sequence',
            Version: '000',
        },
    ],
    LatePersistenceTimePeriodList: [['2025-02-26T00:01:15Z', '2025-02-26T00:01:30Z']],
    TypeName: 'synced.readings.bundle',
    Version: '003',
};

const forecast = {
    FromGNodeAlias: 'hw1.stopgap.price',
    PNodeAlias: 'hw1.isone.ver.keene',
    TariffAlias: 'versant.a1.home.eco.bonus',
    HourStartS: [1792018800, 1792022400],
    LmpList: [31.5, 29.0],
    DistList: [80.0, 80.0],
    PriceUid: '5d3e8f14-7a2b-4c6e-9f10-2b8d4e6a1c3f',
    ForecastCreatedS: 1792014000,
    TypeName: 'gw.stopgap.price.forecast',
    Version: '000',
};

function firstMessage(result: { success: false; error: { issues: { message: string }[] } }): string {
    return result.error.issues[0].message;
}

describe('synced.readings.bundle 003', () => {
    it('parses the registry example, nulls included', () => {
        expect(SyncedReadingsBundle.parse(bundle)).toEqual(bundle);
    });

    it('rejects a grid timestamp with fractional seconds', () => {
        const result = SyncedReadingsBundle.safeParse({ ...bundle, TimestampList: ['2025-02-26T00:00:00.000Z'] });
        expect(result.success).toBe(false);
    });
});

describe('operating.state.sequence 000', () => {
    const sequence = bundle.OperatingStateSequenceList[0];

    it('fails axiom 1 on unequal list lengths', () => {
        const result = OperatingStateSequence.safeParse({ ...sequence, ValueList: ['HpOffStoreOff'] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstMessage(result)).toMatch(/^Axiom 1 \(ListLengthConsistency\) failed/);
        }
    });

    it('fails axiom 2 on a repeated timestamp', () => {
        const t = sequence.TimestampList[0];
        const result = OperatingStateSequence.safeParse({ ...sequence, TimestampList: [t, t] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstMessage(result)).toMatch(/^Axiom 2 \(StrictlyIncreasingTimestamps\) failed/);
        }
    });
});

describe('gw.stopgap.price.forecast 000', () => {
    it('parses a two-hour forecast', () => {
        expect(StopgapPriceForecast.parse(forecast)).toEqual(forecast);
    });

    it('fails axiom 1 when the lists differ in length', () => {
        const result = StopgapPriceForecast.safeParse({ ...forecast, DistList: [80.0] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstMessage(result)).toMatch(/^Axiom 1 \(ListLengthConsistency\) failed/);
        }
    });

    it('fails axiom 3 when the forecast is created after its first hour', () => {
        const result = StopgapPriceForecast.safeParse({ ...forecast, ForecastCreatedS: forecast.HourStartS[0] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstMessage(result)).toMatch(/^Axiom 3 \(ForecastCreatedBeforeFirstHour\) failed/);
        }
    });
});
