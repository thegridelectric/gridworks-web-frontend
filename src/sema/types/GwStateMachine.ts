import { z } from 'zod';
import { LeftRightDot, SemaVersion, SpaceheatName } from '../formats';

/** Sema: https://schemas.electricity.works/types/gw.state.machine/000 */
export const GwStateMachine = z.strictObject({
    NodeName: SpaceheatName,
    StateEnum: LeftRightDot,
    StateEnumVersion: SemaVersion,
    TypeName: z.literal('gw.state.machine'),
    Version: z.literal('000'),
});
export type GwStateMachine = z.infer<typeof GwStateMachine>;
