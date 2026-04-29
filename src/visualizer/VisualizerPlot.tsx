import { DateTime } from 'luxon';
import Plot from "react-plotly.js";
import type { Config, Data, PlotData } from 'plotly.js';
import type { ReadingsBundleApiResponse } from './visualizerApiTypes';
import { getDefaultPlotLayout, getThemeColor, PLOT_CONTAINER_CSS, type PlotConfig } from "./plot-configs";

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

type ConverterFunction= (x: number) => number;
const C2F: ConverterFunction = c => 9 * c / 5 + 32;
const UNIT_CONVERSIONS: Record<string, ConverterFunction> = {
    'FahrenheitX100': x => x * 0.01,
    'WaterTempCTimes1000': x => C2F(x * .001),
    'WaterTempFTimes1000': x => x * .001,
    'PowerW': x => x * .001,
    'GpmTimes100': x => x * .01,
}

const UNIT_HOVER_FORMATS: Record<string, string> = {
    'FahrenheitX100': '%{y:.1f}°F',
    'WaterTempCTimes1000': '%{y:.1f}°F',
    'WaterTempFTimes1000': '%{y:.1f}°F',
    'PowerW': '%{y:.1f} kW',
    'GpmTimes100': '%{y:.1f} GPM',
}

function getValueConverter(unit: string, scale: number): ConverterFunction {
    let defaultConvert: ConverterFunction = x => x;
    if (unit in UNIT_CONVERSIONS) {
        defaultConvert = UNIT_CONVERSIONS[unit];
    }

    return x => defaultConvert(x) * scale;
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

export default function VisualizerPlot(props: VisualizerPlotProps) {

    const { plotConfig, readingsBundleData } = props;
    const times = readingsBundleData.TimestampList.map(convertTimestamp);

    const tracesAndChannelReadings = plotConfig.traces
        .filter(t => props.selectedChannels.includes(t.channelName))
        .map(t => ({
            t,
            channelReadings: readingsBundleData.ChannelReadingsList.find(cr => cr.ChannelName == t.channelName)
        }))
        .filter(x => x.channelReadings != null);

    const yAxis1Used = tracesAndChannelReadings.some(tc => !tc.t.yAxis2);
    const yAxis2Used = tracesAndChannelReadings.some(tc => tc.t.yAxis2);

    const plotlyData: Partial<PlotData>[] = tracesAndChannelReadings
        .map(({ t, channelReadings }) => {
            const convertValue = getValueConverter(channelReadings?.Unit || '', t.scale || 1);
            const yData = channelReadings?.ValueList.map(x => convertValue(x));
            const result: Partial<PlotData> = {
                type: 'scatter',
                x: times,
                y: yData,
                mode: props.showPoints ? 'lines+markers' : 'lines',
                opacity: t.opacity || 0.7,
                line: {
                    color: getThemeColor(t.color, props.isDarkMode),
                    dash: t.dash || 'solid',
                    shape: t.lineShape || 'linear'
                },
                name: t.legendText,
                yaxis: (t.yAxis2 && yAxis1Used) ? 'y2' : 'y',
                hovertemplate: getHoverTemplate(channelReadings?.Unit || '', t.scale)

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

    if (yAxis1Used && yAxis2Used) {
        plotlyLayout.yaxis = {
            ...plotlyLayout.yaxis,
            title: {
                text: plotConfig.yAxisConfig1.titleText
            },
            range: plotConfig.yAxisConfig1.dualRange
        }
        plotlyLayout.yaxis2 = {
            ...plotlyLayout.yaxis2,
            title: {
                text: plotConfig.yAxisConfig2.titleText
            },
            range: plotConfig.yAxisConfig2.dualRange
        }
    } 
    else if (yAxis1Used) {
        plotlyLayout.yaxis = {
            ...plotlyLayout.yaxis,
            title: {
                text: plotConfig.yAxisConfig1.titleText
            },
            range: plotConfig.yAxisConfig1.singleRange
        }
    }
    else {
        plotlyLayout.yaxis = {
            ...plotlyLayout.yaxis,
            title: {
                text: plotConfig.yAxisConfig2.titleText
            },
            range: plotConfig.yAxisConfig2.singleRange
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