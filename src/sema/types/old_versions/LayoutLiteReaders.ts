/** Readers of `layout.lite` 011 and 012 for the fields the browser uses.
 *  Each reads the channel lists at the channel words those versions
 *  reference and leaves the rest of the instance unvalidated; neither is the
 *  whole word, which has the tank, flow, relay and parameter components the
 *  browser does not read. They go when the TypeScript emitter generates the
 *  full words. */
import { z } from 'zod';
import { LeftRightDot, UtcMilliseconds, Uuid4Str } from '../../formats';
import { DataChannelGt001 } from './DataChannelGt001';
import { DataChannelGt002 } from './DataChannelGt002';
import { DerivedChannelGt000 } from './DerivedChannelGt000';
import { DerivedChannelGt001 } from './DerivedChannelGt001';

export const LayoutLite011Reader = z.looseObject({
    FromGNodeAlias: LeftRightDot,
    MessageCreatedMs: UtcMilliseconds,
    MessageId: Uuid4Str,
    ZoneList: z.array(z.string()),
    CriticalZoneList: z.array(z.string()),
    DataChannels: z.array(DataChannelGt001),
    DerivedChannels: z.array(z.union([DerivedChannelGt000, DerivedChannelGt001])),
    TypeName: z.literal('layout.lite'),
    Version: z.literal('011'),
});
export type LayoutLite011Reader = z.infer<typeof LayoutLite011Reader>;

export const LayoutLite012Reader = z.looseObject({
    FromGNodeAlias: LeftRightDot,
    MessageCreatedMs: UtcMilliseconds,
    MessageId: Uuid4Str,
    ZoneList: z.array(z.string()),
    CriticalZoneList: z.array(z.string()),
    DataChannels: z.array(DataChannelGt002),
    DerivedChannels: z.array(DerivedChannelGt001),
    TypeName: z.literal('layout.lite'),
    Version: z.literal('012'),
});
export type LayoutLite012Reader = z.infer<typeof LayoutLite012Reader>;
