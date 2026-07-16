import type { InstallationContact } from "./InstallationContact";
import type { SpaceheatParameters } from './SpaceheatParameters'
import type { HardwareLayout } from './HardwareLayout';

export interface InstallationSummary {
    Role: string;
    GNodeAlias: string;
    DisplayName: string;
    Address: any;
    LatestSnapshotTime: string;
    LongestRunningZoneName: string;
    LongestRunningZoneStartTime: string;
    SystemMode: string;
    MainAutoState: string;
    SpaceheatParameters: SpaceheatParameters | undefined;
    PrimaryContact: InstallationContact | undefined;
    SecondaryContact: InstallationContact | undefined;
    HardwareLayout: HardwareLayout | undefined;

    // TODO implement on the server
    AlertStatus: string | undefined;
    AlertMessage: string | undefined;
}