import type { ChannelReadingsListItem } from './ChannelReadingsListItem';
import type { OperatingStateSequence } from './OperatingStateSequence';

/** Sema `synced.readings.bundle` 003: one house's readings over a window
 *  on one time grid, from GET /api/v2/installations/{id}/synced.readings.bundle.
 *  Timestamps are UTC ISO 8601 to the second. */
export interface SyncedReadingsBundle {
    TypeName: 'synced.readings.bundle';
    Version: '003';
    AboutGNodeAlias: string;
    StartTimestamp: string;
    EndTimestamp: string;
    TimestampList: string[];
    ChannelReadingsList: ChannelReadingsListItem[];
    LatePersistenceTimePeriodList: string[][];
    OperatingStateSequenceList: OperatingStateSequence[];
}
