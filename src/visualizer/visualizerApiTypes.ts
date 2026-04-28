export interface ChannelReading {
    ChannelName: string,
    ValueList: number[],
    Unit: string,
}

export interface ReadingsBundleApiResponse {
    StartTimestamp: string,
    EndTimestamp: string,
    TimestampList: string[],
    ChannelReadingsList: ChannelReading[],
}
