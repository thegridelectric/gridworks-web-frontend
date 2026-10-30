import { z } from 'zod';
import { LeftRightDot, SpaceheatName } from '../formats';

/** Sema: https://schemas.electricity.works/types/channel.readings.list.item/000 */
export const ChannelReadingsListItem = z.strictObject({
    ChannelName: SpaceheatName,
    ValueList: z.array(z.number().int().nullable()),
    Unit: z.string(),
    UnitType: LeftRightDot,
    TypeName: z.literal('channel.readings.list.item'),
    Version: z.literal('000'),
});
export type ChannelReadingsListItem = z.infer<typeof ChannelReadingsListItem>;
