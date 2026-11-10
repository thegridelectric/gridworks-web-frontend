import { z } from 'zod';
import { PositiveInt } from '../formats';

/** Sema: https://schemas.electricity.works/types/flo.tank.store.path/000 */
export const FloTankStorePath = z
    .strictObject({
        StoreLayers: PositiveInt,
        TopFList: z.array(z.number().int()),
        MiddleFList: z.array(z.number().int()),
        BottomFList: z.array(z.number().int()),
        Thermocline1List: z.array(PositiveInt),
        Thermocline2List: z.array(PositiveInt),
        EmptyStoreWh: z.number().int(),
        FullStoreWh: z.number().int(),
        TypeName: z.literal('flo.tank.store.path'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (StepListLengths) failed: the five step lists differ in length',
        path: ['TopFList'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (ThermoclinesWithinTheStore) failed: a thermocline is out of order or below the store',
        path: ['Thermocline1List'],
    })
    .refine(checkAxiom3, {
        message: 'Axiom 3 (EmptyBelowFull) failed: EmptyStoreWh is not less than FullStoreWh',
        path: ['EmptyStoreWh'],
    });
export type FloTankStorePath = z.infer<typeof FloTankStorePath>;

type Shape = {
    StoreLayers: number;
    TopFList: number[];
    MiddleFList: number[];
    BottomFList: number[];
    Thermocline1List: number[];
    Thermocline2List: number[];
    EmptyStoreWh: number;
    FullStoreWh: number;
};

function checkAxiom1(s: Shape): boolean {
    const n = s.TopFList.length;
    return [s.MiddleFList, s.BottomFList, s.Thermocline1List, s.Thermocline2List].every((l) => l.length === n);
}

function checkAxiom2(s: Shape): boolean {
    return s.Thermocline1List.every((t1, i) => t1 <= s.Thermocline2List[i] && s.Thermocline2List[i] <= s.StoreLayers);
}

function checkAxiom3(s: Shape): boolean {
    return s.EmptyStoreWh < s.FullStoreWh;
}
