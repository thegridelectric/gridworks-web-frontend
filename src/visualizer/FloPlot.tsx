import { useCallback, useEffect, useRef } from "react";
import Plot from "react-plotly.js";
import type { Figure } from "react-plotly.js";
import type { Data, Layout, Shape } from "plotly.js";
import type { AnyFloRecommendation } from "../sema/types/AnyFloRecommendation";
import type { AnyFloParams } from "../sema/types/AnyFloParams";
import { FLO_PLOT_MARGINS, getDefaultPlotLayout } from "./plot-configs";
import {
    paramsView,
    pathView,
    penaltyBars,
    plotTitle,
    storeEndTimes,
    storePlot,
    type PenaltySeriesEnabled,
} from "./flo-path-view";

export const ELEC_PRICE_HIGHLIGHT_USD_MWH = 400;

const ELEC_PRICE_HIGHLIGHT_FILL = {
    light: "rgba(255, 244, 190, 0.42)",
    dark: "rgba(255, 214, 100, 0.11)",
} as const;

export function elecPriceHighlightFillColor(isDarkMode: boolean): string {
    return isDarkMode ? ELEC_PRICE_HIGHLIGHT_FILL.dark : ELEC_PRICE_HIGHLIGHT_FILL.light;
}

export function floHighElecPriceStepMask(
    times: string[],
    elecPriceUsdMwh: number[],
    segmentCount: number,
): boolean[] {
    const mask = Array.from({ length: segmentCount }, () => false);
    const stepCount = Math.min(times.length - 1, elecPriceUsdMwh.length);
    for (let i = 0; i < stepCount && i < segmentCount; i++) {
        if (elecPriceUsdMwh[i] > ELEC_PRICE_HIGHLIGHT_USD_MWH) {
            mask[i] = true;
        }
    }
    return mask;
}

export interface FloSummaryXAxisMetrics {
    offsetPx: number;
    lengthPx: number;
    stepCount: number;
}

type PlotlyAxisLayout = {
    _offset?: number;
    _length?: number;
    range?: [string | number, string | number];
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

function parseAxisTime(value: string | number): number {
    if (typeof value === "number") {
        return value;
    }
    return Date.parse(value.replace(" ", "T"));
}

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
    stepEdges: string[],
    plotShell: HTMLElement | null,
): FloSummaryXAxisMetrics | null {
    const stepCount = stepEdges.length - 1;
    if (stepCount <= 0) {
        return null;
    }

    const axis = (graphDiv as PlotlyGraphDiv)._fullLayout?.xaxis;
    if (axis?._length == null || axis._length <= 0 || axis._offset == null) {
        return null;
    }

    const startPx = timeToAxisPx(axis, stepEdges[0]);
    const endPx = timeToAxisPx(axis, stepEdges[stepCount]);
    if (startPx == null || endPx == null || endPx <= startPx) {
        return null;
    }

    return {
        offsetPx: graphLeftInShellContent(plotShell, graphDiv) + axis._offset + startPx,
        lengthPx: endPx - startPx,
        stepCount,
    };
}

const trace = (value: object): Data => value as Data;

/** Repeat the last value out to the horizon end, so a post-step line covers the final hour. */
function stepThrough(times: string[], end: string, values: number[]): { x: string[]; y: number[] } {
    if (values.length === 0) return { x: times, y: values };
    return { x: [...times, end], y: [...values, values[values.length - 1]] };
}

function penaltyEnabled(params: AnyFloParams | null): PenaltySeriesEnabled {
    const tuning = params?.Tuning;
    if (!tuning || tuning.TypeName !== "flo.tuning.bruce") {
        return { rswt: true, unmet: true, stability: true, shortCycle: true, terminal: true };
    }
    return {
        rswt: tuning.RswtPenaltyEnabled,
        unmet: tuning.Version === "002" ? tuning.UnmetLoadPenaltyEnabled : true,
        stability: tuning.StabilityPenaltyEnabled,
        shortCycle: tuning.ShortCyclePenaltyEnabled,
        terminal: tuning.TerminalCostEnabled,
    };
}

/** Plot height; y-axis domains leave 0.08 paper gaps between the three panels. */
const FLO_SUMMARY_HEIGHT = 1250;
const FLO_SUMMARY_HEIGHT_NO_PENALTIES = 900;

/** Yellow bands on the power panel when forecast electricity exceeds $/MWh threshold. */
function shapesForHighElecPrice(
    stepEdges: string[],
    elecPriceUsdMwh: number[],
    isDarkMode: boolean,
): Partial<Shape>[] {
    const fillcolor = elecPriceHighlightFillColor(isDarkMode);
    const shapes: Partial<Shape>[] = [];
    const stepCount = Math.min(stepEdges.length - 1, elecPriceUsdMwh.length);
    for (let i = 0; i < stepCount; i++) {
        if (elecPriceUsdMwh[i] > ELEC_PRICE_HIGHLIGHT_USD_MWH) {
            shapes.push({
                type: "rect",
                xref: "x",
                yref: "y domain",
                x0: stepEdges[i],
                x1: stepEdges[i + 1],
                y0: 0,
                y1: 1,
                fillcolor,
                layer: "below",
                line: { width: 0 },
            });
        }
    }
    return shapes;
}

