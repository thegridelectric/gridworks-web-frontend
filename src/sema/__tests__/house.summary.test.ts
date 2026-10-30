import { describe, expect, it } from 'vitest';
import elm013 from './fixtures/elm-layout.lite-013.json';
import { HouseOperatingStatus } from '../types/HouseOperatingStatus';
import { AnyHouseSummary, scadaCommit, scadaCommitStanding } from '../types/AnyHouseSummary';
import { HouseSummary } from '../types/HouseSummary';
import { HouseSummary000 } from '../types/old_versions/HouseSummary000';
import { HouseSummary001 } from '../types/old_versions/HouseSummary001';

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

/** The registry's first gw.house.summary 002 example. */
const minimalSummary = {
    Role: 'Viewer',
    TaGNodeId: '5d3e8f14-7a2b-4c6e-9f10-2b8d4e6a1c3f',
    GNodeAlias: 'hw1.isone.me.versant.keene.beech',
    SendTimeMs: 1792014000000,
    TypeName: 'gw.house.summary',
    Version: '002',
};
/** The registry's second 002 example: a scada on main's head. */
const beechWithCommit = {
    ...minimalSummary,
    Role: 'Admin',
    DisplayName: 'Beech',
    ScadaCommit: 'e55faa2d3b1c4f6a8d9e0f1a2b3c4d5e6f7a8b9c',
    ScadaCommitStanding: 'OnMainHead',
};
const minimalSummary001 = { ...minimalSummary, Version: '001' };
const beechWithCommit001 = { ...minimalSummary001, Role: 'Admin', DisplayName: 'Beech', ScadaCommit: beechWithCommit.ScadaCommit };
const minimalSummary000 = { ...minimalSummary, Version: '000' };

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

describe('gw.house.summary 002', () => {
    it('parses both registry examples', () => {
        expect(HouseSummary.parse(minimalSummary)).toEqual(minimalSummary);
        expect(HouseSummary.parse(beechWithCommit)).toEqual(beechWithCommit);
    });

    it('keeps the -dirty suffix and rejects a short hash', () => {
        const dirty = beechWithCommit.ScadaCommit + '-dirty';
        expect(HouseSummary.parse({ ...beechWithCommit, ScadaCommit: dirty }).ScadaCommit).toBe(dirty);
        expect(HouseSummary.safeParse({ ...beechWithCommit, ScadaCommit: 'e55faa2' }).success).toBe(false);
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

    it('fails axiom 2 when a standing comes with no commit', () => {
        const result = HouseSummary.safeParse({ ...minimalSummary, ScadaCommitStanding: 'OnMainHead' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstMessage(result)).toMatch(/^Axiom 2 \(StandingNeedsCommit\) failed/);
        }
    });

    it('takes a commit with no standing', () => {
        expect(HouseSummary.parse({ ...beechWithCommit001, Version: '002' }).ScadaCommitStanding).toBeUndefined();
    });

    it('decodes a standing a later enum version appended to Unknown', () => {
        expect(HouseSummary.parse({ ...beechWithCommit, ScadaCommitStanding: 'AheadOfMain' }).ScadaCommitStanding).toBe('Unknown');
    });
});

describe('any gw.house.summary', () => {
    it('reads 000 and 001 through their own words and 002 as the whole word', () => {
        expect(HouseSummary000.parse(minimalSummary000)).toEqual(minimalSummary000);
        expect(HouseSummary001.parse(beechWithCommit001)).toEqual(beechWithCommit001);
        expect(AnyHouseSummary.parse(minimalSummary000).Version).toBe('000');
        expect(AnyHouseSummary.parse(minimalSummary001).Version).toBe('001');
        expect(AnyHouseSummary.parse(beechWithCommit).Version).toBe('002');
    });

    it('states the scada commit only where the word has one', () => {
        expect(scadaCommit(AnyHouseSummary.parse(beechWithCommit))).toBe(beechWithCommit.ScadaCommit);
        expect(scadaCommit(AnyHouseSummary.parse(beechWithCommit001))).toBe(beechWithCommit.ScadaCommit);
        expect(scadaCommit(AnyHouseSummary.parse(minimalSummary))).toBeUndefined();
        expect(scadaCommit(AnyHouseSummary.parse(minimalSummary000))).toBeUndefined();
    });

    it('states the standing only from 002', () => {
        expect(scadaCommitStanding(AnyHouseSummary.parse(beechWithCommit))).toBe('OnMainHead');
        expect(scadaCommitStanding(AnyHouseSummary.parse(beechWithCommit001))).toBeUndefined();
        expect(scadaCommitStanding(AnyHouseSummary.parse(minimalSummary))).toBeUndefined();
    });

    it('rejects a 001 that names a standing', () => {
        expect(AnyHouseSummary.safeParse({ ...beechWithCommit001, ScadaCommitStanding: 'OnMainHead' }).success).toBe(false);
    });

    it('rejects a 000 that names a commit', () => {
        expect(AnyHouseSummary.safeParse({ ...minimalSummary000, ScadaCommit: beechWithCommit.ScadaCommit }).success).toBe(false);
    });
});
