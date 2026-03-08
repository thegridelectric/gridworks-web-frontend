export interface ReadingsDataGap {
    start: Date,
    end: Date
}
export interface ReadingsData {
    startTime: Date,
    endTime: Date,
    times: Date[],
    data: Record<string, number[]>
    dataGaps: ReadingsDataGap[]
}