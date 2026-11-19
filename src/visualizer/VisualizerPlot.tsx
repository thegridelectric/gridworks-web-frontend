import { type PlotParams } from "react-plotly.js";
import type { Config } from 'plotly.js';
import { zoomAfterRelayout } from './plot-zoom';
import type { SyncedReadingsBundle } from '../sema/types/SyncedReadingsBundle';
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
    readingsBundleData: SyncedReadingsBundle;
    installationGNode: string,
    startDate: DateTime,
    endDate: DateTime,
    showPoints: boolean,
    isDarkMode: boolean;
    /** Hears true when the viewer zooms this plot in and false when the
     *  plot is back at its full range. */
    onZoomChange: (zoomed: boolean) => void;
}

const defaultPlotConfig: Partial<Config> = {
    displayModeBar: false,
    responsive: true,
};

export default function VisualizerPlot(props: VisualizerPlotProps) {

    const session = useContext(SessionContext);
    
    const plotParams: Partial<PlotParams> = {
        config: { 
            ...defaultPlotConfig,
        },
        style: { width: '100%', height: '100%' },
        useResizeHandler: true,
        onRelayout: (event) => {
            const zoomed = zoomAfterRelayout(event);
            if (zoomed !== null) props.onZoomChange(zoomed);
        },
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