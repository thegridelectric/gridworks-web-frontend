import { z } from 'zod';
import { NonNegativeInt } from '../formats';
import { AnyFloParams } from './AnyFloParams';
import { FLO_RERUN_REQUEST_AXIOMS } from './floRerunRequestAxioms';

/** Sema: https://schemas.electricity.works/types/flo.rerun.request/001 */
export const FloRerunRequest = FLO_RERUN_REQUEST_AXIOMS.reduce(
    (schema, [check, message, path]) => schema.refine(check, { message, path: [path] }),
    z.strictObject({
        Params: AnyFloParams,
        HpForcedOnSteps: z.array(NonNegativeInt),
        HpForcedOffSteps: z.array(NonNegativeInt),
        TypeName: z.literal('flo.rerun.request'),
        Version: z.literal('001'),
    }),
);

export type FloRerunRequest = z.infer<typeof FloRerunRequest>;