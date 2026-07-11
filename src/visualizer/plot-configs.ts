import { DateTime } from "luxon";
import type { DTickValue, Layout } from "plotly.js";

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
    dtick?: DTickValue | undefined,
}

export interface ColorCycle {
    options: string[],
    index: number | string,
}

export interface StateValueConfig {
    y: number,
    markerColor: string,
}

export interface PlotTraceConfig {
    dataSeriesName: string | RegExp,
    dataSource?: 'readings' | 'prices' | 'states' | undefined, // Default to 'readings'
    stateConfigs?: Record<string, StateValueConfig> | null
    legendText?: string | null,
    yAxis2?: boolean | null,        // Default is false
    toggledOff?: boolean | null,    // Default is false
    color: string | ColorCycle | Record<string, string>, 
    lineShape?: 'hv' | null,        // Default is 'linear'
    lineDash?: 'dash' | 'dot' | 'solid' | null,       // Default is 'solid'
    opacity?: number | null,        // Default is 7
    scale?: number | null,          // Default is 1
    stacked?: boolean | null,       // Default is false
}

export interface PlotConfig {
    title: string,
    plotType?: 'Default' | 'PriceForecast' | 'WeatherForecast' | null,
    legendOrientation?: 'h' | 'v' | undefined,   // Default is 'v'
    yAxis1?: PlotAxisConfig,
    yAxis2?: PlotAxisConfig | undefined,
    traces?: PlotTraceConfig[],
    includeHeatPumpHighlights?: boolean | undefined,
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
    includeHeatPumpHighlights: true,
    traces: [{
        dataSeriesName: 'hp-lwt',
        legendText: 'HP LWT',
        color: '#d62728'
    }, {
        dataSeriesName: 'hp-ewt',
        legendText: 'HP EWT',
        color: '#1f77b4'
    }, {
        dataSeriesName: 'hp-odu-pwr',
        legendText: 'HP outdoor power',
        color: '#2ca02c',
        yAxis2: true,
        lineShape: 'hv',
    }, {
        dataSeriesName: 'hp-idu-pwr',
        legendText: 'HP indoor power',
        color: '#ff7f0e',
        yAxis2: true,
        lineShape: 'hv',
    }, {
        dataSeriesName: 'oil-boiler-pwr',
        legendText: 'Oil boiler power x10',
        color: 'theme-line-muted',
        scale: 10,
        yAxis2: true,
        lineShape: 'hv',
    }, {
        dataSeriesName: 'primary-flow',
        legendText: 'Primary pump flow',
        color: 'purple',
        opacity: 0.4,
        yAxis2: true,
        lineShape: 'hv',
    }, {
        dataSeriesName: 'sieg-flow',
        legendText: 'Sieg loop flow',
        color: '#4a148c',
        opacity: 0.4,
        yAxis2: true,
        lineShape: 'hv',
    }, {
        dataSeriesName: 'primary-pump-pwr',
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
        dataSeriesName: 'dist-swt',
        color: '#d62728',
        legendText: 'Distribution SWT'
    }, {
        dataSeriesName: 'dist-rwt',
        color: '#1f77b4',
        legendText: 'Distribution RWT'
    }, {
        dataSeriesName: 'dist-flow',
        color: 'purple',
        opacity: 0.4,
        lineShape: 'hv',
        legendText: 'Distribution Flow',
        yAxis2: true,
    }, {
        dataSeriesName: 'dist-pump-pwr',
        color: 'pink',
        legendText: 'Distribution pump power /10',
        lineShape: 'hv',
        scale: 100,
        yAxis2: true,
    }]
};

const ZONE_COLORS = ['#d62728', '#1f77b4', '#ff7f0e', '#2ca02c'];

