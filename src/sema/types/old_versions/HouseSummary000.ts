import { z } from 'zod';
import { DashboardRole } from '../../enums/DashboardRole';
import { LeftRightDot, SpaceheatName, UtcIso8601Seconds, UtcMilliseconds, Uuid4Str } from '../../formats';
import { AnyLayoutLite } from '../AnyLayoutLite';
import { HouseOperatingStatus } from '../HouseOperatingStatus';

/** Sema: https://schemas.electricity.works/types/gw.house.summary/000 */
export const HouseSummary000 = z
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
        SendTimeMs: UtcMilliseconds,
        TypeName: z.literal('gw.house.summary'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (ZonePairTogether) failed: LongestRunningZoneName and LongestRunningZoneStartTime are present together or absent together',
        path: ['LongestRunningZoneName'],
    });
export type HouseSummary000 = z.infer<typeof HouseSummary000>;

function checkAxiom1(s: { LongestRunningZoneName?: string; LongestRunningZoneStartTime?: string }): boolean {
    return (s.LongestRunningZoneName === undefined) === (s.LongestRunningZoneStartTime === undefined);
}
