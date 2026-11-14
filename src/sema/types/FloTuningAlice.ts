import { z } from 'zod';

/** Sema: https://schemas.electricity.works/types/flo.tuning.alice/000 */
export const FloTuningAlice = z.strictObject({
    TypeName: z.literal('flo.tuning.alice'),
    Version: z.literal('000'),
});
export type FloTuningAlice = z.infer<typeof FloTuningAlice>;
