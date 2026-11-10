import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { FLO_SUMMARY_MARGINS } from "./FloPlot";
import { getDefaultPlotLayout } from "./plot-configs";

export interface FloBidSupply {
    priceMwh: number;
    intersection: [number, number];
}

export interface FloBidPlotData {
    pairs: { quantityKwh: number[]; priceMwh: number[] };
    step: { quantityKwh: number[]; priceMwh: number[] };
    forecast: FloBidSupply;
    real: FloBidSupply | null;
    xRange: [number, number];
    xTickQuantitiesKwh: number[];
    yRange: [number, number];
    yTicks: number[];
}

const BID_COLOR = "#1f77b4";
const FORECAST_COLOR = "#ff7f0e";
const REAL_COLOR = "#d62728";
const PLOT_HEIGHT = 480;
/** Same horizontal margins as the summary plot; less top space for a shorter figure. */
const FLO_BID_MARGINS = { ...FLO_SUMMARY_MARGINS, t: 40 };

const trace = (value: object): Data => value as Data;

function supplyLineTrace(
    supply: FloBidSupply,
    xRange: [number, number],
    kind: "expected" | "actual",
    color: string,
): Data {
    const supplyName = `Supply, ${kind} (${Number(supply.priceMwh.toFixed(1))} $/MWh)`;
    return trace({
        type: "scatter",
        mode: "lines",
        name: supplyName,
        x: xRange,
        y: [supply.priceMwh, supply.priceMwh],
        line: { color, width: 1.5 },
        hovertemplate: "%{y:.1f} $/MWh<extra>" + supplyName + "</extra>",
    });
}

function clearingMarkerTrace(supply: FloBidSupply, kind: "expected" | "actual", color: string): Data {
    const [clearingKwh] = supply.intersection;
    const clearingName = `Market clearing, ${kind} (${Number(clearingKwh.toFixed(3))} kWh)`;
    return trace({
        type: "scatter",
        mode: "markers",
        name: clearingName,
        x: [supply.intersection[0]],
        y: [supply.intersection[1]],
        marker: { color, size: 9 },
        hovertemplate: "%{x:.3f} kWh @ %{y:.1f} $/MWh<extra>" + clearingName + "</extra>",
    });
}

export default function FloBidPlot(props: { bid: FloBidPlotData; isDarkMode: boolean }) {
    const { bid, isDarkMode } = props;
    const base = getDefaultPlotLayout(isDarkMode);
    const gridColor = isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

    const data: Data[] = [
        trace({
            type: "scatter",
            mode: "lines",
            name: "Demand (bid)",
            x: bid.step.quantityKwh,
            y: bid.step.priceMwh,
            line: { color: BID_COLOR, width: 2 },
            hoverinfo: "skip",
        }),
        supplyLineTrace(bid.forecast, bid.xRange, "expected", FORECAST_COLOR),
        ...(bid.real ? [supplyLineTrace(bid.real, bid.xRange, "actual", REAL_COLOR)] : []),
        clearingMarkerTrace(bid.forecast, "expected", FORECAST_COLOR),
        ...(bid.real ? [clearingMarkerTrace(bid.real, "actual", REAL_COLOR)] : []),
        trace({
            type: "scatter",
            mode: "markers",
            x: bid.pairs.quantityKwh,
            y: bid.pairs.priceMwh,
            showlegend: false,
            marker: { color: BID_COLOR, size: 7 },
            hovertemplate: "%{x:.3f} kWh @ %{y:.1f} $/MWh<extra>bid</extra>",
        }),
    ];

    const layout = {
        ...base,
        height: PLOT_HEIGHT,
        margin: FLO_BID_MARGINS,
        title: {
            ...base.title,
            text: "Bid",
            x: 0.5,
            xanchor: "center",
            pad: { b: 4 },
            font: { ...base.title?.font, size: 16 },
        },
        xaxis: {
            ...base.xaxis,
            type: "linear",
            range: bid.xRange,
            tickvals: bid.xTickQuantitiesKwh,
            tickformat: ".3~f",
            showgrid: true,
            gridcolor: gridColor,
            zeroline: false,
            title: { text: "Quantity [kWh]", standoff: 8 },
        },
        yaxis: {
            ...base.yaxis,
            range: bid.yRange,
            tickvals: bid.yTicks,
            tickformat: ".1~f",
            gridcolor: gridColor,
            title: { text: "Price [$/MWh]", standoff: 8 },
        },
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
