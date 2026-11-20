import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { FLO_PLOT_MARGINS, floHorizonTimeAxis, getDefaultPlotLayout } from "./plot-configs";
import type { FloSummaryXAxisMetrics } from "./FloPlot";
import type { FloParamsView } from "./flo-path-view";
import { stepThrough } from "./flo-path-view";

const PLOT_TITLE = "Heat pump COP (shortest path)";
const PLOT_HEIGHT = 380;
const FLO_COP_MARGINS = { ...FLO_PLOT_MARGINS, t: 40, b: 72, r: 88 };
const COP_COLOR = "#d62728";
const LWT_COLOR = "rgba(128,128,128,0.85)";

const trace = (value: object): Data => value as Data;

export default function FloPathCopPlot(props: {
    request: FloParamsView;
    cop: number[];
    avgLwtF: number[];
    isDarkMode: boolean;
    summaryTimeAxis?: FloSummaryXAxisMetrics | null;
}) {
    const { request, cop, avgLwtF, isDarkMode, summaryTimeAxis } = props;
    const base = getDefaultPlotLayout(isDarkMode);
    const timeAxis = floHorizonTimeAxis(base, { showTitle: true });
    const timeAxisRangeAndTicks = {
        ...(summaryTimeAxis?.timeRange ? { range: summaryTimeAxis.timeRange } : {}),
        ...(summaryTimeAxis?.timeTickvals?.length
            ? { tickmode: "array" as const, tickvals: summaryTimeAxis.timeTickvals }
            : {}),
    };

    const copStep = stepThrough(request.stepStart, request.horizonEnd, cop);
    const lwtStep = stepThrough(request.stepStart, request.horizonEnd, avgLwtF);

    const data: Data[] = [
        trace({
            type: "scatter",
            mode: "lines",
            name: "COP",
            x: copStep.x,
            y: copStep.y,
            xaxis: "x",
            yaxis: "y",
            line: { shape: "hv", color: COP_COLOR, width: 2 },
            hovertemplate: "%{y:.2f}<extra>COP</extra>",
        }),
        trace({
            type: "scatter",
            mode: "lines",
            name: "Avg LWT",
            x: lwtStep.x,
            y: lwtStep.y,
            xaxis: "x",
            yaxis: "y2",
            line: { shape: "hv", color: LWT_COLOR, width: 2, dash: "dash" },
            hovertemplate: "%{y:.1f} °F<extra>Avg LWT</extra>",
        }),
    ];

    const layout = {
        ...base,
        height: PLOT_HEIGHT,
        margin: FLO_COP_MARGINS,
        title: {
            ...base.title,
            text: PLOT_TITLE,
            x: 0.5,
            xanchor: "center",
            pad: { b: 2 },
            font: { ...base.title?.font, size: 16 },
        },
        xaxis: {
            ...timeAxis,
            ...timeAxisRangeAndTicks,
        },
        yaxis: {
            ...base.yaxis,
            title: { text: "COP", standoff: 8 },
            showgrid: false,
            autorange: true,
            fixedrange: false,
        },
        yaxis2: {
            ...base.yaxis2,
            title: { text: "Avg LWT [°F]", standoff: 8 },
            overlaying: "y",
            side: "right",
            showgrid: false,
            autorange: true,
            fixedrange: false,
        },
        legend: {
            x: 0,
            y: 1,
            xref: "paper",
            yref: "paper",
            xanchor: "left",
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
        </div>
    );
}