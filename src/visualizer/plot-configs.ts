import type { Layout, LayoutAxis } from "plotly.js";

export interface PlotAxisRange {
    staticRange?: number[] | undefined,
    minOffset?: number | undefined,
    maxOffset?: number | undefined,
    absoluteMin?: number | undefined,
    absoluteMax?: number | undefined,
}

export interface PlotAxisConfig {
    titleText?: string | undefined,
    range?: PlotAxisRange | number[] | undefined,
    dualOnlyRange?: PlotAxisRange | number[] | undefined,
    singleOnlyRange?: PlotAxisRange | number[] | undefined,
}

export interface ColorCycle {
    options: string[],
    index: number | string,
}

export interface PlotTraceConfig {
    channelName: string | RegExp,
    legendText?: string | null,
    yAxis2?: boolean | null,        // Default is false
    toggledOff?: boolean | null,    // Default is false
    color: string | ColorCycle, 
    lineShape?: 'hv' | null,        // Default is 'linear'
    lineDash?: 'dash' | null,       // Default is 'solid'
    opacity?: number | null,        // Default is 7
    offset?: number | null,         // Default is 0
    scale?: number | null,          // Default is 1
}

export interface PlotConfig {
    title: string,
    legendOrientation?: 'h' | 'v' | undefined,   // Default is 'v'
    yAxis1: PlotAxisConfig,
    yAxis2?: PlotAxisConfig | undefined,
    traces: PlotTraceConfig[],
}

const HEAT_PUMP_PLOT_CONFIG: PlotConfig = {
    title: 'Heat pump',
    yAxis1: {
        titleText: 'Temperature [°F]',
        dualOnlyRange: [0, 260],
    },
    yAxis2: {
        titleText: 'Power [kW] or Flow [GPM]',
        dualOnlyRange: [0, 35],
        singleOnlyRange: [0, 10],
    },
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
        opacity: 0.4,
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
};

const DISTRIBUTION_PLOT_CONFIG: PlotConfig = {
    title: 'Distribution',
    yAxis1: {
        titleText: 'Temperature [°F]',
        singleOnlyRange: [0, 260],
        dualOnlyRange: [0, 260],
    },
    yAxis2: {
        titleText: 'Flow [GPM] or Power [W]',
        singleOnlyRange: [0, 20],
        dualOnlyRange: [0, 20],
    }, 
    traces: [{
        channelName: 'dist-swt',
        color: '#d62728',
        legendText: 'Distribution SWT'
    }, {
        channelName: 'dist-rwt',
        color: '#1f77b4',
        legendText: 'Distribution RWT'
    }, {
        channelName: 'dist-flow',
        color: 'purple',
        opacity: 0.4,
        lineShape: 'hv',
        legendText: 'Distribution Flow',
        yAxis2: true,
    }, {
        channelName: 'dist-pump-pwr',
        color: 'pink',
        legendText: 'Distribution pump power /10',
        lineShape: 'hv',
        scale: 100,
        yAxis2: true,
    }]
};

const ZONE_COLORS = ['#d62728', '#1f77b4', '#ff7f0e', '#2ca02c'];

const ZONES_CONFIG: PlotConfig = {
    title: 'Zones',
    legendOrientation: 'h',
    yAxis1: {
        titleText: 'Zone Temperature [°F]',
        range: {
            minOffset: 30,
            maxOffset: 20
        }
    },
    yAxis2: {
        titleText: 'Outside air temperature [°F]',
        range: {
            minOffset: 2,
            maxOffset: 20,
        }
    },
    traces: [{
        channelName: /(?<zoneName>zone(?<zoneNumber>\d+)-\w+)-temp/,
        color: {
            options: ZONE_COLORS,
            index: '$zoneNumber'
        },
        lineShape: 'hv',
        legendText: '$zoneName'
    }, {
        channelName: /(zone(?<zoneNumber>\d+)-\w+)-set/,
        color: {
            options: ZONE_COLORS,
            index: '$zoneNumber'
        },
        lineShape: 'hv',
        lineDash: 'dash',
        legendText: null,
    }]
};

