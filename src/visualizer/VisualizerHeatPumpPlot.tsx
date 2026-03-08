import Plot from 'react-plotly.js';

import { getDefaultPlotLayout, getDefaultPlotConfig, getDefaultPlotlyData, TEMP_HOVER_TEMPLATE, KW_HOVER_TEMPLATE, KWx10_HOVER_TEMPLATE, GPM_HOVER_TEMPLATE, KWx100_HOVER_TEMPLATE } from './plotlyConfig.ts';
import type { ReadingsData } from './types.ts';

interface VisualizerHeatPumpPlotProps {
    showMarkers: boolean,
    readingsData: ReadingsData
}

function scaleValues(values: number[] | undefined, factor: number) {
    if (!values) {
        return values;
    }

    return values.map(v => v * factor);
}

export default function VisualizerHeatPumpPlot({ readingsData, showMarkers }: VisualizerHeatPumpPlotProps) {

    const {
        'hp-lwt': lwt,
        'hp-ewt': ewt,
        'hp-odu-pwr': oduPower,
        'hp-idu-pwr': iduPower,
        'oil-boiler-pwr': oilBoilerPower,
        'primary-flow': primaryFlow,
        'primary-pump-pwr': primaryPumpPower,
    } = readingsData.data;


    const isPlottingTemps = !!(lwt || ewt);
    const isPlottingPowerOrFlow = [oduPower, iduPower, oilBoilerPower, primaryFlow, primaryPumpPower].some(x => x);
    const plotLayoutOptions = {
        title: 'Heat Pump',
    }
    if (isPlottingTemps) {
        Object.assign(plotLayoutOptions, {
            yAxisTitle: 'Temperature [°F]',
        });
        if (isPlottingPowerOrFlow) {
            Object.assign(plotLayoutOptions, {
                yAxisRange: [0, 260],
            });
            Object.assign(plotLayoutOptions, {
                yAxis2Title: 'Power [kW] or Flow [GPM]',
                yAxis2Range: [0, 35]
            });
        }
    } else if (isPlottingPowerOrFlow) {
        Object.assign(plotLayoutOptions, {
            yAxis2Title: 'Power [kW] or Flow [GPM]',
            yAxis2Range: [0, 10]
        });
    }

    const plotLayout = getDefaultPlotLayout(readingsData, plotLayoutOptions);


    const plotData: Partial<Plotly.PlotData>[] = [
        getDefaultPlotlyData({
            showMarkers,
            readingsData,
            y: lwt,
            name: 'HP LWT',
            lineColor: '#d62728',
            hoverTemplate: TEMP_HOVER_TEMPLATE
        }),
        getDefaultPlotlyData({
            showMarkers,
            readingsData,
            y: ewt,
            name: 'HP EWT',
            lineColor: '#1f77b4',
            hoverTemplate: TEMP_HOVER_TEMPLATE,
        }),
        getDefaultPlotlyData({
            showMarkers,
            readingsData,
            y: oduPower,
            isYAxis2: isPlottingTemps,
            name: 'HP outdoor power',
            lineColor: '#2ca02c',
            hoverTemplate: KW_HOVER_TEMPLATE
        }),
        getDefaultPlotlyData({
            showMarkers,
            readingsData,
            y: iduPower,
            isYAxis2: isPlottingTemps,
            name: 'HP indoor power',
            lineColor: '#ff7f0e',
            hoverTemplate: KW_HOVER_TEMPLATE
        }),
        getDefaultPlotlyData({
            showMarkers,
            readingsData,
            y: scaleValues(oilBoilerPower, 10),
            isYAxis2: isPlottingTemps,
            name: 'Oil boiler power x10',
            lineColor: '#f0f0f0',
            hoverTemplate: KWx10_HOVER_TEMPLATE
        }),
        getDefaultPlotlyData({
            showMarkers,
            readingsData,
            y: primaryFlow,
            isYAxis2: isPlottingTemps,
            name: 'Primary pump flow',
            lineColor: 'purple',
            hoverTemplate: GPM_HOVER_TEMPLATE
        }),
        getDefaultPlotlyData({
            showMarkers,
            readingsData,
            y: scaleValues(primaryPumpPower, 100),
            isYAxis2: isPlottingTemps,
            name: 'Primary pump power x100',
            lineColor: 'pink',
            isLegendOnly: true,
            hoverTemplate: KWx100_HOVER_TEMPLATE
        }),
    ].filter(d => !!d.y);

    const plotConfig = getDefaultPlotConfig();
    return <div className="plot-div">
        <Plot data={plotData} layout={plotLayout} config={plotConfig} />
    </div>
}