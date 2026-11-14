import { z } from 'zod';
import { LeftRightDot, UtcMilliseconds, Uuid4Str } from '../formats';
import { DataChannelGt } from './DataChannelGt';
import { DerivedChannelGt } from './DerivedChannelGt';
import { StateMachine } from './StateMachine';
import { SpaceheatNodeGt } from './SpaceheatNodeGt';
import { TouTariff } from './TouTariff';
import { LAYOUT_AXIOMS } from './layoutLiteAxioms';

/** Sema: https://schemas.electricity.works/types/layout.lite/014 */
export const LayoutLite = LAYOUT_AXIOMS.reduce(
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
        Tariff: TouTariff,
        TypeName: z.literal('layout.lite'),
        Version: z.literal('014'),
    }),
);
export type LayoutLite = z.infer<typeof LayoutLite>;
