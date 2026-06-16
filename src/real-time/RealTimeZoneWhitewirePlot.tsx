export interface ZoneWhitewireSeries {
    channel_name: string;
    timestamps: number[];
    values: number[];
}

const PLOT_WIDTH = 420;
const PLOT_HEIGHT = 80;
const PLOT_PADDING = 4;

function polylinePoints(
    timestamps: number[],
    values: number[],
    width: number,
    height: number,
    padding: number,
): string {
    if (timestamps.length === 0) {
        return '';
    }

    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const timestampRange = maxTimestamp - minTimestamp || 1;
    const valueRange = maxValue - minValue || 1;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    return timestamps
        .map((timestamp, index) => {
            const x = padding + ((timestamp - minTimestamp) / timestampRange) * innerWidth;
            const y =
                padding +
                innerHeight -
                ((values[index] - minValue) / valueRange) * innerHeight;
            return `${x},${y}`;
        })
        .join(' ');
}

export default function RealTimeZoneWhitewirePlot({ series }: { series: ZoneWhitewireSeries }) {
    if (series.timestamps.length === 0 || series.values.length === 0) {
        return null;
    }

    const points = polylinePoints(
        series.timestamps,
        series.values,
        PLOT_WIDTH,
        PLOT_HEIGHT,
        PLOT_PADDING,
    );

    return (
        <div className="realtime-zone-whitewire-plot" aria-hidden="true">
            <svg
                viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
                preserveAspectRatio="none"
            >
                <polyline points={points} />
            </svg>
        </div>
    );
}
