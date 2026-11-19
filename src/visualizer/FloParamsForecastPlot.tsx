import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { FLO_PLOT_MARGINS, getDefaultPlotLayout } from "./plot-configs";
import type { FloParamsView } from "./flo-path-view";
import { stepThrough } from "./flo-path-view";
/** Matches the load trace on the FLO summary plot. */
const FORECAST_RED = "#d62728";

function lineColors(isDarkMode: boolean): { forecast: string; actual: string } {
    return {
        forecast: FORECAST_RED,
        actual: isDarkMode ? "#8a8a8a" : "#b3b3b3",
    };
}

const PLOT_HEIGHT = 480;
const FLO_FORECAST_MARGINS = { ...FLO_PLOT_MARGINS, t: 40 };

const trace = (value: object): Data => value as Data;

export type FloParamsForecastKind = "load" | "rswt";

const FORECAST_SPECS: Record<
    FloParamsForecastKind,
    { title: string; yTitle: string; color: string; hover: string; values: (request: FloParamsView) => number[] }
> = {
    load: {
        title: "Load forecast",
        yTitle: "Heating load [kW]",
        color: "gray",
        hover: "%{y:.2f} kW<extra>Load forecast</extra>",
        values: (request) => request.loadKw,
    },
    rswt: {
        title: "RSWT forecast",
        yTitle: "RSWT [°F]",
        color: "gray",
        hover: "%{y:.1f} °F<extra>RSWT forecast</extra>",
        values: (request) => request.rswtF,
    },
};

/** Step forecast from ``flo.params`` on the request horizon; uses the
 *  same margins and time range as the FLO summary plot so the tracks
 *  line up in width with the panels above. */
export default function FloParamsForecastPlot(props: {
    kind: FloParamsForecastKind;
    request: FloParamsView;
    isDarkMode: boolean;
    /** Measured load on the request step grid; null where that hour has no samples. */
    actualKw?: (number | null)[] | null;
}) {
    const { kind, request, isDarkMode, actualKw } = props;
    const spec = FORECAST_SPECS[kind];
    const base = getDefaultPlotLayout(isDarkMode);
    const series = stepThrough(request.stepStart, request.horizonEnd, spec.values(request));
    const lines = lineColors(isDarkMode);
    const showActual = kind === "load"
        && actualKw != null
        && actualKw.length === request.loadKw.length
        && actualKw.some((value) => value !== null);
    const actual = showActual
        ? stepThrough(request.stepStart, request.horizonEnd, actualKw)
        : null;

    const forecastTrace = trace({
        type: "scatter",
        mode: "lines",
        name: showActual ? "Forecast" : spec.title,
        x: series.x,
        y: series.y,
        line: {
            shape: "hv",
            color: lines.forecast,
            width: 2,
            dash: "dash",
        },
        hovertemplate: spec.hover,
    });
    const actualTrace = actual === null ? null : trace({
        type: "scatter",
        mode: "lines",
        name: "Actual",
        x: actual.x,
        y: actual.y,
        connectgaps: false,
        line: { shape: "hv", color: lines.actual, width: 2 },
        hovertemplate: "%{y:.2f} kW<extra>Actual</extra>",
    });
    // Actual first so Plotly draws the forecast trace on top.
    const data: Data[] = actualTrace === null
        ? [forecastTrace]
        : [actualTrace, forecastTrace];

    const layout = {
        ...base,
        height: PLOT_HEIGHT,
        margin: FLO_FORECAST_MARGINS,
        title: {
            ...base.title,
            text: spec.title,
            x: 0.5,
            xanchor: "center",
            pad: { b: 4 },
            font: { ...base.title?.font, size: 16 },
        },
        xaxis: {
            ...base.xaxis,
            type: "date",
            range: [request.stepStart[0], request.horizonEnd],
            tickformat: "%H:%M",
            showgrid: false,
            zeroline: false,
            title: {
                text: "Time (America/New_York)",
                standoff: 8,
                font: { size: 11 },
            },
        },
        yaxis: {
            ...base.yaxis,
            title: { text: spec.yTitle, standoff: 8 },
            showgrid: false,
        },
        showlegend: showActual,
        legend: showActual ? {
            x: 1,
            y: 1,
            xref: "paper",
            yref: "paper",
            xanchor: "right",
            yanchor: "top",
            bgcolor: "rgba(0,0,0,0)",
            font: { size: 11 },
        } : undefined,
    } as Partial<Layout>;

    return (
        <div className="plot-div" style={{ width: "100%", height: PLOT_HEIGHT }}>
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