import type { HouseOperatingStatus } from './HouseOperatingStatus';
import type { LayoutLite } from './LayoutLite';

export type DashboardRole = 'Admin' | 'Owner' | 'Viewer';

/** Sema `gw.house.summary` 000: one house the login may see, from
 *  GET /api/v2/installations/*\/summaries. Keyed by the TerminalAsset
 *  GNodeId; the alias is the house's. Nothing about a person is here.
 *  A field the word allows to be null is absent from the instance. */
export interface HouseSummary {
    TypeName: 'gw.house.summary';
    Version: '000';
    Role: DashboardRole;
    TaGNodeId: string;
    GNodeAlias: string;
    DisplayName?: string;
    Layout?: LayoutLite;
    OperatingStatus?: HouseOperatingStatus;
    /** Absent when the house has not reported in the last day. */
    LatestSnapshotTime?: string;
    LongestRunningZoneName?: string;
    LongestRunningZoneStartTime?: string;
    /** The backend's clock when the response was assembled, ms since the epoch. */
    SendTimeMs: number;
}
