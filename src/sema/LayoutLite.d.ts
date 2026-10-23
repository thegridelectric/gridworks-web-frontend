/** The fields of sema `layout.lite` (011 through 013) the dashboard reads.
 *  The nested lists are typed to the fields used here; the instance has more.
 *  Optional fields are the ones a version lacks: 013 retires the system
 *  mode, strategy, storage mode and tank count and sends CreatedMs in place
 *  of MessageCreatedMs. */
export interface LayoutLiteDataChannel {
    Name: string;
    DisplayName: string;
    AboutNodeName: string;
    CapturedByNodeName: string;
    TelemetryName: string;
}

export interface LayoutLite {
    FromGNodeAlias: string;
    MessageCreatedMs?: number;
    CreatedMs?: number;
    HardwareLayoutTypeName?: string;
    Strategy?: string;
    SeasonalStorageMode?: string;
    ZoneList: string[];
    CriticalZoneList: string[];
    TotalStoreTanks?: number;
    DataChannels: LayoutLiteDataChannel[];
    TypeName: 'layout.lite';
    Version: string;
}
