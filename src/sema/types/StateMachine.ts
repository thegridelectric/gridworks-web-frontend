import { z } from 'zod';
import { LeftRightDot, SemaVersion, SpaceheatName } from '../formats';

/** Sema: https://schemas.electricity.works/types/gw.state.machine/000 */
export const StateMachine = z.strictObject({
    NodeName: SpaceheatName,
    StateEnum: LeftRightDot,
    StateEnumVersion: SemaVersion,
    TypeName: z.literal('gw.state.machine'),
    Version: z.literal('000'),
});
export type StateMachine = z.infer<typeof StateMachine>;
