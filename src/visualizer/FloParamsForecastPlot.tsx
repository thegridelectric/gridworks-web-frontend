import { useState } from "react";
import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { DIST_ENERGY_RHO } from "./dist-load";
import { FLO_PLOT_MARGINS, floHorizonTimeAxis, getDefaultPlotLayout } from "./plot-configs";
import type { FloSummaryXAxisMetrics } from "./FloPlot";
import type { FloParamsView } from "./flo-path-view";
import { stepThrough } from "./flo-path-view";

/** Matches the load trace on the FLO summary plot. */
const FORECAST_RED = "#d62728";
const COMBINED_TITLE = "Load and RSWT forecasts";

function lineColors(isDarkMode: boolean): { forecast: string; actual: string } {
    return {
        forecast: FORECAST_RED,
        actual: isDarkMode ? "rgba(138,138,138,0.45)" : "rgba(179,179,179,0.45)",
    };
}

const PLOT_HEIGHT = 500;
const FLO_FORECAST_MARGINS = { ...FLO_PLOT_MARGINS, t: 40, b: 72 };
/** Paper gap between the load and RSWT panels. */
const PANEL_GAP = 0.06;
const RSWT_DOMAIN: [number, number] = [0, 0.5 - PANEL_GAP / 2];
const LOAD_DOMAIN: [number, number] = [0.5 + PANEL_GAP / 2, 1];

const trace = (value: object): Data => value as Data;

function loadForecastRmseKw(forecastKw: number[], actualKw: (number | null)[]): number | null {
    let sumSq = 0;
    let n = 0;
    for (let i = 0; i < forecastKw.length; i += 1) {
        const actual = actualKw[i];
        if (actual === null) continue;
        const err = actual - forecastKw[i];
        sumSq += err * err;
        n += 1;
    }
    return n === 0 ? null : Math.sqrt(sumSq / n);
}

/** Load and RSWT step forecasts from ``flo.params`` on a shared time axis. */
export default function FloParamsForecastPlot(props: {
    request: FloParamsView;
    isDarkMode: boolean;
    /** Measured load on the request step grid; null where that hour has no samples. */
    actualKw?: (number | null)[] | null;
    /** Time ticks from the FLO summary plot so the horizon aligns. */
    summaryTimeAxis?: FloSummaryXAxisMetrics | null;
}) {
    const { request, isDarkMode, actualKw, summaryTimeAxis } = props;
    const [rho, setRho] = useState(DIST_ENERGY_RHO);
    const scaledActual = actualKw?.map((value) => (value === null ? null : value * rho)) ?? null;
    const base = getDefaultPlotLayout(isDarkMode);
    const lines = lineColors(isDarkMode);
    const timeAxis = floHorizonTimeAxis(base);
    const timeAxisRangeAndTicks = {
        ...(summaryTimeAxis?.timeRange ? { range: summaryTimeAxis.timeRange } : {}),
        ...(summaryTimeAxis?.timeTickvals?.length
            ? { tickmode: "array" as const, tickvals: summaryTimeAxis.timeTickvals }
            : {}),
    };

    const loadForecast = stepThrough(request.stepStart, request.horizonEnd, request.loadKw);
    const rswtForecast = stepThrough(request.stepStart, request.horizonEnd, request.rswtF);

    const showActual = scaledActual != null
        && scaledActual.length === request.loadKw.length
        && scaledActual.some((value) => value !== null);
    const actual = showActual
        ? stepThrough(request.stepStart, request.horizonEnd, scaledActual)
        : null;
    const rmseKw = scaledActual
        ? loadForecastRmseKw(request.loadKw, scaledActual)
        : null;
    const actualLegendName = rmseKw === null
        ? "Actual"
        : `Actual (RMSE: ${rmseKw.toFixed(2)} kW)`;
    const loadPlotMax = Math.max(
        0,
        ...request.loadKw,
        ...(scaledActual?.filter((value): value is number => value !== null) ?? []),
    );

    const data: Data[] = [
        ...(actual === null ? [] : [trace({
            type: "scatter",
            mode: "lines",
            name: actualLegendName,
            x: actual.x,
            y: actual.y,
            xaxis: "x",
            yaxis: "y",
            connectgaps: false,
            line: { shape: "hv", color: lines.actual, width: 2 },
            hovertemplate: "%{y:.2f} kW<extra>Actual</extra>",
        })]),
        trace({
            type: "scatter",
            mode: "lines",
            name: "Load forecast",
            x: loadForecast.x,
            y: loadForecast.y,
            xaxis: "x",
            yaxis: "y",
            showlegend: showActual,
            line: { shape: "hv", color: lines.forecast, width: 2, dash: "dash" },
            hovertemplate: "%{y:.2f} kW<extra>Load forecast</extra>",
        }),
        trace({
            type: "scatter",
            mode: "lines",
            name: "RSWT forecast",
            x: rswtForecast.x,
            y: rswtForecast.y,
            xaxis: "x2",
            yaxis: "y2",
            legend: "legend2",
            line: { shape: "hv", color: lines.forecast, width: 2, dash: "dash" },
            hovertemplate: "%{y:.1f} °F<extra>RSWT forecast</extra>",
        }),
    ];

    const layout = {
        ...base,
        height: PLOT_HEIGHT,
        margin: FLO_FORECAST_MARGINS,
        title: {
            ...base.title,
            text: COMBINED_TITLE,
            x: 0.5,
            xanchor: "center",
            pad: { b: 2 },
            font: { ...base.title?.font, size: 16 },
        },
        xaxis: {
            ...timeAxis,
            anchor: "y",
            showticklabels: false,
            ...timeAxisRangeAndTicks,
        },
        xaxis2: {
            ...floHorizonTimeAxis(base, { showTitle: true }),
            anchor: "y2",
            matches: "x",
            ...timeAxisRangeAndTicks,
        },
        yaxis: {
            ...base.yaxis,
            domain: LOAD_DOMAIN,
            title: { text: "Heating load [kW]", standoff: 8 },
            showgrid: false,
            range: [0, loadPlotMax > 0 ? loadPlotMax * 1.1 : 1],
        },
        yaxis2: {
            ...base.yaxis,
            domain: RSWT_DOMAIN,
            title: { text: "RSWT [°F]", standoff: 8 },
            showgrid: false,
        },
        showlegend: true,
        ...(showActual ? {
            legend: {
                x: 1,
                y: 1,
                xref: "paper",
                yref: "paper",
                xanchor: "right",
                yanchor: "top",
                bgcolor: "rgba(0,0,0,0)",
                font: { size: 11 },
            },
        } : {}),
        legend2: {
            x: 1,
            y: RSWT_DOMAIN[1],
            xref: "paper",
            yref: "paper",
            xanchor: "right",
            yanchor: "top",
            bgcolor: "rgba(0,0,0,0)",
            font: { size: 11 },
        },
    } as Partial<Layout>;

    return (
        <div className="plot-div" style={{ width: "100%" }}>
            <div style={{ width: "100%", height: PLOT_HEIGHT }}>
                <Plot
                    data={data}
                    layout={layout}
                    config={{ displayModeBar: false, responsive: true }}
                    style={{ width: "100%", height: "100%" }}
                    useResizeHandler
                />
            </div>
            <label className="flo-rho-control">
                <span className="flo-rho-control__label">ρ {rho.toFixed(2)}</span>
                <input
                    type="range"
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    value={rho}
                    aria-label="Energy ratio rho"
                    onChange={(event) => setRho(Number(event.currentTarget.value))}
                />
            </label>
        </div>
    );
}