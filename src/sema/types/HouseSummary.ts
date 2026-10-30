import { z } from 'zod';
import { CommitStanding } from '../enums/CommitStanding';
import { DashboardRole } from '../enums/DashboardRole';
import { GitCommit, LeftRightDot, SpaceheatName, UtcIso8601Seconds, UtcMilliseconds, Uuid4Str } from '../formats';
import { AnyLayoutLite } from './AnyLayoutLite';
import { HouseOperatingStatus } from './HouseOperatingStatus';

/** Sema: https://schemas.electricity.works/types/gw.house.summary/002 */
export const HouseSummary = z
    .strictObject({
        Role: DashboardRole,
        TaGNodeId: Uuid4Str,
        GNodeAlias: LeftRightDot,
        DisplayName: z.string().optional(),
        Layout: AnyLayoutLite.optional(),
        OperatingStatus: HouseOperatingStatus.optional(),
        LatestSnapshotTime: UtcIso8601Seconds.optional(),
        LongestRunningZoneName: SpaceheatName.optional(),
        LongestRunningZoneStartTime: UtcIso8601Seconds.optional(),
        ScadaCommit: GitCommit.optional(),
        ScadaCommitStanding: CommitStanding.optional(),
        SendTimeMs: UtcMilliseconds,
        TypeName: z.literal('gw.house.summary'),
        Version: z.literal('002'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (ZonePairTogether) failed: LongestRunningZoneName and LongestRunningZoneStartTime are present together or absent together',
        path: ['LongestRunningZoneName'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (StandingNeedsCommit) failed: ScadaCommitStanding is present with no ScadaCommit',
        path: ['ScadaCommitStanding'],
    });
export type HouseSummary = z.infer<typeof HouseSummary>;

function checkAxiom1(s: { LongestRunningZoneName?: string; LongestRunningZoneStartTime?: string }): boolean {
    return (s.LongestRunningZoneName === undefined) === (s.LongestRunningZoneStartTime === undefined);
}

function checkAxiom2(s: { ScadaCommit?: string; ScadaCommitStanding?: string }): boolean {
    return !(s.ScadaCommit === undefined && s.ScadaCommitStanding !== undefined);
}
