import { z } from 'zod';
import { FloRecommendation } from './FloRecommendation';
import { FloRecommendation000 } from './old_versions/FloRecommendation000';
import { FloRecommendation001 } from './old_versions/FloRecommendation001';

/** The `flo.recommendation` versions the journal holds and a re-run
 *  answers with. The backend serves each at its own version and the
 *  browser reads all three. */
export const AnyFloRecommendation = z.union([FloRecommendation, FloRecommendation001, FloRecommendation000]);
export type AnyFloRecommendation = z.infer<typeof AnyFloRecommendation>;
