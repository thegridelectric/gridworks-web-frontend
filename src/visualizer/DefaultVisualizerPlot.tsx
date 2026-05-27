import type { PlotParams } from "react-plotly.js";
import type { ReadingsBundleApiResponse } from "./visualizerApiTypes";
import { formatForDisplay, formatIsoTimeForDisplay, getDefaultPlotLayout, getThemeColor, type PlotAxisConfig, type PlotConfig, type PlotTraceConfig } from "./plot-configs";
import type { Datum, PlotData, Shape } from "plotly.js";
import { DateTime } from "luxon";
import Plot from "react-plotly.js";
import { PlotlyWrapper } from "./PlotlyWrapper";

export interface DefaultPlotParams {
    plotParams: Partial<PlotParams>;
    selectedChannels: string[];
    plotConfig: PlotConfig;
    readingsBundleData: ReadingsBundleApiResponse;
    showPoints: boolean,
    isDarkMode: boolean;
}


type ConverterFunction = (x: number) => number;
const C2F: ConverterFunction = c => 9 * c / 5 + 32;
const UNIT_CONVERSIONS: Record<string, ConverterFunction> = {
    'FahrenheitX100': x => x * 0.01,
    'WaterTempCTimes1000': x => C2F(x * .001),
    'WaterTempFTimes1000': x => x * .001,
    'AirTempCTimes1000': x => C2F(x * .001),
    'AirTempFTimes1000': x => x * .001,
    'PowerW': x => x * .001,
    'GpmTimes100': x => x * .01,
    'WattHours': x => x * .001,
}

const UNIT_HOVER_FORMATS: Record<string, string> = {
    'FahrenheitX100': '%{y:.1f}°F',
    'WaterTempCTimes1000': '%{y:.1f}°F',
    'AirTempCTimes1000': '%{y:.1f}°F',
    'WaterTempFTimes1000': '%{y:.1f}°F',
    'AirTempFTimes1000': '%{y:.1f}°F',
    'PowerW': '%{y:.1f} kW',
    'GpmTimes100': '%{y:.1f} GPM',
    'WattHours': '%{y:.1f} kWh',
}

