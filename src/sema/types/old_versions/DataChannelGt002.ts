import { z } from 'zod';
import { Quantity } from '../../enums/Quantity';
import { SpaceheatTelemetryName } from '../../enums/SpaceheatTelemetryName';
import { LeftRightDot, SpaceheatName, UtcSeconds, Uuid4Str } from '../../formats';

/** Sema: https://schemas.electricity.works/types/data.channel.gt/002 */
export const DataChannelGt002 = z.strictObject({
    Name: SpaceheatName,
    DisplayName: z.string(),
    AboutNodeName: SpaceheatName,
    CapturedByNodeName: SpaceheatName,
    TelemetryName: SpaceheatTelemetryName,
    Quantity: Quantity,
    TerminalAssetAlias: LeftRightDot,
    InPowerMetering: z.boolean().optional(),
    StartS: UtcSeconds.optional(),
    Id: Uuid4Str,
    TypeName: z.literal('data.channel.gt'),
    Version: z.literal('002'),
});
export type DataChannelGt002 = z.infer<typeof DataChannelGt002>;
