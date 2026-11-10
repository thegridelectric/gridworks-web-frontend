import { z } from 'zod';
import { NonNegativeInt, PositiveInt } from '../formats';

/** Sema: https://schemas.electricity.works/types/flo.tuning.bruce/001 */
export const FloTuningBruce = z
    .strictObject({
        NumLayers: PositiveInt,
        StorageLossesPercent: z.number(),
        HpMinKwEl: z.number(),
        HpMaxKwTh: z.number(),
        MaxLoadKwTh: z.number(),
        HpConstantLiftF: z.number(),
        LoadBucketUpperKwhList: z.array(z.number()),
        RwtInterceptByBucketList: z.array(z.number()),
        RwtSlopeByBucketList: z.array(z.number()),
        RwtMinF: z.number(),
        RswtPenaltyEnabled: z.boolean(),
        RswtPenaltyWeight: z.number(),
        RswtPenaltyDecay: z.number(),
        RswtPenaltyExponentRate: z.number(),
        RswtPenaltyDecayMaxHour: NonNegativeInt,
        ShortCyclePenaltyEnabled: z.boolean(),
        ShortCyclePenaltyWeight: z.number(),
        StabilityPenaltyEnabled: z.boolean(),
        StabilityPenaltyWeight: z.number(),
        StabilityPenaltyDecay: z.number(),
        StabilityPenaltyThresholdKwh: z.number(),
        StabilityPenaltyThresholdPriceMwh: z.number(),
        StabilityPenaltyHorizonHours: NonNegativeInt,
        TerminalCostEnabled: z.boolean(),
        TerminalCostEndWindowHours: NonNegativeInt,
        TypeName: z.literal('flo.tuning.bruce'),
        Version: z.literal('001'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (OneLinePerBucket) failed: the RWT lines do not number one more than the load buckets',
        path: ['RwtInterceptByBucketList'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (BucketsAscend) failed: LoadBucketUpperKwhList is not positive and strictly increasing',
        path: ['LoadBucketUpperKwhList'],
    });
export type FloTuningBruce = z.infer<typeof FloTuningBruce>;

type Shape = { LoadBucketUpperKwhList: number[]; RwtInterceptByBucketList: number[]; RwtSlopeByBucketList: number[] };

function checkAxiom1(t: Shape): boolean {
    const lines = t.LoadBucketUpperKwhList.length + 1;
    return t.RwtInterceptByBucketList.length === lines && t.RwtSlopeByBucketList.length === lines;
}

function checkAxiom2(t: Shape): boolean {
    return t.LoadBucketUpperKwhList.every((upper, i) => upper > 0 && (i === 0 || upper > t.LoadBucketUpperKwhList[i - 1]));
}
