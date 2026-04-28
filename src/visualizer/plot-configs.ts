import type { Layout, LayoutAxis } from "plotly.js";

export interface PlotTraceConfig {
    channelName: string,
    legendText: string,
    yAxis2?: boolean | null,    // Default is false
    color: string,
    lineShape?: 'hv' | null,   // Default is 'linear'
    dash?: 'dash' | null,       // Default is 'solid'
    opacity?: number | null,    // Default is 7
    offset?: number | null,     // Default is 0
    scale?: number | null,      // Default is 1
}

export interface PlotShapeConfig {
    channelName: string,
    color: string,
    threshold: any,
}

export interface PlotConfig {
    title: string,
    traces: PlotTraceConfig[],
    shapes: PlotShapeConfig[],
}

export const PLOT_CONFIGS: PlotConfig[] = [{
    title: 'Heat pump',
    traces: [{
        channelName: 'hp-lwt',
        legendText: 'HP LWT',
        color: '#d62728'
    }, {
        channelName: 'hp-ewt',
        legendText: 'HP EWT',
        color: '#1f77b4'
    }, {
        channelName: 'hp-odu-pwr',
        legendText: 'HP outdoor power',
        color: '#2ca02c',
        yAxis2: true,
        lineShape: 'hv',
    }, {
        channelName: 'hp-idu-pwr',
        legendText: 'HP indoor power',
        color: '#ff7f0e',
        yAxis2: true,
        lineShape: 'hv',
    }, {
        channelName: 'oil-boiler-pwr',
        legendText: 'Oil boiler power x10',
        color: 'theme-oil-boiler-power-color',
        scale: 10,
        yAxis2: true,
        lineShape: 'hv',
    }, {
        channelName: 'primary-flow',
        legendText: 'Primary pump flow',
        color: 'purple',
        yAxis2: true,
        lineShape: 'hv',
    }, {
        channelName: 'primary-pump-pwr',
        legendText: 'Primary pump power x100',
        color: 'pink',
        scale: 100,
        yAxis2: true,
        lineShape: 'hv',
    }],
    shapes: [{
        channelName: 'persistence-delay',
        color: 'red',
        threshold: '10 min'
    }]
}];

const THEME_DARK: Record<string, string>  = {
    'oil-boiler-power-color': '#f0f0f0'
}

const THEME_LIGHT: Record<string, string> = {
    'oil-boiler-power-color': '#5e5e5e'
}

export function getThemeColor(key: string, isDarkMode: boolean): string {
    if (key.startsWith('theme-')) {
        const themeKey = key.substring('theme-'.length);
        const theme = isDarkMode ? THEME_DARK : THEME_LIGHT;
        if (themeKey in theme) {
            return theme[themeKey];
        };
    }

    return key;
}



const VISUALIZER_PLOT_HEIGHT = 400;

export function getDefaultPlotLayout(isDarkMode: boolean) : Partial<Layout> {

    const theme = {
        fontColor: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
        bg: isDarkMode ? '#1b1b1c' : 'white',
        gridColor: isDarkMode ? '#424242' : 'LightGray',
        lineMuted: isDarkMode ? '#f0f0f0' : '#5e5e5e'
    };

    return {
        height: VISUALIZER_PLOT_HEIGHT,
        plot_bgcolor: theme.bg,
        paper_bgcolor: theme.bg,
        font: { color: theme.fontColor },
        title: { text: 'Visualizer Chart', x: 0.5, xanchor: 'center', font: { color: theme.fontColor } },
        autosize: true,
        margin: { t: 30, b: 52 },
        hovermode: 'closest',
        xaxis: {
            mirror: true,
            ticks: 'outside',
            showline: true,
            linecolor: theme.fontColor,
            showgrid: false,
            type: 'date'
        },
        yaxis: {
            mirror: true,
            ticks: 'outside',
            showline: true,
            linecolor: theme.fontColor,
            zeroline: false,
            showgrid: true,
            gridwidth: 1,
            gridcolor: theme.gridColor
        },
        yaxis2: {
            mirror: true,
            ticks: 'outside',
            zeroline: false,
            showline: true,
            linecolor: theme.fontColor,
            showgrid: false,
            overlaying: 'y',
            side: 'right'
        },
        legend: {
            x: 0,
            y: 1,
            xanchor: 'left',
            yanchor: 'top',
            bgcolor: 'rgba(0, 0, 0, 0)'
        },
    }
}

export const PLOT_CONTAINER_CSS = { width: '100%', height: `${VISUALIZER_PLOT_HEIGHT}px`, minHeight: `${VISUALIZER_PLOT_HEIGHT}px` };
