import { z } from 'zod';
import { NonNegativeInt } from '../../formats';
import { FloParams001 } from './FloParams001';
import { FloParams002 } from './FloParams002';
import { FloParams003 } from './FloParams003';
import { FLO_RERUN_REQUEST_AXIOMS } from '../floRerunRequestAxioms';

/** Sema: https://schemas.electricity.works/types/flo.rerun.request/001 */
export const FloRerunRequest001 = FLO_RERUN_REQUEST_AXIOMS.reduce(
    (schema, [check, message, path]) => schema.refine(check, { message, path: [path] }),
    z.strictObject({
        Params: z.union([FloParams003, FloParams002, FloParams001]),
        HpForcedOnSteps: z.array(NonNegativeInt),
        HpForcedOffSteps: z.array(NonNegativeInt),
        TypeName: z.literal('flo.rerun.request'),
        Version: z.literal('001'),
    }),
);

export type FloRerunRequest001 = z.infer<typeof FloRerunRequest001>;