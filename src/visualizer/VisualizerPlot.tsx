import { DateTime } from 'luxon';
import Plot from "react-plotly.js";
import type { Config, Data } from 'plotly.js';
import type { ReadingsBundleApiResponse } from './visualizerApiTypes';
import { getDefaultPlotLayout, getThemeColor, PLOT_CONTAINER_CSS, type PlotConfig } from "./plot-configs";

interface VisualizerPlotProps {
    plotConfig: PlotConfig;
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

    const plotlyData: Partial<Data>[] = plotConfig.traces
        .map(t => ({
            t,
            channelReadings: readingsBundleData.ChannelReadingsList.find(cr => cr.ChannelName == t.channelName)
        }))
        .filter(x => x.channelReadings != null)
        .map(({ t, channelReadings }) => {
            const convertValue = getValueConverter(channelReadings?.Unit || '', t.scale || 1);
            const yData = channelReadings?.ValueList.map((x, i) => convertValue(x));
            const result: Partial<Data> = {
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
                yaxis: t.yAxis2 ? 'y2' : 'y',
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


    // TODO dynamic y-axes based on what's present in the plot
    plotlyLayout.yaxis = {
        ...plotlyLayout.yaxis,
        title: {
            text: 'Temperature [F]'
        },
        range: [0, 260],
    }
    plotlyLayout.yaxis2 = {
        ...plotlyLayout.yaxis2,
        title: {
            text: 'Power [kW] or Flow [GPM]'
        },
        range: [0, 35],
    }


    // if (plottingPower && plottingTemperatures) {
    //     layout.yaxis.title = 'Temperature [F]';
    //     layout.yaxis.range = [0, 260];
    //     layout.yaxis2.title = 'Power [kW] or Flow [GPM]';
    //     layout.yaxis2.range = [0, 35];
    // } else if (plottingTemperatures && !plottingPower) {
    //     layout.yaxis.title = 'Temperature [F]';
    // } else if (plottingPower && !plottingTemperatures) {
    //     layout.yaxis.title = 'Power [kW] or Flow [GPM]';
    //     layout.yaxis.range = [0, 10];
    // }




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