import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import type { AnyFloRecommendation } from "../sema/types/AnyFloRecommendation";
import type { FloParams } from "../sema/types/FloParams";
import { getDefaultPlotLayout } from "./plot-configs";
import { paramsView, pathView, plotTitle, temperatureColor, temperatureTextColor } from "./flo-path-view";

const trace = (value: object): Data => value as Data;

// Matplotlib's tab10 colors, as bruce's visualizer draws the penalties.
const PENALTY_COLORS: Record<string, string> = {
    "RSWT penalty": "rgba(255,127,14,0.7)",
    "Stability penalty": "rgba(148,103,189,0.7)",
    "Short-cycle penalty": "rgba(23,190,207,0.7)",
};
const TERMINAL_COLOR = "rgba(44,160,44,0.7)";

/** One pair's path of a FLO recommendation in three bands sharing the
 *  time axis, as bruce's own visualizer draws it: heating power with,
 *  where the slot's request is known, the forecast load and the thermal
 *  price; the store's layers by temperature with its state of charge;
 *  and the optimizer's penalties with the terminal cost, where the word
 *  states them. */
export default function FloPlot(props: {
    recommendation: AnyFloRecommendation;
    params: FloParams | null;
    pairIndex: number;
    isDarkMode: boolean;
}) {
    const { recommendation, params, pairIndex, isDarkMode } = props;
    const view = pathView(recommendation, pairIndex);
    const request = params === null ? null : paramsView(params);
    const base = getDefaultPlotLayout(isDarkMode);
    const socColor = isDarkMode ? "rgba(240,240,240,0.75)" : "rgba(0,0,0,0.4)";
    const hasPenalties = view.penalties.length > 0;
    const lastStep = view.stepStart.length - 1;
    const stackedTop = view.penalties.length > 0
        ? view.penalties[view.penalties.length - 1].base[lastStep] + view.penalties[view.penalties.length - 1].usd[lastStep]
        : 0;
    const terminalName = view.terminalCostUsd === null ? null
        : view.terminalCostPct === null ? "Terminal cost"
            : `Terminal cost (${view.terminalCostPct.toFixed(0)}% of max)`;

    const data: Data[] = [
        trace({
            type: "scatter",
            mode: "lines",
            name: "HP",
            x: view.stepStart,
            y: view.hpKw,
            xaxis: "x",
            yaxis: "y",
            line: { shape: "hv", color: "rgba(31,119,180,0.6)", width: 1.5 },
            hovertemplate: "%{y:.2f} kW<extra>HP</extra>",
        }),
        ...(request === null ? [] : [
            trace({
                type: "scatter",
                mode: "lines",
                name: "Load",
                x: request.stepStart,
                y: request.loadKw,
                xaxis: "x",
                yaxis: "y",
                line: { shape: "hv", color: "rgba(214,39,40,0.6)", width: 1.5 },
                hovertemplate: "%{y:.2f} kW<extra>Load</extra>",
            }),
            trace({
                type: "scatter",
                mode: "lines",
                name: "Thermal price",
                x: request.stepStart,
                y: request.thermalPriceUsdMwh,
                xaxis: "x",
                yaxis: "y2",
                legend: "legend2",
                line: { shape: "hv", color: "rgba(128,128,128,0.6)", width: 1.5 },
                hovertemplate: "%{y:.1f} $/MWh_th<extra>Thermal price</extra>",
            }),
            trace({
                type: "scatter",
                mode: "lines",
                name: "Elec price (normalized)",
                x: request.stepStart,
                y: request.priceNormalizedUsdMwh,
                customdata: request.priceUsdMwh,
                xaxis: "x",
                yaxis: "y2",
                legend: "legend2",
                visible: "legendonly",
                line: { shape: "hv", color: "rgba(190,190,190,0.55)", width: 1.5 },
                hovertemplate: "%{customdata:.1f} $/MWh<extra>Electricity price</extra>",
            }),
        ]),
        ...view.bands.map((band) => trace({
            type: "bar",
            name: band.name,
            x: view.stepStart,
            y: band.layers,
            base: band.base,
            width: view.stepWidthMs,
            offset: 0,
            xaxis: "x2",
            yaxis: "y3",
            showlegend: false,
            marker: { color: band.tempF.map((t) => temperatureColor(t)), line: { width: 0 } },
            text: band.tempF.map((t, i) => (band.layers[i] > 0 ? t.toFixed(0) : "")),
            textposition: "inside",
            textangle: 90,
            insidetextanchor: "middle",
            textfont: { color: band.tempF.map((t) => temperatureTextColor(t)), size: 9 },
            customdata: band.tempF,
            hovertemplate: "%{customdata:.0f}°F<extra>" + band.name + "</extra>",
        })),
        ...(view.socPct ? [trace({
            type: "scatter",
            mode: "lines",
            name: "SoC",
            x: view.stepStart,
            y: view.socPct,
            xaxis: "x2",
            yaxis: "y4",
            showlegend: false,
            line: { color: socColor, width: 1.5 },
            hovertemplate: "%{y:.0f}%<extra>SoC</extra>",
        })] : []),
        ...view.penalties.map((series) => trace({
            type: "bar",
            name: series.name,
            x: view.stepStart,
            y: series.usd,
            base: series.base,
            width: view.stepWidthMs,
            offset: 0,
            xaxis: "x3",
            yaxis: "y5",
            legend: "legend3",
            marker: { color: PENALTY_COLORS[series.name], line: { width: 0 } },
            hovertemplate: "%{y:.2f} $<extra>" + series.name + "</extra>",
        })),
        ...(view.terminalCostUsd === null ? [] : [trace({
            type: "bar",
            name: terminalName,
            x: [view.stepStart[lastStep]],
            y: [view.terminalCostUsd],
            base: [stackedTop],
            width: [view.stepWidthMs[lastStep]],
            offset: 0,
            xaxis: "x3",
            yaxis: "y5",
            legend: "legend3",
            marker: { color: TERMINAL_COLOR, line: { width: 0 } },
            hovertemplate: "%{y:.2f} $<extra>" + terminalName + "</extra>",
        })]),
    ];

    const timeAxis = {
        ...base.xaxis,
        showgrid: false,
        showticklabels: true,
        tickformat: "%H:%M",
        tickfont: { size: 10 },
    };
    const height = hasPenalties ? 820 : 600;
    const storeDomain = hasPenalties ? [0.36, 0.64] : [0, 0.48];
    const powerDomain = hasPenalties ? [0.72, 1] : [0.56, 1];
    const layout = {
        ...base,
        height,
        margin: { t: 64, b: 68, l: 70, r: 78 },
        barmode: "overlay",
        title: { ...base.title, text: plotTitle(recommendation, view), x: 0.5, xanchor: "center", font: { ...base.title?.font, size: 12 } },
        xaxis: { ...timeAxis, anchor: "y" },
        xaxis2: { ...timeAxis, anchor: "y3", matches: "x" },
        xaxis3: {
            ...timeAxis,
            anchor: "y5",
            matches: "x",
            title: { text: `Time (America/New_York), from ${view.slotStart}`, font: { size: 11 }, standoff: 8 },
        },
        yaxis: {
            ...base.yaxis,
            title: { text: "Heating power [kW]" },
            domain: powerDomain,
            showgrid: false,
            rangemode: "tozero",
        },
        yaxis2: {
            ...base.yaxis2,
            title: { text: "Thermal price [$/MWh_th]" },
            overlaying: "y",
            side: "right",
            showgrid: false,
            rangemode: "tozero",
            domain: powerDomain,
        },
        yaxis3: {
            ...base.yaxis,
            title: { text: view.storeLayers === null ? "Storage state (not at version 000)" : "Storage state" },
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
                rangemode: "tozero",
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
        <div className="plot-div" style={{ width: "100%", height }}>
            <Plot
                data={data}
                layout={layout}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
            />
        </div>
    );
}
