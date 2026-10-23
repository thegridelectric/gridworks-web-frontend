export interface ReadingsBundleApiResponse {
    StartTimestamp: string,
    EndTimestamp: string,
    TimestampList: string[],
    ChannelReadingsList: ChannelReading[],
    LatePersistenceTimePeriodList: string[][],
    OperatingStateSequenceList: OperatingStateSequence[]
}
