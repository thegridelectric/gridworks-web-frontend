import { describe, expect, it } from 'vitest';
import elm013 from './fixtures/elm-layout.lite-013.json';
import { HouseOperatingStatus } from '../types/HouseOperatingStatus';
import { HouseSummary } from '../types/HouseSummary';

/** The registry's gw.house.operating.status examples. */
const spruceStatus = {
    ScadaAlias: 'hw1.isone.me.versant.keene.spruce.scada',
    ValidationState: 'ValidatedRealAssetAndGps',
    Standby: false,
    StandbyPosture: 'NoHeatingOrCooling',
    SeasonalStorageMode: 'BufferOnly',
    ServiceMode: 'Heating',
    AcceptsDispatch: true,
    TopState: 'Auto',
    ScadaBlind: false,
    LtnDispatching: true,
    CreatedMs: 1790000000000,
    TypeName: 'gw.house.operating.status',
    Version: '000',
};
const beechStandby = {
    ...spruceStatus,
    ScadaAlias: 'hw1.isone.me.versant.keene.beech.scada',
    Standby: true,
    SeasonalStorageMode: 'AllTanks',
    AcceptsDispatch: false,
    DispatchRefusalReason: 'OperatorHold',
    LtnDispatching: false,
};

/** The registry's gw.house.summary example. */
const minimalSummary = {
    Role: 'Viewer',
    TaGNodeId: '5d3e8f14-7a2b-4c6e-9f10-2b8d4e6a1c3f',
    GNodeAlias: 'hw1.isone.me.versant.keene.beech',
    SendTimeMs: 1792014000000,
    TypeName: 'gw.house.summary',
    Version: '000',
};

function firstMessage(result: { success: false; error: { issues: { message: string }[] } }): string {
    return result.error.issues[0].message;
}

describe('gw.house.operating.status 000', () => {
    it('parses both registry examples', () => {
        expect(HouseOperatingStatus.parse(spruceStatus)).toEqual(spruceStatus);
        expect(HouseOperatingStatus.parse(beechStandby)).toEqual(beechStandby);
    });

    it('fails axiom 1 when a refusal reason comes with AcceptsDispatch true', () => {
        const result = HouseOperatingStatus.safeParse({ ...spruceStatus, DispatchRefusalReason: 'ScadaBlind' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstMessage(result)).toMatch(/^Axiom 1 \(RefusalReasonPresence\) failed/);
        }
    });

    it('fails axiom 2 when standby refuses for another reason', () => {
        const result = HouseOperatingStatus.safeParse({ ...beechStandby, DispatchRefusalReason: 'InAdmin' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstMessage(result)).toMatch(/^Axiom 2 \(StandbyRefusesDispatch\) failed/);
        }
    });

    it('decodes a value a later enum version appended to the default', () => {
        expect(HouseOperatingStatus.parse({ ...spruceStatus, TopState: 'Maintenance' }).TopState).toBe('Auto');
    });
});

describe('gw.house.summary 000', () => {
    it('parses the registry example', () => {
        expect(HouseSummary.parse(minimalSummary)).toEqual(minimalSummary);
    });

    it('parses a full summary with the elm layout and a status', () => {
        const full = {
            ...minimalSummary,
            Role: 'Admin',
            DisplayName: 'Elm',
            Layout: elm013,
            OperatingStatus: spruceStatus,
            LatestSnapshotTime: '2026-10-28T14:00:00Z',
            LongestRunningZoneName: 'zone1-heat-call',
            LongestRunningZoneStartTime: '2026-10-28T13:12:00Z',
        };
        const parsed = HouseSummary.parse(full);
        expect(parsed.Layout?.Version).toBe('013');
        expect(parsed.OperatingStatus?.ServiceMode).toBe('Heating');
    });

    it('fails axiom 1 when a running zone has no start time', () => {
        const result = HouseSummary.safeParse({ ...minimalSummary, LongestRunningZoneName: 'zone1-heat-call' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstMessage(result)).toMatch(/^Axiom 1 \(ZonePairTogether\) failed/);
        }
    });

    it('rejects a snapshot time with fractional seconds', () => {
        expect(HouseSummary.safeParse({ ...minimalSummary, LatestSnapshotTime: '2026-10-28T14:00:00.000Z' }).success).toBe(false);
    });
});
