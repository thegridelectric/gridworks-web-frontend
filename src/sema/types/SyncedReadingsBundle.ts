import { z } from 'zod';
import { LeftRightDot, UtcIso8601Seconds } from '../formats';
import { ChannelReadingsListItem } from './ChannelReadingsListItem';
import { OperatingStateSequence } from './OperatingStateSequence';

/** Sema: https://schemas.electricity.works/types/synced.readings.bundle/003 */
export const SyncedReadingsBundle = z.strictObject({
    AboutGNodeAlias: LeftRightDot,
    StartTimestamp: UtcIso8601Seconds,
    EndTimestamp: UtcIso8601Seconds,
    TimestampList: z.array(UtcIso8601Seconds),
    ChannelReadingsList: z.array(ChannelReadingsListItem),
    LatePersistenceTimePeriodList: z.array(z.array(UtcIso8601Seconds)),
    OperatingStateSequenceList: z.array(OperatingStateSequence),
    TypeName: z.literal('synced.readings.bundle'),
    Version: z.literal('003'),
});
export type SyncedReadingsBundle = z.infer<typeof SyncedReadingsBundle>;
