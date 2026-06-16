import './RealTimeZoneWhitewirePlot.css';

export interface ZoneWhitewireSeries {
    channel_name: string;
    timestamps: number[];
    values: number[];
}

interface ValueInterval {
    startTimestamp: number;
    endTimestamp: number;
}

interface PlotDimensions {
    width: number;
    height: number;
    padding: number;
    borderRadius: number;
}

const DEFAULT_DIMENSIONS: PlotDimensions = {
    width: 420,
    height: 80,
    padding: 4,
    borderRadius: 6,
};

const COMPACT_DIMENSIONS: PlotDimensions = {
    width: 120,
    height: 20,
    padding: 1,
    borderRadius: 4,
};

export function parseZoneWhitewireSeriesMessage(
    payload: unknown,
): ZoneWhitewireSeries | null {
    if (payload === null || typeof payload !== 'object') {
        return null;
    }
    const message = payload as {
        type?: string;
        channel_name?: unknown;
        timestamps?: unknown;
        values?: unknown;
    };
    if (message.type !== 'zone_whitewire_series') {
        return null;
    }
    const { channel_name: channelName, timestamps, values } = message;
    if (
        typeof channelName !== 'string' ||
        !Array.isArray(timestamps) ||
        !Array.isArray(values) ||
        timestamps.length !== values.length
    ) {
        return null;
    }
    return {
        channel_name: channelName,
        timestamps: timestamps as number[],
        values: values as number[],
    };
}

/** Contiguous timestamp ranges for a given binarized value (heat-call style). */
export function intervalsFromSeries(
    timestamps: number[],
    values: number[],
    targetValue: number,
): ValueInterval[] {
    const intervals: ValueInterval[] = [];
    let index = 0;

    while (index < values.length) {
        if (values[index] !== targetValue) {
            index += 1;
            continue;
        }

        const startIndex = index;
        while (index < values.length && values[index] === targetValue) {
            index += 1;
        }

        const endIndex = index - 1;
        const endTimeIndex = Math.min(endIndex + 1, timestamps.length - 1);
        intervals.push({
            startTimestamp: timestamps[startIndex],
            endTimestamp: timestamps[endTimeIndex],
        });
    }

    return intervals;
}

function mapTimestampToX(
    timestamp: number,
    minTimestamp: number,
    maxTimestamp: number,
    plotWidth: number,
    padding: number,
): number {
    const timestampRange = maxTimestamp - minTimestamp || 1;
    const innerWidth = plotWidth - padding * 2;
    return padding + ((timestamp - minTimestamp) / timestampRange) * innerWidth;
}

function intervalRectProps(
    interval: ValueInterval,
    minTimestamp: number,
    maxTimestamp: number,
    innerHeight: number,
    dimensions: PlotDimensions,
) {
    const x0 = mapTimestampToX(
        interval.startTimestamp,
        minTimestamp,
        maxTimestamp,
        dimensions.width,
        dimensions.padding,
    );
    const x1 = mapTimestampToX(
        interval.endTimestamp,
        minTimestamp,
        maxTimestamp,
        dimensions.width,
        dimensions.padding,
    );

    return {
        x: x0,
        y: dimensions.padding,
        width: Math.max(x1 - x0, 1),
        height: innerHeight,
    };
}

export default function RealTimeZoneWhitewirePlot({
    series,
    compact = false,
}: {
    series: ZoneWhitewireSeries;
    compact?: boolean;
}) {
    if (series.timestamps.length === 0 || series.values.length === 0) {
        return null;
    }

    const dimensions = compact ? COMPACT_DIMENSIONS : DEFAULT_DIMENSIONS;
    const minTimestamp = Math.min(...series.timestamps);
    const maxTimestamp = Math.max(...series.timestamps);
    const innerHeight = dimensions.height - dimensions.padding * 2;
    const activeIntervals = intervalsFromSeries(series.timestamps, series.values, 1);

    const fullSpan = intervalRectProps(
        { startTimestamp: minTimestamp, endTimestamp: maxTimestamp },
        minTimestamp,
        maxTimestamp,
        innerHeight,
        dimensions,
    );

    const plotClassName = compact
        ? 'realtime-zone-whitewire-plot realtime-zone-whitewire-plot--compact'
        : 'realtime-zone-whitewire-plot';

    return (
        <div className={plotClassName} aria-hidden="true">
            <svg
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                preserveAspectRatio="none"
            >
                <rect
                    className="inactive-period"
                    x={fullSpan.x}
                    y={fullSpan.y}
                    width={fullSpan.width}
                    height={fullSpan.height}
                    rx={dimensions.borderRadius}
                    ry={dimensions.borderRadius}
                />
                {activeIntervals.map((interval, index) => {
                    const rect = intervalRectProps(
                        interval,
                        minTimestamp,
                        maxTimestamp,
                        innerHeight,
                        dimensions,
                    );
                    return (
                        <rect
                            key={`active-${
                                interval.startTimestamp
                            }-${
                                interval.endTimestamp
                            }-${
                                index
                            }`}
                            className="active-period"
                            x={rect.x}
                            y={rect.y}
                            width={rect.width}
                            height={rect.height}
                            rx={dimensions.borderRadius}
                            ry={dimensions.borderRadius}
                        />
                    );
                })}
            </svg>
        </div>
    );
}
