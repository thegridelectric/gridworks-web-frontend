import { z } from 'zod';
import { RelayClosedOrOpen } from '../enums/RelayClosedOrOpen';
import { HandleName, LeftRightDot, UtcMilliseconds } from '../formats';

/** Sema: https://schemas.electricity.works/types/single.machine.state/000 */
export const SingleMachineState = z
    .strictObject({
        MachineHandle: HandleName,
        StateEnum: LeftRightDot,
        State: z.string(),
        UnixMs: UtcMilliseconds,
        Cause: z.string().optional(),
        TypeName: z.literal('single.machine.state'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (RecognizedStateEnumConsistency) failed: State must be a valid relay.closed.or.open value',
        path: ['State'],
    });
export type SingleMachineState = z.infer<typeof SingleMachineState>;

function checkAxiom1(s: { StateEnum: string; State: string }): boolean {
    if (s.StateEnum !== 'relay.closed.or.open') {
        return true;
    }
    return (RelayClosedOrOpen.options as readonly string[]).includes(s.State);
}
