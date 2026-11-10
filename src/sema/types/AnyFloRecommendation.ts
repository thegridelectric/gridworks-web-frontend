import { z } from 'zod';
import { FloRecommendation } from './FloRecommendation';
import { FloRecommendation000 } from './old_versions/FloRecommendation000';

/** The `flo.recommendation` versions the journal holds: 000 rows have no
 *  store state and no penalties, so the backend serves each at its own
 *  version and the browser reads both. */
export const AnyFloRecommendation = z.union([FloRecommendation, FloRecommendation000]);
export type AnyFloRecommendation = z.infer<typeof AnyFloRecommendation>;