function getValueConverter(unit: string, scale: number): ConverterFunction {
    let defaultConvert: ConverterFunction = x => x;
    if (unit in UNIT_CONVERSIONS) {
        defaultConvert = UNIT_CONVERSIONS[unit];
    }

    return x => typeof x === 'number' ? defaultConvert(x) * scale : x;
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

function calculateMinMaxAxisRange(data: Partial<PlotData>[], axisName: string, minOffset: number | undefined, maxOffset: number | undefined): number[] {
    const values: number[] = data
        .filter(d => d.yaxis === axisName)
        .flatMap(d => (d.y as any[] || []).filter((x: Datum) => typeof x === 'number'));
    return [
        Math.min(...values) - (minOffset || 0),
        Math.max(...values) + (maxOffset || 0)
    ];
}

function calculateAxisRange(
    data: Partial<PlotData>[],
    axisConfig: PlotAxisConfig | undefined,
    priorityRangeKey: 'dualOnlyRange' | 'singleOnlyRange' | undefined): number[] | undefined {

    let range;
    if (axisConfig && priorityRangeKey) {
        range = axisConfig[priorityRangeKey];
    }
    if (axisConfig && !range) {
        range = axisConfig.range;
    }
    if (!range) {
        return;
    }
    if (0 in range && 1 in range) {
        return range;
    }
    if ('minOffset' in range && 'maxOffset' in range) {
        const calculatedRange = calculateMinMaxAxisRange(data, 'y', range.minOffset, range.maxOffset);
        if (typeof range.absoluteMin === 'number' && calculatedRange[0] < range.absoluteMin) {
            calculatedRange[0] = Math.max(range.absoluteMin, calculatedRange[0]);
        }
        if (typeof range.absoluteMax === 'number' && calculatedRange[1] > range.absoluteMax) {
            calculatedRange[1] = Math.min(range.absoluteMax, calculatedRange[1]);
        }
        return calculatedRange;
    }
}

function matchChannelName(channelDataName: string, channelConfigName: string | RegExp) {
    if (typeof channelConfigName === 'string') {
        return channelDataName === channelConfigName;
    } else if (channelConfigName instanceof RegExp) {
        return channelDataName.match(channelConfigName);
    }

}

export interface TraceWithData {
    trace?: PlotTraceConfig | null,
    seriesName: string,
    unit?: string | null,
    xValues: any[],
    yValues: any[],
    plotDataOverride?: Partial<PlotData> | null,
}

export interface PlotInfoParams {
    tracesWithData: TraceWithData[],
    plotConfig: PlotConfig,
    showPoints: boolean,
    isDarkMode: boolean,
    formattedStartDate: string,
    formattedEndDate: string,
}

export function generateDefaultPlotInfo(params: PlotInfoParams) {
    const { tracesWithData, plotConfig, showPoints, isDarkMode, formattedStartDate, formattedEndDate } = params;
    const yAxis1Used = tracesWithData.some(tc => !tc.trace?.yAxis2);
    const yAxis2Used = tracesWithData.some(tc => tc.trace?.yAxis2);

    const plotlyData: Partial<PlotData>[] = tracesWithData
        .map(({ trace, plotDataOverride, seriesName, unit, xValues, yValues }, idx) => {

            let regexpMatch;
            if (trace?.dataSeriesName instanceof RegExp) {
                regexpMatch = seriesName.match(trace.dataSeriesName);
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

            const convertValue = getValueConverter(unit || '', trace?.scale || 1);
            let yData = yValues.map(x => convertValue(x));

            if (trace?.stacked) {
                yData = yData.map(y => y + idx)
            }

            const result: Partial<PlotData> = {
                type: 'scatter',
                x: xValues,
                y: yData,
                mode: showPoints ? 'lines+markers' : 'lines',
                opacity: trace?.opacity || 0.7,
                line: {
                    color: colorString ? getThemeColor(colorString, isDarkMode) : undefined,
                    dash: trace?.lineDash || 'solid',
                    shape: trace?.lineShape || 'linear'
                },
                name: legendText || undefined,
                showlegend: !!legendText,
                yaxis: (trace?.yAxis2 && yAxis1Used) ? 'y2' : 'y',
                visible: trace?.toggledOff ? 'legendonly' : true,
                hovertemplate: getHoverTemplate(unit || '', trace?.scale),
                ...plotDataOverride || {}
            };
            return result;
        });

    const plotlyLayout = getDefaultPlotLayout(isDarkMode);
    plotlyLayout.title = {
        ...plotlyLayout.title,
        text: plotConfig.title
    }
    plotlyLayout.xaxis = {
        ...plotlyLayout.xaxis,
        range: [
            formattedStartDate,
            formattedEndDate,
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
                text: plotConfig.yAxis1?.titleText
            },
            dtick: plotConfig.yAxis1?.dtick,
            range: calculateAxisRange(plotlyData, plotConfig.yAxis1, 'dualOnlyRange')
        }
        plotlyLayout.yaxis2 = {
            ...plotlyLayout.yaxis2,
            title: {
                text: plotConfig.yAxis2?.titleText
            },
            dtick: plotConfig.yAxis2?.dtick,
            range: plotConfig.yAxis2 ? calculateAxisRange(plotlyData, plotConfig.yAxis2, 'dualOnlyRange') : undefined
        }
    }
    else if (yAxis1Used) {
        plotlyLayout.yaxis = {
            ...plotlyLayout.yaxis,
            title: {
                text: plotConfig.yAxis1?.titleText
            },
            range: calculateAxisRange(plotlyData, plotConfig.yAxis1, 'singleOnlyRange'),
            dtick: plotConfig.yAxis1?.dtick
        }
        plotlyLayout.yaxis2 = {
            ...plotlyLayout.yaxis2,
            visible: false
        };
    }
    else {
        plotlyLayout.yaxis = {
            ...plotlyLayout.yaxis,
            title: {
                text: plotConfig.yAxis2?.titleText
            },
            dtick: plotConfig.yAxis2?.dtick,
            range: plotConfig.yAxis2 ? calculateAxisRange(plotlyData, plotConfig.yAxis2, 'singleOnlyRange') : undefined
        }
        plotlyLayout.yaxis2 = {
            ...plotlyLayout.yaxis2,
            visible: false
        };
    }

    return { plotlyData, plotlyLayout };
}

export default function DefaultVisualizerPlot(props: DefaultPlotParams) {

    const { plotConfig, readingsBundleData } = props;
    const readingsTimes = readingsBundleData.TimestampList.map(formatIsoTimeForDisplay);

    const selectedChannels = props.selectedChannels.flatMap(c => c.split(',')).map(c => c.startsWith('^') && c.endsWith('$') ? new RegExp(c) : c);

    const tracesWithData: TraceWithData[] = [
        ...readingsBundleData.ChannelReadingsList
            .filter(cr => selectedChannels.some(sc => matchChannelName(cr.ChannelName, sc)))
            .map(cr => ({
                seriesName: cr.ChannelName,
                unit: cr.Unit,
                xValues: readingsTimes,
                yValues: cr.ValueList,
                trace: plotConfig.traces?.find(t => (
                    (!t.dataSource || t.dataSource === 'readings') &&
                    t.dataSeriesName &&
                    matchChannelName(cr.ChannelName, t.dataSeriesName)
                ))
            }))
            .filter(x => x.trace),
        ...(plotConfig.traces || [])
            .filter(t => t.dataSource === 'states')
            .flatMap(t => {
                if (!t.stateConfigs) {
                    return [];
                }
                const sequences = readingsBundleData.OperatingStateSequenceList.filter(oss => matchChannelName(oss.ChannelName, t.dataSeriesName));
                if (!sequences.length) {
                    return [];
                }

                const allTimestamps = sequences.flatMap(s => s.TimestampList);
                const allValues = sequences.flatMap(s => s.ValueList);
                const allSortedPoints = allTimestamps.map((t, i) => ({ date: DateTime.fromISO(t), val: allValues[i] }))
                allSortedPoints.sort((a, b) => a.date.diff(b.date).toMillis());

                const allStatesLine: TraceWithData = {
                    seriesName: 'All',
                    unit: null,
                    xValues: allSortedPoints.map(xy => formatForDisplay(xy.date)),
                    yValues: allSortedPoints.map(xy => {
                        if (t.stateConfigs && t.stateConfigs[xy.val]) {
                            return t.stateConfigs[xy.val].y;
                        }
                    }),
                    trace: t,
                    plotDataOverride: {
                        mode: 'lines',
                    }
                };
                allStatesLine.xValues.push(formatIsoTimeForDisplay(readingsBundleData.EndTimestamp));
                allStatesLine.yValues.push(allStatesLine.yValues[allStatesLine.yValues.length - 1]);

                const seriesByName: Record<string, TraceWithData> = {}
                for (const sequence of sequences) {
                    for (var i = 0; i < sequence.TimestampList.length; i++) {
                        const time = sequence.TimestampList[i];
                        const value = sequence.ValueList[i];
                        const config = t.stateConfigs[value];
                        if (config) {
                            if (!seriesByName[value]) {
                                seriesByName[value] = {
                                    seriesName: value,
                                    unit: null,
                                    xValues: [],
                                    yValues: [],
                                    plotDataOverride: {
                                        name: value,
                                        showlegend: true,
                                        mode: 'markers',
                                        marker: {
                                            color: config.markerColor,
                                            size: 10,
                                        },
                                        opacity: 0.8,
                                        hovertemplate: '%{x|%H:%M:%S}'
                                    }
                                }
                            }
                            seriesByName[value].xValues.push(formatIsoTimeForDisplay(time));
                            seriesByName[value].yValues.push(config.y);
                        }
                    }
                }

                return [
                    allStatesLine,
                    ...Object.values(seriesByName)
                ];
            })
    ];

    if (!tracesWithData.length) {
        return null;
    }
    
    const { plotlyData, plotlyLayout } = generateDefaultPlotInfo({
        tracesWithData,
        plotConfig,
        showPoints: props.showPoints,
        isDarkMode: props.isDarkMode,
        formattedStartDate: formatIsoTimeForDisplay(readingsBundleData.StartTimestamp),
        formattedEndDate: formatIsoTimeForDisplay(readingsBundleData.EndTimestamp)
    });

    const HeatPumpOnHighlightTemplate: Partial<Shape> = {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        y0: 0,
        y1: 1,
        fillcolor: 'green',
        opacity: 0.16,
        layer: 'below',
        line: { width: 0 }
    };

    plotlyLayout.shapes = [
        ...readingsBundleData.LatePersistenceList.map(([start, end]): Partial<Shape> => ({
            type: 'rect',
            xref: 'x',
            yref: 'paper',
            x0: formatIsoTimeForDisplay(start),
            x1: formatIsoTimeForDisplay(end),
            y0: 0,
            y1: 1,
            fillcolor: 'red',
            opacity: 0.15,
            layer: 'below',
            line: { width: 0 }
        })),
        ...(plotConfig.includeHeatPumpHighlights && props.selectedChannels.includes('hp-on-highlights')) ?
            readingsBundleData.OperatingStateSequenceList.flatMap((oss): Partial<Shape>[] => {
                var onStart = null;
                const results: Partial<Shape>[] = [];
                for (var i = 0; i < oss.TimestampList.length; i++) {
                    const t = oss.TimestampList[i];
                    const state = oss.ValueList[i];
                    if (!onStart && state.match(/HpOn/)) {
                        onStart = t;
                    } else if (onStart) {
                        results.push({
                            ...HeatPumpOnHighlightTemplate,
                            x0: formatIsoTimeForDisplay(onStart),
                            x1: formatIsoTimeForDisplay(t),
                        });
                        onStart = null;
                    }
                }
                if (onStart) {
                    results.push({
                        ...HeatPumpOnHighlightTemplate,
                        x0: formatIsoTimeForDisplay(onStart),
                        x1: formatIsoTimeForDisplay(readingsBundleData.EndTimestamp),
                    });
                }
                return results;
            }) :
            [],
    ];


    return <PlotlyWrapper>
        <Plot data={plotlyData} layout={plotlyLayout} {...props.plotParams} />
    </PlotlyWrapper>;

}