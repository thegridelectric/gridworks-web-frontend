export interface ChannelReading {
    ChannelName: string,
    ValueList: number[],
    Unit: string,
}

export interface OperatingStateSequence {
    ChannelName: string,
    TimestampList: string[],
    ValueList: string[]
}

export interface ReadingsBundleApiResponse {
    StartTimestamp: string,
    EndTimestamp: string,
    TimestampList: string[],
    ChannelReadingsList: ChannelReading[],
    LatePersistenceList: string[][2],
    OperatingStateSequenceList: OperatingStateSequence[]
}
