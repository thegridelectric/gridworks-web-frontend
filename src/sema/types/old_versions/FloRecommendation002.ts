import { z } from 'zod';
import { GitCommit, LeftRightDot, NonEmptyString, UtcMilliseconds } from '../../formats';
import { MarketPriceUnit } from '../../enums/MarketPriceUnit';
import { MarketQuantityUnit } from '../../enums/MarketQuantityUnit';
import { FloOptimalPath } from '../FloOptimalPath';
import { FloPathPenaltiesBruce001 } from './FloPathPenaltiesBruce001';
import { FloTankStorePath } from '../FloTankStorePath';
import { PriceQuantityUnitless } from '../PriceQuantityUnitless';
import { RECOMMENDATION_AXIOMS, annotatesEveryPath } from '../floRecommendationAxioms';

/** Sema: https://schemas.electricity.works/types/flo.recommendation/002 */
export const FloRecommendation002 = RECOMMENDATION_AXIOMS.reduce(
    (schema, [check, message, path]) => schema.refine(check, { message, path: [path] }),
    z.strictObject({
        BidderAlias: LeftRightDot,
        PqPairs: z.array(PriceQuantityUnitless),
        PriceUnit: MarketPriceUnit,
        QuantityUnit: MarketQuantityUnit,
        OptimalPathList: z.array(FloOptimalPath),
        StoreStateList: z.array(FloTankStorePath).optional(),
        PathPenaltiesList: z.array(FloPathPenaltiesBruce001).optional(),
        FloName: LeftRightDot,
        FloRepo: NonEmptyString,
        FloGitCommit: GitCommit,
        CreatedMs: UtcMilliseconds,
        TypeName: z.literal('flo.recommendation'),
        Version: z.literal('002'),
    }),
)
    .refine(checkAxiom6, {
        message: 'Axiom 6 (StoreStatePerPath) failed: StoreStateList does not annotate every path step for step',
        path: ['StoreStateList'],
    })
    .refine(checkAxiom7, {
        message: 'Axiom 7 (PenaltiesPerPath) failed: PathPenaltiesList does not annotate every path step for step',
        path: ['PathPenaltiesList'],
    });
export type FloRecommendation002 = z.infer<typeof FloRecommendation002>;

type Shape = {
    OptimalPathList: FloOptimalPath[];
    StoreStateList?: FloTankStorePath[];
    PathPenaltiesList?: FloPathPenaltiesBruce001[];
};

function checkAxiom6(r: Shape): boolean {
    return annotatesEveryPath(r.StoreStateList, r.OptimalPathList, [
        'TopFList', 'MiddleFList', 'BottomFList', 'Thermocline1List', 'Thermocline2List',
    ]);
}

function checkAxiom7(r: Shape): boolean {
    return annotatesEveryPath(r.PathPenaltiesList, r.OptimalPathList, [
        'RswtPenaltyUsdList', 'UnmetLoadPenaltyUsdList', 'StabilityPenaltyUsdList', 'ShortCyclePenaltyUsdList',
    ]);
}
