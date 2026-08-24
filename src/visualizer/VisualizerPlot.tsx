import { type PlotParams } from "react-plotly.js";
import type { Config } from 'plotly.js';
import type { ReadingsBundleApiResponse } from '../sema';
import { type PlotConfig } from "./plot-configs";
import WeatherForecastPlot from './WeatherForecastPlot';
import DefaultVisualizerPlot from './DefaultVisualizerPlot';
import PriceForecastPlot from "./PriceForecastPlot";
import HeatCallsPlot from "./HeatCallsPlot";
import type { DateTime } from "luxon";
import SessionContext from "../_util/SessionContext";
import { useContext } from "react";

interface VisualizerPlotProps {
    plotConfig: PlotConfig;
    selectedChannels: string[];
    readingsBundleData: ReadingsBundleApiResponse;
    installationGNode: string,
    startDate: DateTime,
    endDate: DateTime,
    showPoints: boolean,
    isDarkMode: boolean;
}

const defaultPlotConfig: Partial<Config> = {
    displayModeBar: false,
    responsive: true,
};

export default function VisualizerPlot(props: VisualizerPlotProps) {

    // const { plotConfig, readingsBundleData, selectedChannels, priceData, showPoints, isDarkMode } = props;

    const session = useContext(SessionContext);
    
    const plotParams: Partial<PlotParams> = {
        config: { 
            ...defaultPlotConfig,
        },
        style: { width: '100%', height: '100%' },
        useResizeHandler: true
    }

    const subPlotProps = {
        ...props,
        plotParams,
    }

    if (props.plotConfig.plotType === 'WeatherForecast') {
        // Only admin users get the weather forecast plot
        if (session?.isSystemAdmin) {
            return <WeatherForecastPlot {...subPlotProps} />
        } else {
            return null;
        }
    } else if (props.plotConfig.plotType === 'PriceForecast') {
        return <PriceForecastPlot {...subPlotProps} />
    } else if (props.plotConfig.plotType === 'HeatCalls') {
        return <HeatCallsPlot {...subPlotProps} />
    } else {
        return <DefaultVisualizerPlot {...subPlotProps} />
    }
}