const HEATCALLS_CONFIG: PlotConfig = {
    title: 'Heat calls',
    legendOrientation: 'h',
    yAxis1: {
        dtick: 1,
        range: {
            minOffset: 0.5,
            maxOffset: 0.5,
        }
    },
    traces: [{
        dataSeriesName: /(?<zoneName>zone(?<zoneNumber>\d+)-[\w-]+)-heat-call$/,
        color: {
            options: ZONE_COLORS,
            index: '$zoneNumber'
        },
        lineShape: 'hv',
        legendText: '$zoneName',
        stacked: true,
    }]
}

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
        dataSeriesName: /(?<zoneName>zone(?<zoneNumber>\d+)-[\w-]+(?<!gw))-temp$/,
        color: {
            options: ZONE_COLORS,
            index: '$zoneNumber'
        },
        lineShape: 'hv',
        legendText: '$zoneName'
    }, {
        dataSeriesName: /(zone(?<zoneNumber>\d+)-[\w-]+)-set$/,
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
        dataSeriesName: /buffer-(?<sensorName>depth(?<depthIndex>\d+))/,
        color: {
            index: "$depthIndex",
            options: ['#3b4cc0', '#b40426', '#f7b89c', '#aac7fd']
        },
        legendText: "$sensorName",        
    }, {
        dataSeriesName: 'buffer-hot-pipe',
        color: '#d62728',
        lineShape: 'hv',
        legendText: 'Hot pipe'
    }, {
        dataSeriesName: 'buffer-cold-pipe',
        color: '#1f77b4',
        lineShape: 'hv',
        legendText: 'Cold pipe'
    }]
}

const STORAGE_CONFIG: PlotConfig = {
    title: 'Storage',
    legendOrientation: 'h',
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
        dataSeriesName: /(?<sensorName>tank1-depth(?<depthIndex>\d+))/,
        color: {
            index: "$depthIndex",
            options: ['#f6a384', '#b40426', '#d44e41', '#ea7c61'],
        },
        legendText: "$sensorName",
    }, {
        dataSeriesName: /(?<sensorName>tank2-depth(?<depthIndex>\d+))/,
        color: {
            index: "$depthIndex",
            options: ['#b4cdfa', '#f5c1a8', '#e8d6cc', '#d1dae9'],
        },
        legendText: "$sensorName",
    }, {
        dataSeriesName: /(?<sensorName>tank3-depth(?<depthIndex>\d+))/,
        color: {
            index: "$depthIndex",
            options: ['#3b4cc0', '#95b7ff', '#7598f6', '#5774e0'],
        },
        legendText: "$sensorName",
    }, {
        dataSeriesName: 'store-hot-pipe',
        color: '#d62728',
        lineShape: 'hv',
        legendText: 'Hot pipe'
    }, {
        dataSeriesName: 'store-cold-pipe',
        color: '#1f77b4',
        lineShape: 'hv',
        legendText: 'Cold pipe'
    }, {
        dataSeriesName: 'store-pump-pwr',
        color: 'pink',
        lineShape: 'hv',
        legendText: 'Storage pump power x1000',
        scale: 1000,
        yAxis2: true,
        toggledOff: true,
    }, {
        dataSeriesName: 'store-flow',
        color: 'purple',
        opacity: 0.4,
        lineShape: 'hv',
        legendText: 'Storage pump flow x10',
        scale: 10,
        yAxis2: true,
    }, {
        dataSeriesName: 'usable-energy',
        color: '#2ca02c',
        opacity: 0.4,
        legendText: 'Usable',
        yAxis2: true,
        toggledOff: true,
    }, {
        dataSeriesName: 'required-energy',
        color: '#2ca02c',
        opacity: 0.4,
        lineDash: 'dash',
        legendText: 'Required',
        yAxis2: true,
        toggledOff: true,
    }]
};

const PRICING_CONFIG: PlotConfig = {
    title: 'Price Forecast',
    plotType: 'PriceForecast',
    yAxis1: {
        titleText: 'Total price [$/MWh]'
    },
    yAxis2: {
        titleText: 'LMP [$/MWh]'
    },
    traces: [{
        dataSeriesName: 'TotalList',
        dataSource: 'prices',
        color: 'theme-line-muted',
        lineShape: 'hv',
        opacity: 0.8,
        legendText: 'Total'
    }, {
        dataSeriesName: 'LmpList',
        dataSource: 'prices',
        color: 'theme-line-muted',
        lineShape: 'hv',
        lineDash: 'dot',
        opacity: 0.4,
        yAxis2: true,
        legendText: 'LMP'
    }]
}

