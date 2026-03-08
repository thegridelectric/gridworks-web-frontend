import type { Shape } from "plotly.js";
import type { ReadingsData } from "./types";

export const TEMP_HOVER_TEMPLATE = '%{x|%H:%M:%S} | %{y:.1f}°F<extra></extra>';
export const KW_HOVER_TEMPLATE = '%{x|%H:%M:%S} | %{y:.1f} kW<extra></extra>';
export const KWx10_HOVER_TEMPLATE = '%{x|%H:%M:%S} | %{y:.1f}/10 kW<extra></extra>';
export const KWx100_HOVER_TEMPLATE = '%{x|%H:%M:%S} | %{y:.1f}/100 kW<extra></extra>';
export const GPM_HOVER_TEMPLATE = '%{x|%H:%M:%S} | %{y:.1f} GPM<extra></extra>';
export type HoverTemplate = typeof TEMP_HOVER_TEMPLATE | typeof KW_HOVER_TEMPLATE | typeof KWx10_HOVER_TEMPLATE | typeof KWx100_HOVER_TEMPLATE | typeof GPM_HOVER_TEMPLATE;

interface DataOptions {
    name: string,
    readingsData: ReadingsData
    y: number[] | undefined,
    isYAxis2?: boolean,
    lineColor: string
    showMarkers: boolean,
    hoverTemplate: HoverTemplate,
    isLegendOnly?: boolean,
}

export function getDefaultPlotlyData(options: DataOptions): Partial<Plotly.PlotData> {
    return {
        name: options.name,
        x: options.readingsData.times,
        y: options.y,
        yaxis: options.isYAxis2 ? 'y2' : 'y',
        mode: options.showMarkers ? 'lines+markers' : 'lines',
        opacity: 0.7,
        line: {
            color: options.lineColor,
            dash: 'solid',
            shape: 'hv'
        },
        hovertemplate: options.hoverTemplate,
        visible: options.isLegendOnly ? 'legendonly' : true
    };
}

interface LayoutOptions {
    title: string,
    yAxisTitle: string,
    yAxisRange: number[],
    yAxis2Title: string,
    yAxis2Range: number[],
}

export function getDefaultPlotLayout(readingsData: ReadingsData, layoutOptions: Partial<LayoutOptions>): Partial<Plotly.Layout> {
    const root = document.documentElement;
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // const isDarkMode = root.getAttribute('data-theme') === 'dark' ||
    //     (root.getAttribute('data-theme') === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return {
        autosize: true,
        height: 375,
        title: {
            text: layoutOptions.title,
            x: 0.5,
            xanchor: 'center',
            font: {
                color: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
            }
        },
        margin: {
            t: 30,
            b: 30,
        },
        plot_bgcolor: isDarkMode ? '#1b1b1c' : 'white',
        paper_bgcolor: isDarkMode ? '#1b1b1c' : 'white',
        font: {
            color: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
        },
        xaxis: {
            range: [readingsData.startTime, readingsData.endTime],
            mirror: true,
            type: 'date',
            ticks: 'outside',
            showline: true,
            linecolor: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
            automargin: true,
        },
        yaxis: {
            title: { text: layoutOptions.yAxisTitle },
            range: layoutOptions.yAxisRange,
            mirror: true,
            ticks: 'outside',
            showline: true,
            zeroline: false,
            showgrid: true,
            gridwidth: 1,
            linecolor: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
            gridcolor: isDarkMode ? '#424242' : 'LightGray',
        },
        yaxis2: {
            title: { text: layoutOptions.yAxis2Title },
            range: layoutOptions.yAxis2Range,
            mirror: true,
            ticks: 'outside',
            showline: true,
            zeroline: false,
            showgrid: false,
            linecolor: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
            overlaying: 'y',
            side: 'right'
        },
        legend: {
            x: 0,
            y: 1,
            xanchor: 'left',
            yanchor: 'top',
            bgcolor: 'rgba(0,0,0,0)'
        },
        shapes: readingsData.dataGaps.map((g): Partial<Shape> => ({
            type: 'rect',
            x0: g.start,
            x1: g.end,
            y0: layoutOptions.yAxisRange?.[0],
            y1: layoutOptions.yAxisRange?.[1],
            fillcolor: 'red',
            opacity: 0.15,
            layer: 'above',
            line: {
                width: 0,
            },
            label: {
                text: 'Late persistence',
                textposition: 'top left',
                font: {
                    size: 10,
                    color: 'red'
                }
            }
        })),
    };



    // def add_internet_down_highlights(self, fig, request):
    //     for period_start, period_end in self.data[request].get('late_persistence_periods', []):
    //         fig.add_vrect(
    //             x0=period_start, x1=period_end,
    //             fillcolor="red", opacity=0.15,
    //             layer="below", line_width=0,
    //             annotation_text="Late persistence",
    //             annotation_position="top left",
    //             annotation_font_size=10,
    //             annotation_font_color="red",
    //         )    
    }

export function getDefaultPlotConfig(): Partial<Plotly.Config> {
    return {
        displayModeBar: false,
        staticPlot: false,
        responsive: true
    };
}