import { z } from 'zod';
import { Gw1Unit000 } from '../../enums/old_versions/Gw1Unit000';
import { LeftRightDot, SpaceheatName, Uuid4Str } from '../../formats';

/** Sema: https://schemas.electricity.works/types/derived.channel.gt/000 */
export const DerivedChannelGt000 = z.strictObject({
    Id: Uuid4Str,
    Name: SpaceheatName,
    CreatedByNodeName: SpaceheatName,
    Strategy: SpaceheatName,
    OutputUnit: Gw1Unit000.optional(),
    DisplayName: z.string(),
    TerminalAssetAlias: LeftRightDot,
    TypeName: z.literal('derived.channel.gt'),
    Version: z.literal('000'),
});
export type DerivedChannelGt000 = z.infer<typeof DerivedChannelGt000>;
