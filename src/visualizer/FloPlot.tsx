import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { getDefaultPlotLayout } from "./plot-configs";

export interface FloPlotLayer {
    y: number[];
    base: number[];
    color: string[];
    text: string[];
    textColor: string[];
    temp: number[];
}

export interface FloPlotSeries {
    name: string;
    color: string;
    y: number[];
    base: number[];
}

export interface FloPlotData {
    siteId: string;
    subtitle: string;
    numLayers: number;
    power: {
        time: string[];
        hpKw: number[];
        loadKw: number[];
        priceUsdMwh: number[];
        priceNormalizedUsdMwh: number[];
        thermalPriceUsdMwh: number[];
        yRange: [number, number] | null;
    };
    storage: {
        time: string[];
        widthMs: number[];
        layers: FloPlotLayer[];
        soc: number[];
    };
    penalty: {
        time: string[];
        widthMs: number[];
        series: FloPlotSeries[];
        yRange: [number, number] | null;
    };
}

const trace = (value: object): Data => value as Data;

export default function FloPlot(props: { plot: FloPlotData; isDarkMode: boolean }) {
    const { plot, isDarkMode } = props;
    const base = getDefaultPlotLayout(isDarkMode);
    const socColor = isDarkMode ? "rgba(240,240,240,0.75)" : "rgba(0,0,0,0.4)";

    const data: Data[] = [
        trace({
            type: "scatter",
            mode: "lines",
            name: "HP",
            x: plot.power.time,
            y: plot.power.hpKw,
            xaxis: "x",
            yaxis: "y",
            line: { shape: "hv", color: "rgba(31,119,180,0.6)", width: 1.5 },
            hovertemplate: "%{y:.2f} kW<extra>HP</extra>",
        }),
        trace({
            type: "scatter",
            mode: "lines",
            name: "Load",
            x: plot.power.time,
            y: plot.power.loadKw,
            xaxis: "x",
            yaxis: "y",
            line: { shape: "hv", color: "rgba(214,39,40,0.6)", width: 1.5 },
            hovertemplate: "%{y:.2f} kW<extra>Load</extra>",
        }),
        trace({
            type: "scatter",
            mode: "lines",
            name: "Thermal price",
            x: plot.power.time,
            y: plot.power.thermalPriceUsdMwh,
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
            x: plot.power.time,
            y: plot.power.priceNormalizedUsdMwh,
            customdata: plot.power.priceUsdMwh,
            xaxis: "x",
            yaxis: "y2",
            legend: "legend2",
            visible: "legendonly",
            line: { shape: "hv", color: "rgba(190,190,190,0.55)", width: 1.5 },
            hovertemplate: "%{customdata:.1f} $/MWh<extra>Electricity price</extra>",
        }),
        ...plot.storage.layers.map((layer) => trace({
            type: "bar",
            x: plot.storage.time,
            y: layer.y,
            base: layer.base,
            width: plot.storage.widthMs,
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
        trace({
            type: "scatter",
            mode: "lines",
            name: "SoC",
            x: plot.storage.time,
            y: plot.storage.soc,
            xaxis: "x2",
            yaxis: "y4",
            showlegend: false,
            line: { color: socColor, width: 1.5 },
            hoverinfo: "skip",
        }),
        ...plot.penalty.series.map((series) => trace({
            type: "bar",
            name: series.name,
            x: plot.penalty.time,
            y: series.y,
            base: series.base,
            width: plot.penalty.widthMs,
            xaxis: "x3",
            yaxis: "y5",
            legend: "legend3",
            marker: { color: series.color, line: { width: 0 } },
            hovertemplate: "%{y:.2f}<extra>" + series.name + "</extra>",
        })),
    ];

    const layout = {
        ...base,
        height: 820,
        margin: { t: 64, b: 68, l: 70, r: 78 },
        barmode: "overlay",
        title: {
            ...base.title,
            text: plot.subtitle,
            x: 0.5,
            xanchor: "center",
            font: { ...base.title?.font, size: 12 },
        },
        xaxis: {
            ...base.xaxis,
            anchor: "y",
            showgrid: false,
            showticklabels: true,
            tickformat: "%H:%M",
            tickfont: { size: 10 },
        },
        xaxis2: {
            ...base.xaxis,
            anchor: "y3",
            matches: "x",
            showgrid: false,
            showticklabels: true,
            tickformat: "%H:%M",
            tickfont: { size: 10 },
        },
        xaxis3: {
            ...base.xaxis,
            anchor: "y5",
            matches: "x",
            showgrid: false,
            showticklabels: true,
            tickformat: "%H:%M",
            tickfont: { size: 10 },
            title: { text: "Time (America/New_York)", font: { size: 11 }, standoff: 8 },
        },
        yaxis: {
            ...base.yaxis,
            title: { text: "Heating power [kW]" },
            domain: [0.72, 1],
            showgrid: false,
            ...(plot.power.yRange ? { range: plot.power.yRange } : {}),
        },
        yaxis2: {
            ...base.yaxis2,
            title: { text: "Thermal price [$/MWh_th]" },
            overlaying: "y",
            side: "right",
            showgrid: false,
            domain: [0.72, 1],
        },
        yaxis3: {
            ...base.yaxis,
            title: { text: "Storage state" },
            domain: [0.36, 0.64],
            range: [0, plot.numLayers],
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
            domain: [0.36, 0.64],
        },
        yaxis5: {
            ...base.yaxis,
            title: { text: "Penalty [$]" },
            anchor: "x3",
            domain: [0, 0.28],
            showgrid: false,
            ...(plot.penalty.yRange ? { range: plot.penalty.yRange } : {}),
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
        legend2: {
            x: 1,
            y: 1,
            xref: "paper",
            yref: "paper",
            xanchor: "right",
            yanchor: "top",
            bgcolor: "rgba(0,0,0,0)",
            font: { size: 11 },
        },
        legend3: {
            x: 1,
            y: 0.28,
            xref: "paper",
            yref: "paper",
            xanchor: "right",
            yanchor: "top",
            bgcolor: "rgba(0,0,0,0)",
            font: { size: 10 },
        },
    } as Partial<Layout>;

    return (
        <div className="plot-div" style={{ width: "100%", height: 820 }}>
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
