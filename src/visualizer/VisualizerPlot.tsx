import { DateTime } from 'luxon';
import Plot from "react-plotly.js";
import type { Config, Datum, PlotData } from 'plotly.js';
import type { ReadingsBundleApiResponse } from './visualizerApiTypes';
import { getDefaultPlotLayout, getThemeColor, PLOT_CONTAINER_CSS, type PlotAxisConfig, type PlotConfig } from "./plot-configs";

interface VisualizerPlotProps {
    plotConfig: PlotConfig;
    selectedChannels: string[];
    readingsBundleData: ReadingsBundleApiResponse;
    showPoints: boolean,
    isDarkMode: boolean;
}

const defaultPlotConfig: Partial<Config> = {
    displayModeBar: false,
    responsive: true,
};

type ConverterFunction = (x: number) => number;
const C2F: ConverterFunction = c => 9 * c / 5 + 32;
const UNIT_CONVERSIONS: Record<string, ConverterFunction> = {
    'FahrenheitX100': x => x * 0.01,
    'WaterTempCTimes1000': x => C2F(x * .001),
    'WaterTempFTimes1000': x => x * .001,
    'AirTempFTimes1000': x => x * .001,
    'PowerW': x => x * .001,
    'GpmTimes100': x => x * .01,
}

const UNIT_HOVER_FORMATS: Record<string, string> = {
    'FahrenheitX100': '%{y:.1f}°F',
    'WaterTempCTimes1000': '%{y:.1f}°F',
    'WaterTempFTimes1000': '%{y:.1f}°F',
    'AirrTempFTimes1000': '%{y:.1f}°F',
    'PowerW': '%{y:.1f} kW',
    'GpmTimes100': '%{y:.1f} GPM',
}

function getValueConverter(unit: string, scale: number): ConverterFunction {
    let defaultConvert: ConverterFunction = x => x;
    if (unit in UNIT_CONVERSIONS) {
        defaultConvert = UNIT_CONVERSIONS[unit];
    }

    return x => typeof x === 'number' ? defaultConvert(x) * scale : x;
}

function convertTimestamp(ts: string): string {
    return DateTime.fromISO(ts)
        .setZone('America/New_York')
        .toFormat("yyyy-LL-dd'T'HH:mm:ss");
}

function getHoverTemplate(unit: string, scale?: number | null) {
    let yFormat = '%{y}'
    if (unit in UNIT_HOVER_FORMATS) {
        yFormat = UNIT_HOVER_FORMATS[unit];
    }
    if (scale) {
        yFormat += `/${scale}`;
    }
    return `%{x|%H:%M:%S} | ${yFormat}<extra></extra>`
}

function calculateMinMaxAxisRange(data: Partial<PlotData>[], axisName: string, minOffset: number, maxOffset: number): number[] {
    const values: number[] = data
        .filter(d => d.yaxis === axisName)
        .flatMap(d => (d.y as any[] || []).filter((x: Datum) => typeof x === 'number'));
    return [
        Math.min(...values) - minOffset,
        Math.max(...values) + maxOffset
    ];
}

function calculateAxisRange(
    data: Partial<PlotData>[],
    axisConfig: PlotAxisConfig,
    priorityRangeKey: 'dualOnlyRange' | 'singleOnlyRange' | undefined): number[] | undefined {

    let range;
    if (priorityRangeKey) {
        range = axisConfig[priorityRangeKey];
    }
    if (!range) {
        range = axisConfig.range;
    }
    if (!range && axisConfig.minOffset && axisConfig.maxOffset) {
        range = calculateMinMaxAxisRange(data, 'y', axisConfig.minOffset, axisConfig.maxOffset);
    }

    return range;
}

function matchChannelName(channelDataName: string, channelConfigName: string | RegExp) {
    if (typeof channelConfigName === 'string') {
        return channelDataName === channelConfigName;
    } else if (channelConfigName instanceof RegExp) {
        return channelDataName.match(channelConfigName);
    }

}

