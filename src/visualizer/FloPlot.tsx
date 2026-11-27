import { useCallback, useEffect, useRef } from "react";
import Plot from "react-plotly.js";
import type { Figure } from "react-plotly.js";
import type { Data, Datum, Layout, Shape } from "plotly.js";
import type { AnyFloRecommendation } from "../sema/types/AnyFloRecommendation";
import type { AnyFloParams } from "../sema/types/AnyFloParams";
import { DateTime } from "luxon";
import { FLO_PLOT_MARGINS, floHorizonTimeAxis, getDefaultPlotLayout } from "./plot-configs";
import { flatDeliveryPrices, onPeakShapes, type TouTariff } from "./tou-tariff";
import {
    paramsView,
    pathView,
    penaltyBars,
    plotTitle,
    stepThrough,
    storeEndTimes,
    storePlot,
    type PenaltySeriesEnabled,
} from "./flo-path-view";
import { unmetLoadKnobs } from "./flo-rerun-tuning";

export interface FloSummaryXAxisMetrics {
    offsetPx: number;
    lengthPx: number;
    stepCount: number;
    /** Tick positions from the summary plot's time axis (for matching downstream plots). */
    timeTickvals?: Datum[];
    timeRange?: [Datum, Datum];
}

type PlotlyAxisLayout = {
    _offset?: number;
    _length?: number;
    range?: [Datum, Datum];
    tickvals?: Datum[];
    d2p?: (value: string | number) => number;
};

type PlotlyGraphDiv = HTMLDivElement & {
    _fullLayout?: {
        xaxis?: PlotlyAxisLayout;
    };
};

const METRICS_EPSILON_PX = 0.05;

function datumArraysEqual(a: Datum[] | undefined, b: Datum[] | undefined): boolean {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    return a.every((value, i) => value === b[i]);
}

function timeRangesEqual(
    a: [Datum, Datum] | undefined,
    b: [Datum, Datum] | undefined,
): boolean {
    if (a === b) return true;
    if (!a || !b) return !a && !b;
    return a[0] === b[0] && a[1] === b[1];
}

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
        && datumArraysEqual(a.timeTickvals, b.timeTickvals)
        && timeRangesEqual(a.timeRange, b.timeRange)
    );
}

function parseAxisTime(value: Datum): number {
    if (value === null || value === undefined) {
        return Number.NaN;
    }
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string") {
        return Date.parse(value.replace(" ", "T"));
    }
    return Number.NaN;
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

    const range = axis.range?.length === 2
        ? [axis.range[0], axis.range[1]] as [Datum, Datum]
        : undefined;
    const timeTickvals = axis.tickvals?.length ? [...axis.tickvals] : undefined;

    return {
        offsetPx: graphLeftInShellContent(plotShell, graphDiv) + axis._offset + startPx,
        lengthPx: endPx - startPx,
        stepCount,
        timeTickvals,
        timeRange: range,
    };
}

const trace = (value: object): Data => value as Data;

function penaltyEnabled(params: AnyFloParams | null): PenaltySeriesEnabled {
    const tuning = params?.Tuning;
    if (!tuning || tuning.TypeName !== "flo.tuning.bruce") {
        return { rswt: true, unmet: true, stability: true, shortCycle: true, terminal: true };
    }
    return {
        rswt: tuning.RswtPenaltyEnabled,
        unmet: unmetLoadKnobs(tuning)?.UnmetLoadPenaltyEnabled ?? true,
        stability: tuning.StabilityPenaltyEnabled,
        shortCycle: tuning.ShortCyclePenaltyEnabled,
        terminal: tuning.TerminalCostEnabled,
    };
}

/** Plot height; y-axis domains leave 0.08 paper gaps between the three panels. */
const FLO_SUMMARY_HEIGHT = 1250;
const FLO_SUMMARY_HEIGHT_NO_PENALTIES = 900;

/** The tariff's on-peak hours as bands on the power panel, the price
 *  panel's pink. */
function onPeakShapesOnPowerPanel(tariff: TouTariff, stepStartS: number[], stepMinutes: number[]): Partial<Shape>[] {
    if (stepStartS.length === 0) return [];
    const start = DateTime.fromSeconds(stepStartS[0]);
    const end = DateTime.fromSeconds(stepStartS[stepStartS.length - 1] + stepMinutes[stepMinutes.length - 1] * 60);
    return onPeakShapes(tariff, start, end, "y domain");
}

/** One pair's path of a FLO recommendation in the three panels bruce's
 *  visualizer draws: heating power and, where the request is known, the
 *  forecast load and the electricity price less the tariff's on-peak
 *  delivery premium, with the tariff's on-peak hours shaded; the store's
 *  layers by temperature with its state of charge; and the optimizer's
 *  penalties. With no tariff the price is drawn as the optimizer saw it
 *  and no hour is shaded. `onXAxisMetrics` hears where the horizon sits
 *  on the page, so controls can line up with the steps. */
export default function FloPlot(props: {
    recommendation: AnyFloRecommendation;
    params: AnyFloParams | null;
    tariff: TouTariff | null;
    pairIndex: number;
    isDarkMode: boolean;
    onXAxisMetrics?: (metrics: FloSummaryXAxisMetrics | null) => void;
}) {
    const { recommendation, params, tariff, pairIndex, isDarkMode, onXAxisMetrics } = props;
    const view = pathView(recommendation, pairIndex);
    const request = params === null ? null : paramsView(params);
    const priceUsdMwh = request === null
        ? null
        : tariff === null ? request.priceUsdMwh : flatDeliveryPrices(tariff, request.stepStartS, request.priceUsdMwh);
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
    const price = request === null || priceUsdMwh === null ? null : stepThrough(request.stepStart, request.horizonEnd, priceUsdMwh);
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
            hovertemplate: "%{x|%H:%M}: %{y:.2f} kW<extra>HP</extra>",
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
            hovertemplate: "%{x|%H:%M}: %{y:.2f} kW<extra>Load</extra>",
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
            hovertemplate: "%{x|%H:%M}: %{y:.1f} $/MWh<extra>Electricity price</extra>",
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
            hovertemplate: "%{x|%H:%M}: %{customdata:.0f}°F<extra></extra>",
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

    const timeAxis = floHorizonTimeAxis(base);
    const height = hasPenalties ? FLO_SUMMARY_HEIGHT : FLO_SUMMARY_HEIGHT_NO_PENALTIES;
    const storeDomain = hasPenalties ? [0.36, 0.64] : [0, 0.48];
    const powerDomain = hasPenalties ? [0.72, 1] : [0.56, 1];
    const layout = {
        ...base,
        height,
        margin: FLO_PLOT_MARGINS,
        barmode: "overlay",
        shapes: request === null || params === null || tariff === null
            ? []
            : onPeakShapesOnPowerPanel(tariff, request.stepStartS, params.StepDurationMinutes),
        title: { ...base.title, text: plotTitle(recommendation, view), x: 0.5, xanchor: "center", font: { ...base.title?.font, size: 12 } },
        xaxis: { ...timeAxis, anchor: "y" },
        xaxis2: { ...timeAxis, anchor: "y3", matches: "x" },
        xaxis3: {
            ...floHorizonTimeAxis(base, { showTitle: true }),
            anchor: "y5",
            matches: "x",
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
