import { z } from 'zod';
import { GitCommit, LeftRightDot, NonEmptyString, UtcMilliseconds } from '../../formats';
import { MarketPriceUnit } from '../../enums/MarketPriceUnit';
import { MarketQuantityUnit } from '../../enums/MarketQuantityUnit';
import { FloOptimalPath } from '../FloOptimalPath';
import { PriceQuantityUnitless } from '../PriceQuantityUnitless';
import { RECOMMENDATION_AXIOMS } from '../floRecommendationAxioms';

/** Sema: https://schemas.electricity.works/types/flo.recommendation/000 */
export const FloRecommendation000 = RECOMMENDATION_AXIOMS.reduce(
    (schema, [check, message, path]) => schema.refine(check, { message, path: [path] }),
    z.strictObject({
        BidderAlias: LeftRightDot,
        PqPairs: z.array(PriceQuantityUnitless),
        PriceUnit: MarketPriceUnit,
        QuantityUnit: MarketQuantityUnit,
        OptimalPathList: z.array(FloOptimalPath),
        FloName: LeftRightDot,
        FloRepo: NonEmptyString,
        FloGitCommit: GitCommit,
        CreatedMs: UtcMilliseconds,
        TypeName: z.literal('flo.recommendation'),
        Version: z.literal('000'),
    }),
);
export type FloRecommendation000 = z.infer<typeof FloRecommendation000>;