export default function VisualizerPlot(props: VisualizerPlotProps) {

    const { plotConfig, readingsBundleData } = props;
    const times = readingsBundleData.TimestampList.map(convertTimestamp);

    const tracesAndChannelReadings = readingsBundleData.ChannelReadingsList
        // .filter(cr => props.selectedChannels.some(sc => sc == cr.ChannelName))
        .map(cr => ({
            channelReading: cr,
            trace: plotConfig.traces.find(t => matchChannelName(cr.ChannelName, t.channelName))
        }))
        .filter(x => x.trace);
    
    const yAxis1Used = tracesAndChannelReadings.some(tc => !tc.trace?.yAxis2);
    const yAxis2Used = tracesAndChannelReadings.some(tc => tc.trace?.yAxis2);

    const plotlyData: Partial<PlotData>[] = tracesAndChannelReadings
        .map(({ trace, channelReading }) => {

            let regexpMatch;
            if (trace?.channelName instanceof RegExp) {
                regexpMatch = channelReading.ChannelName.match(trace.channelName);
            }

            let legendText = trace?.legendText;
            if (legendText && legendText.startsWith("$") && regexpMatch && regexpMatch.groups) {
                legendText = regexpMatch.groups[legendText.substring(1)];
            }

            let colorString;
            if (typeof trace?.color === 'string') {
                colorString = trace.color;
            } else {
                if (trace?.color.index && trace.color.options) {
                    let colorIndex = trace.color.index;
                    if (typeof colorIndex === 'string' && colorIndex.startsWith("$") && regexpMatch && regexpMatch.groups) {
                        colorIndex = regexpMatch.groups[colorIndex.substring(1)];
                    }
                    if (typeof colorIndex === 'string') {
                        colorIndex = parseInt(colorIndex);
                    }
                    if (typeof colorIndex === 'number') {
                        colorString = trace.color.options[colorIndex % trace.color.options.length]
                    }
                }
            }

            const convertValue = getValueConverter(channelReading.Unit || '', trace?.scale || 1);
            const yData = channelReading.ValueList.map(x => convertValue(x));
            const result: Partial<PlotData> = {
                type: 'scatter',
                x: times,
                y: yData,
                mode: props.showPoints ? 'lines+markers' : 'lines',
                opacity: trace?.opacity || 0.7,
                line: {
                    color: colorString ? getThemeColor(colorString, props.isDarkMode) : undefined,
                    dash: trace?.lineDash || 'solid',
                    shape: trace?.lineShape || 'linear'
                },
                name: legendText || undefined,
                showlegend: !!legendText,
                yaxis: (trace?.yAxis2 && yAxis1Used) ? 'y2' : 'y',
                hovertemplate: getHoverTemplate(channelReading.Unit || '', trace?.scale)

            };
            return result;
        });

    const plotlyLayout = getDefaultPlotLayout(props.isDarkMode);
    plotlyLayout.title = {
        ...plotlyLayout.title,
        text: plotConfig.title
    }
    plotlyLayout.xaxis = {
        ...plotlyLayout.xaxis,
        range: [
            convertTimestamp(readingsBundleData.StartTimestamp),
            convertTimestamp(readingsBundleData.EndTimestamp)
        ]
    };
    plotlyLayout.legend = {
        ...plotlyLayout.legend,
        orientation: plotConfig.legendOrientation || 'v'
    };

    if (yAxis1Used && yAxis2Used) {
        plotlyLayout.yaxis = {
            ...plotlyLayout.yaxis,
            title: {
                text: plotConfig.yAxis1.titleText
            },
            range: calculateAxisRange(plotlyData, plotConfig.yAxis1, 'dualOnlyRange')
        }
        plotlyLayout.yaxis2 = {
            ...plotlyLayout.yaxis2,
            title: {
                text: plotConfig.yAxis2?.titleText
            },
            range: plotConfig.yAxis2 ? calculateAxisRange(plotlyData, plotConfig.yAxis2, 'dualOnlyRange') : undefined
        }
    }
    else if (yAxis1Used) {
        plotlyLayout.yaxis = {
            ...plotlyLayout.yaxis,
            title: {
                text: plotConfig.yAxis1.titleText
            },
            range: calculateAxisRange(plotlyData, plotConfig.yAxis1, 'singleOnlyRange')
        }
    }
    else {
        plotlyLayout.yaxis = {
            ...plotlyLayout.yaxis,
            title: {
                text: plotConfig.yAxis2?.titleText
            },
            range: plotConfig.yAxis2 ? calculateAxisRange(plotlyData, plotConfig.yAxis2, 'singleOnlyRange') : undefined
        }
    }

    // TODO new channels to implement
    //  - persistence-delay (store on the front end, calc threshold on the back end)
    //  - heatcall-zoneX
    //  - hp-on state
    //  - top-level-state, local-control-state, ltn-state

    // TODO implement discrete state change graph
    //  - Every value gets rounded to nearest integer
    //  - Only changed values get displayed
    //  - They get a marker that is based on the new value
    //  - Nulls in the data end the trace

    //
    // Heat calls are weird overall, but y-axis ranges are a static offset from the # of zones. This can be done w/ multiple x-axes in Plotly
    // Zone temperature y-axis ranges are a static offset from min/max values
    //
    // The logical "state" plots again just need a static offset from the min/max values.
    //
    // Weather forecast plot is a different beast altogether, not pulled from readings.




    // TODO shapes        
    const plotlyConfig = {
        ...defaultPlotConfig,
    }

    return <div className="plot-div" style={PLOT_CONTAINER_CSS} >
        <Plot
            data={plotlyData}
            layout={plotlyLayout}
            config={plotlyConfig}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler
        />
    </div>
}