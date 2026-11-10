import { z } from 'zod';
import { PositiveInt, UtcSeconds } from '../formats';

/** Sema: https://schemas.electricity.works/types/flo.optimal.path/000 */
export const FloOptimalPath = z
    .strictObject({
        StartUnixS: UtcSeconds,
        StepDurationMinutes: z.array(PositiveInt),
        HpAvgWList: z.array(z.number().int()),
        StoreWhList: z.array(z.number().int()),
        TypeName: z.literal('flo.optimal.path'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (StepListLengths) failed: StepDurationMinutes, HpAvgWList and StoreWhList differ in length',
        path: ['StepDurationMinutes'],
    });
export type FloOptimalPath = z.infer<typeof FloOptimalPath>;

type Shape = { StepDurationMinutes: number[]; HpAvgWList: number[]; StoreWhList: number[] };

function checkAxiom1(p: Shape): boolean {
    return p.StepDurationMinutes.length === p.HpAvgWList.length && p.StepDurationMinutes.length === p.StoreWhList.length;
}