const TOP_STATE_CONFIG: PlotConfig = {
    title: 'Top State',
    yAxis1: {
         range: {
            absoluteMin: -0.6,
            maxOffset: 0,
         },
         dtick: 1,
    },
    traces: [{
        dataSource: 'states',
        dataSeriesName: 'top-state',
        color: 'theme-line-muted',
        lineShape: 'hv',
        stateConfigs: {
            'LocalControl': { y: 0, markerColor: '#EF553B'},
            'LeafTransactiveNode': { y: 1, markerColor: '#00CC96'},
            'Admin': { y: 2, markerColor: '#636EFA'}
        },
    }]
}

const LTN_STATE_CONFIG: PlotConfig = {
    title: 'LTN State',
    yAxis1: {
         range: {
            absoluteMin: -0.6,
            absoluteMax: 7.2,
         },
         dtick: 1,
    },
    traces: [{
        dataSource: 'states',
        dataSeriesName: /ltn-all-tanks-state|ltn-buffer-only-state/,
        color: 'theme-line-muted',
        lineShape: 'hv',
        stateConfigs: {
            'HpOffStoreDischarge': { y: 0, markerColor: '#EF553B'},
            'HpOffStoreOff': { y: 1, markerColor: '#00CC96'},
            'HpOff': { y: 1, markerColor: '#00CC96'},
            'HpOnStoreOff': { y: 2, markerColor: '#636EFA'},
            'HpOn': { y: 2, markerColor: '#636EFA'},
            'HpOnStoreCharge': { y: 3, markerColor: '#feca52'},
            'HpOffNonElectricBackup': { y: 4, markerColor: '#ee93fa'},
            'Initializing': { y: 5, markerColor: '#a3a3a3'},
            'Dormant': { y: 6, markerColor: '#4f4f4f'},
            'EverythingOff': { y: 7, markerColor: '#4f4f4f'},
        },
    }]
};
const LC_STATE_CONFIG: PlotConfig = {
    title: 'LocalControl State',
    yAxis1: {
         range: {
            absoluteMin: -0.6,
            absoluteMax: 7.2,
         },
         dtick: 1,
    },
    traces: [{
        dataSource: 'states',
        dataSeriesName: /local-control-all-tanks-state|local-control-buffer-only-state|local-control-standby-state/,
        color: 'theme-line-muted',
        lineShape: 'hv',
        stateConfigs: {
            'HpOffStoreDischarge': { y: 0, markerColor: '#EF553B'},
            'HpOffStoreOff': { y: 1, markerColor: '#00CC96'},
            'HpOff': { y: 1, markerColor: '#00CC96'},
            'HpOnStoreOff': { y: 2, markerColor: '#636EFA'},
            'HpOn': { y: 2, markerColor: '#636EFA'},
            'HpOnStoreCharge': { y: 3, markerColor: '#feca52'},
            'HpOffNonElectricBackup': { y: 4, markerColor: '#ee93fa'},
            'Initializing': { y: 5, markerColor: '#a3a3a3'},
            'Dormant': { y: 6, markerColor: '#4f4f4f'},
            'EverythingOff': { y: 7, markerColor: '#4f4f4f'},
        },
    }]
};

const WEATHER_CONFIG: PlotConfig = {
    title: 'Weather Forecasts',
    plotType: 'WeatherForecast'
}

export const PLOT_CONFIGS = [
    HEAT_PUMP_PLOT_CONFIG,
    PRICING_CONFIG,
    DISTRIBUTION_PLOT_CONFIG,
    HEATCALLS_CONFIG,
    ZONES_CONFIG,
    BUFFER_CONFIG,
    STORAGE_CONFIG,
    TOP_STATE_CONFIG,
    LC_STATE_CONFIG,
    LTN_STATE_CONFIG,
    WEATHER_CONFIG,
];

const THEME_DARK: Record<string, string> = {
    'line-muted': '#f0f0f0'
}

const THEME_LIGHT: Record<string, string> = {
    'line-muted': '#5e5e5e'
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

export function formatForDisplay(dt: DateTime): string {
    return dt.setZone('America/New_York').toFormat("yyyy-LL-dd'T'HH:mm:ss");
}

export function formatIsoTimeForDisplay(ts: string): string {
    return formatForDisplay(DateTime.fromISO(ts))
}

export function formatHourStartSForDisplay(hourStartS: number): string {
    return formatForDisplay(DateTime.fromSeconds(hourStartS))
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
