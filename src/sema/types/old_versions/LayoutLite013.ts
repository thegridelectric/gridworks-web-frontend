import { z } from 'zod';
import { LeftRightDot, UtcMilliseconds, Uuid4Str } from '../../formats';
import { DataChannelGt } from '../../types/DataChannelGt';
import { DerivedChannelGt } from '../../types/DerivedChannelGt';
import { StateMachine } from '../../types/StateMachine';
import { SpaceheatNodeGt } from '../../types/SpaceheatNodeGt';
import { LAYOUT_AXIOMS } from '../../types/layoutLiteAxioms';

/** Sema: https://schemas.electricity.works/types/layout.lite/013 */
export const LayoutLite013 = LAYOUT_AXIOMS.reduce(
    (schema, [check, message, path]) => schema.refine(check, { message, path: [path] }),
    z.strictObject({
        FromGNodeAlias: LeftRightDot,
        CreatedMs: UtcMilliseconds,
        MessageId: Uuid4Str,
        HardwareLayoutTypeName: LeftRightDot,
        ZoneList: z.array(z.string()),
        CriticalZoneList: z.array(z.string()),
        ShNodes: z.array(SpaceheatNodeGt),
        DataChannels: z.array(DataChannelGt),
        DerivedChannels: z.array(DerivedChannelGt),
        StateMachines: z.array(StateMachine),
        TypeName: z.literal('layout.lite'),
        Version: z.literal('013'),
    }),
);
export type LayoutLite013 = z.infer<typeof LayoutLite013>;