const BUFFER_CONFIG: PlotConfig = {
    title: 'Buffer',
    legendOrientation: 'h',
    yAxis1: {
        titleText: 'Temperature [°F]',
        range: {
            minOffset: 15,
            maxOffset: 30,
        }
    },
    traces: [{
        channelName: /buffer-(?<sensorName>depth(?<depthIndex>\d+))/,
        color: {
            index: "$depthIndex",
            options: ['#3b4cc0', '#b40426', '#f7b89c', '#aac7fd']
        },
        legendText: "$sensorName",        
    }, {
        channelName: 'buffer-hot-pipe',
        color: '#d62728',
        lineShape: 'hv',
        legendText: 'Hot pipe'
    }, {
        channelName: 'buffer-cold-pipe',
        color: '#1f77b4',
        lineShape: 'hv',
        legendText: 'Cold pipe'
    }]
}

const STORAGE_CONFIG: PlotConfig = {
    title: 'Storage',
    legendOrientation: 'h',
    // TODO implement the ranges for the single yAxis2-only case
    yAxis1: {
        titleText: 'Temperature [°F]',
        dualOnlyRange: {
            minOffset: 80,
            maxOffset: 80,
            absoluteMax: 280,
        },
        singleOnlyRange: {
            absoluteMin: 0,
            absoluteMax: 280,
            minOffset: 20,
            maxOffset: 60
        }
    },
    yAxis2: {
        titleText: 'GPM, kW, or kWh',
        dualOnlyRange: [0, 80]
    },
    traces: [{
        channelName: /(?<sensorName>tank1-depth(?<depthIndex>\d+))/,
        color: {
            index: "$depthIndex",
            options: ['#f6a384', '#b40426', '#d44e41', '#ea7c61'],
        },
        legendText: "$sensorName",
    }, {
        channelName: /(?<sensorName>tank2-depth(?<depthIndex>\d+))/,
        color: {
            index: "$depthIndex",
            options: ['#b4cdfa', '#f5c1a8', '#e8d6cc', '#d1dae9'],
        },
        legendText: "$sensorName",
    }, {
        channelName: /(?<sensorName>tank3-depth(?<depthIndex>\d+))/,
        color: {
            index: "$depthIndex",
            options: ['#3b4cc0', '#95b7ff', '#7598f6', '#5774e0'],
        },
        legendText: "$sensorName",
    }, {
        channelName: 'store-hot-pipe',
        color: '#d62728',
        lineShape: 'hv',
        legendText: 'Hot pipe'
    }, {
        channelName: 'store-cold-pipe',
        color: '#1f77b4',
        lineShape: 'hv',
        legendText: 'Cold pipe'
    }, {
        channelName: 'store-pump-pwr',
        color: 'pink',
        lineShape: 'hv',
        legendText: 'Storage pump power x1000',
        scale: 1000,
        yAxis2: true,
        toggledOff: true,
    }, {
        channelName: 'store-flow',
        color: 'purple',
        opacity: 0.4,
        lineShape: 'hv',
        legendText: 'Storage pump flow x10',
        scale: 10,
        yAxis2: true,
    }, {
        channelName: 'usable-energy',
        color: '#2ca02c',
        opacity: 0.4,
        legendText: 'Usable',
        yAxis2: true,
        toggledOff: true,
    }, {
        channelName: 'required-energy',
        color: '#2ca02c',
        opacity: 0.4,
        lineDash: 'dash',
        legendText: 'Required',
        yAxis2: true,
        toggledOff: true,
    }]
}

export const PLOT_CONFIGS = [
    HEAT_PUMP_PLOT_CONFIG,
    DISTRIBUTION_PLOT_CONFIG,
    ZONES_CONFIG,
    BUFFER_CONFIG,
    STORAGE_CONFIG,
];


const THEME_DARK: Record<string, string> = {
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

export function getDefaultPlotLayout(isDarkMode: boolean): Partial<Layout> {

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
