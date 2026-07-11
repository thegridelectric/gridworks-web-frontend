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

    // TODO implement on the server
    PrimaryContact: InstallationContact | undefined;
    SecondaryContact: InstallationContact | undefined;
    AlertStatus: string | undefined;
    AlertMessage: string | undefined;
    HardwareLayout: string | undefined;
    HeatingParameters: HeatingParameters | undefined;
}