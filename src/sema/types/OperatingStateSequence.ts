import { z } from 'zod';
import { PascalCase, SpaceheatName, UtcIso8601Millis } from '../formats';

/** Sema: https://schemas.electricity.works/types/operating.state.sequence/000 */
export const OperatingStateSequence = z
    .strictObject({
        ChannelName: SpaceheatName,
        ValueList: z.array(PascalCase),
        TimestampList: z.array(UtcIso8601Millis),
        TypeName: z.literal('operating.state.sequence'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (ListLengthConsistency) failed: ValueList and TimestampList differ in length',
        path: ['ValueList'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (StrictlyIncreasingTimestamps) failed: TimestampList is not strictly increasing',
        path: ['TimestampList'],
    });
export type OperatingStateSequence = z.infer<typeof OperatingStateSequence>;

function checkAxiom1(s: { ValueList: string[]; TimestampList: string[] }): boolean {
    return s.ValueList.length === s.TimestampList.length;
}

function checkAxiom2(s: { TimestampList: string[] }): boolean {
    return s.TimestampList.every((t, i) => i === 0 || t > s.TimestampList[i - 1]);
}
