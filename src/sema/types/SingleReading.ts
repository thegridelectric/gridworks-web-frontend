import { z } from 'zod';
import { SpaceheatName, UtcMilliseconds } from '../formats';

/** Sema: https://schemas.electricity.works/types/single.reading/000 */
export const SingleReading = z.strictObject({
    ChannelName: SpaceheatName,
    Value: z.number().int(),
    ScadaReadTimeUnixMs: UtcMilliseconds,
    TypeName: z.literal('single.reading'),
    Version: z.literal('000'),
});
export type SingleReading = z.infer<typeof SingleReading>;
