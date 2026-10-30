import { z } from 'zod';
import { Unit000 } from '../../enums/old_versions/Unit000';
import { LeftRightDot, SpaceheatName, Uuid4Str } from '../../formats';

/** Sema: https://schemas.electricity.works/types/derived.channel.gt/000 */
export const DerivedChannelGt000 = z.strictObject({
    Id: Uuid4Str,
    Name: SpaceheatName,
    CreatedByNodeName: SpaceheatName,
    Strategy: SpaceheatName,
    OutputUnit: Unit000.optional(),
    DisplayName: z.string(),
    TerminalAssetAlias: LeftRightDot,
    TypeName: z.literal('derived.channel.gt'),
    Version: z.literal('000'),
});
export type DerivedChannelGt000 = z.infer<typeof DerivedChannelGt000>;