/** One pair's path of a FLO recommendation in the three panels bruce's
 *  visualizer draws: heating power and, where the request is known, the
 *  forecast load and the electricity price, with the hours above the
 *  high-price threshold shaded; the store's layers by temperature with
 *  its state of charge; and the optimizer's penalties. `onXAxisMetrics`
 *  hears where the horizon sits on the page, so controls can line up
 *  with the steps. */
export default function FloPlot(props: {
    recommendation: AnyFloRecommendation;
    params: AnyFloParams | null;
    pairIndex: number;
    isDarkMode: boolean;
    onXAxisMetrics?: (metrics: FloSummaryXAxisMetrics | null) => void;
}) {
    const { recommendation, params, pairIndex, isDarkMode, onXAxisMetrics } = props;
    const view = pathView(recommendation, pairIndex);
    const request = params === null ? null : paramsView(params);
    const stepEdges = [...view.stepStart, view.horizonEnd];

    const plotShellRef = useRef<HTMLDivElement>(null);
    const lastPublishedMetricsRef = useRef<FloSummaryXAxisMetrics | null>(null);
    const resizeFrameRef = useRef<number | null>(null);
    const stepEdgesKey = stepEdges.join(",");

    const publishXAxisMetrics = useCallback((graphDiv: HTMLElement | null) => {
        const notify = onXAxisMetrics;
        if (!notify) {
            return;
        }
        if (!graphDiv) {
            if (lastPublishedMetricsRef.current !== null) {
                lastPublishedMetricsRef.current = null;
                notify(null);
            }
            return;
        }
        const next = readFloSummaryXAxisMetrics(
            graphDiv as HTMLDivElement,
            stepEdgesKey.split(","),
            plotShellRef.current,
        );
        if (floSummaryXAxisMetricsEqual(lastPublishedMetricsRef.current, next)) {
            return;
        }
        lastPublishedMetricsRef.current = next;
        notify(next);
    }, [stepEdgesKey, onXAxisMetrics]);

    const onPlotReady = useCallback((_: Readonly<Figure>, graphDiv: Readonly<HTMLElement>) => {
        publishXAxisMetrics(graphDiv);
    }, [publishXAxisMetrics]);

    useEffect(() => {
        if (!onXAxisMetrics) {
            lastPublishedMetricsRef.current = null;
            return;
        }
        const shell = plotShellRef.current;
        if (!shell) {
            return;
        }
        const graphDiv = shell.querySelector<HTMLDivElement>(".js-plotly-plot, .plotly-graph-div");
        if (!graphDiv) {
            return;
        }
        publishXAxisMetrics(graphDiv);
        const observer = new ResizeObserver(() => {
            if (resizeFrameRef.current != null) {
                cancelAnimationFrame(resizeFrameRef.current);
            }
            resizeFrameRef.current = requestAnimationFrame(() => {
                resizeFrameRef.current = null;
                publishXAxisMetrics(graphDiv);
            });
        });
        observer.observe(shell);
        return () => {
            observer.disconnect();
            if (resizeFrameRef.current != null) {
                cancelAnimationFrame(resizeFrameRef.current);
                resizeFrameRef.current = null;
            }
        };
    }, [onXAxisMetrics, publishXAxisMetrics]);

    const base = getDefaultPlotLayout(isDarkMode);
    const socColor = isDarkMode ? "rgba(240,240,240,0.75)" : "rgba(0,0,0,0.4)";
    const store = storePlot(view, params);
    const socTime = storeEndTimes(view);
    const penalties = penaltyBars(view, penaltyEnabled(params));
    const hasPenalties = penalties.series.length > 0;
    const hp = stepThrough(view.stepStart, view.horizonEnd, view.hpKw);
    const load = request === null ? null : stepThrough(request.stepStart, request.horizonEnd, request.loadKw);
    const price = request === null ? null : stepThrough(request.stepStart, request.horizonEnd, request.priceUsdMwh);
    const hpMaxKw = Math.max(0, ...view.hpKw);

    const data: Data[] = [
        trace({
            type: "scatter",
            mode: "lines",
            name: "HP",
            x: hp.x,
            y: hp.y,
            xaxis: "x",
            yaxis: "y",
            line: { shape: "hv", color: "rgba(31,119,180,0.6)", width: 1.5 },
            hovertemplate: "%{y:.2f} kW<extra>HP</extra>",
        }),
        ...(load === null ? [] : [trace({
            type: "scatter",
            mode: "lines",
            name: "Load",
            x: load.x,
            y: load.y,
            xaxis: "x",
            yaxis: "y",
            line: { shape: "hv", color: "rgba(214,39,40,0.6)", width: 1.5 },
            hovertemplate: "%{y:.2f} kW<extra>Load</extra>",
        })]),
        ...(price === null ? [] : [trace({
            type: "scatter",
            mode: "lines",
            name: "Electricity price",
            x: price.x,
            y: price.y,
            xaxis: "x",
            yaxis: "y2",
            legend: "legend2",
            line: { shape: "hv", color: "rgba(128,128,128,0.6)", width: 1.5 },
            hovertemplate: "%{y:.1f} $/MWh<extra>Electricity price</extra>",
        })]),
        ...store.bars.map((layer) => trace({
            type: "bar",
            x: store.time,
            y: layer.y,
            base: layer.base,
            width: store.barWidthMs,
            offset: 0,
            xaxis: "x2",
            yaxis: "y3",
            showlegend: false,
            marker: { color: layer.color, line: { width: 0 } },
            text: layer.text,
            textposition: "inside",
            textfont: { color: layer.textColor, size: 9 },
            customdata: layer.temp,
            hovertemplate: "%{customdata:.0f}°F<extra></extra>",
        })),
        ...(view.socPct ? [trace({
            type: "scatter",
            mode: "lines",
            name: "SoC",
            x: socTime,
            y: view.socPct,
            xaxis: "x2",
            yaxis: "y4",
            showlegend: false,
            line: { color: socColor, width: 1.5 },
            hoverinfo: "skip",
        })] : []),
        ...penalties.series.map((series) => trace({
            type: "bar",
            name: series.name,
            x: view.penaltyTime,
            y: series.y,
            base: series.base,
            width: view.barWidthMs,
            xaxis: "x3",
            yaxis: "y5",
            legend: "legend3",
            marker: { color: series.color, line: { width: 0 } },
            hovertemplate: "%{y:.2f}<extra>" + series.name + "</extra>",
        })),
    ];

    const timeAxis = {
        ...base.xaxis,
        showgrid: false,
        showticklabels: true,
        tickformat: "%H:%M",
        tickfont: { size: 10 },
    };
    const height = hasPenalties ? FLO_SUMMARY_HEIGHT : FLO_SUMMARY_HEIGHT_NO_PENALTIES;
    const storeDomain = hasPenalties ? [0.36, 0.64] : [0, 0.48];
    const powerDomain = hasPenalties ? [0.72, 1] : [0.56, 1];
    const layout = {
        ...base,
        height,
        margin: FLO_PLOT_MARGINS,
        barmode: "overlay",
        shapes: request === null
            ? []
            : shapesForHighElecPrice([...request.stepStart, request.horizonEnd], request.priceUsdMwh, isDarkMode),
        title: { ...base.title, text: plotTitle(recommendation, view), x: 0.5, xanchor: "center", font: { ...base.title?.font, size: 12 } },
        xaxis: { ...timeAxis, anchor: "y" },
        xaxis2: { ...timeAxis, anchor: "y3", matches: "x" },
        xaxis3: {
            ...timeAxis,
            anchor: "y5",
            matches: "x",
            title: { text: "Time (America/New_York)", font: { size: 11 }, standoff: 8 },
        },
        yaxis: {
            ...base.yaxis,
            title: { text: "Heating power [kW]" },
            domain: powerDomain,
            showgrid: false,
            ...(hpMaxKw > 0 ? { range: [-0.5, 1.5 * hpMaxKw] } : {}),
        },
        yaxis2: {
            ...base.yaxis2,
            title: { text: "Electricity price [$/MWh]" },
            overlaying: "y",
            side: "right",
            showgrid: false,
            domain: powerDomain,
        },
        yaxis3: {
            ...base.yaxis,
            title: { text: "Storage state" },
            domain: storeDomain,
            range: [0, view.storeLayers ?? 1],
            showticklabels: false,
            ticks: "",
            showgrid: false,
        },
        yaxis4: {
            ...base.yaxis2,
            title: { text: "State of charge [%]" },
            overlaying: "y3",
            side: "right",
            showgrid: false,
            range: [-1, 101],
            domain: storeDomain,
        },
        ...(hasPenalties ? {
            yaxis5: {
                ...base.yaxis,
                title: { text: "Penalty [$]" },
                anchor: "x3",
                domain: [0, 0.28],
                showgrid: false,
                ...(penalties.yRange ? { range: penalties.yRange } : {}),
            },
            legend3: {
                x: 1, y: 0.28, xref: "paper", yref: "paper", xanchor: "right", yanchor: "top",
                bgcolor: "rgba(0,0,0,0)", font: { size: 10 },
            },
        } : {}),
        legend: {
            x: 0, y: 1, xref: "paper", yref: "paper", xanchor: "left", yanchor: "top",
            bgcolor: "rgba(0,0,0,0)", font: { size: 11 },
        },
        legend2: {
            x: 1, y: 1, xref: "paper", yref: "paper", xanchor: "right", yanchor: "top",
            bgcolor: "rgba(0,0,0,0)", font: { size: 11 },
        },
    } as Partial<Layout>;

    return (
        <div ref={plotShellRef} className="plot-div" style={{ width: "100%", height }}>
            <Plot
                data={data}
                layout={layout}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
                onInitialized={onPlotReady}
                onUpdate={onPlotReady}
            />
        </div>
    );
}
