import type { FloPlotData } from "./FloPlot";

export function floHorizonStepCount(summary: FloPlotData): number {
    const fromPenalty = summary.penalty.time.length;
    if (fromPenalty > 0) {
        return fromPenalty;
    }
    return Math.max(0, summary.power.time.length - 1);
}

export interface FloSummaryXAxisMetrics {
    /** X-axis plot area inset from the left edge of the Plotly graph div (px). */
    offsetPx: number;
    /** Width of the x-axis plot area (px). */
    lengthPx: number;
    /** Horizon steps, split equally across the bar. */
    stepCount: number;
}

type PlotlyAxisLayout = {
    _offset?: number;
    _length?: number;
    range?: [string | number, string | number];
    /** Data value to pixel, relative to `_offset`. */
    d2p?: (value: string | number) => number;
};

type PlotlyGraphDiv = HTMLDivElement & {
    _fullLayout?: {
        xaxis?: PlotlyAxisLayout;
    };
};

const METRICS_EPSILON_PX = 0.05;

export function floSummaryXAxisMetricsEqual(
    a: FloSummaryXAxisMetrics | null,
    b: FloSummaryXAxisMetrics | null,
): boolean {
    if (a === b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return (
        a.stepCount === b.stepCount
        && Math.abs(a.offsetPx - b.offsetPx) <= METRICS_EPSILON_PX
        && Math.abs(a.lengthPx - b.lengthPx) <= METRICS_EPSILON_PX
    );
}

/** Plotly date strings have no zone; parse them the same way as the FLO times (local wall time). */
function parseAxisTime(value: string | number): number {
    if (typeof value === "number") {
        return value;
    }
    return Date.parse(value.replace(" ", "T"));
}

/** Pixel of a time value, relative to the axis start (`_offset`). */
function timeToAxisPx(axis: PlotlyAxisLayout, time: string): number | null {
    if (typeof axis.d2p === "function") {
        const px = axis.d2p(time);
        if (Number.isFinite(px)) {
            return px;
        }
    }
    if (!axis.range || axis._length == null) {
        return null;
    }
    const rangeStart = parseAxisTime(axis.range[0]);
    const rangeEnd = parseAxisTime(axis.range[1]);
    const t = parseAxisTime(time);
    if (![rangeStart, rangeEnd, t].every(Number.isFinite) || rangeEnd <= rangeStart) {
        return null;
    }
    return ((t - rangeStart) / (rangeEnd - rangeStart)) * axis._length;
}

/** Left edge of the graph div relative to the plot shell's content box (inside its padding). */
function graphLeftInShellContent(plotShell: HTMLElement | null, graphDiv: HTMLElement): number {
    if (!plotShell) {
        return 0;
    }
    const padL = Number.parseFloat(getComputedStyle(plotShell).paddingLeft) || 0;
    const contentLeft = plotShell.getBoundingClientRect().left + padL;
    const offset = graphDiv.getBoundingClientRect().left - contentLeft;
    return Number.isFinite(offset) ? offset : 0;
}

export function readFloSummaryXAxisMetrics(
    graphDiv: HTMLDivElement,
    plot: FloPlotData,
    plotShell: HTMLElement | null,
): FloSummaryXAxisMetrics | null {
    const stepCount = floHorizonStepCount(plot);
    const times = plot.power.time;
    if (stepCount <= 0 || times.length < 2) {
        return null;
    }

    const axis = (graphDiv as PlotlyGraphDiv)._fullLayout?.xaxis;
    if (axis?._length == null || axis._length <= 0 || axis._offset == null) {
        return null;
    }

    const startPx = timeToAxisPx(axis, times[0]);
    const endPx = timeToAxisPx(axis, times[Math.min(stepCount, times.length - 1)]);
    if (startPx == null || endPx == null || endPx <= startPx) {
        return null;
    }

    return {
        offsetPx: graphLeftInShellContent(plotShell, graphDiv) + axis._offset + startPx,
        lengthPx: endPx - startPx,
        stepCount,
    };
}
