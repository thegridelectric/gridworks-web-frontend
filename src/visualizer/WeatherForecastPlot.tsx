import Plot, { type PlotParams } from "react-plotly.js";
import React, { useEffect, useState } from "react";
import { formatForDisplay, formatHourStartSForDisplay, type PlotConfig } from "./plot-configs";
import { PlotlyWrapper } from "./PlotlyWrapper";
import { generateDefaultPlotInfo, type TraceWithData } from "./DefaultVisualizerPlot";
import type { DateTime } from "luxon";
import { fetchForecastRuns, type ForecastRuns } from "./weather-api";
import { houseWeatherBundle } from "./house-weather-bundles";


export interface WeatherForecastPlotParams {
    installationGNode: string,
    startDate: DateTime,
    endDate: DateTime,
    plotConfig: PlotConfig,
    plotParams: Partial<PlotParams>,
    showPoints: boolean,
    isDarkMode: boolean
}

const RDBU_REV = [
    '#67001f',
    '#b2182b',
    '#d6604d',
    '#f4a582',
    '#fddbc7',
    '#f7f7f7',
    '#d1e5f0',
    '#92c5de',
    '#4393c3',
    '#2166ac',
    '#053061'
];

/** Every temperature forecast run the house's bundle emitted over the
 *  window, the newest in red and the older ones fading by age. */
export default function WeatherForecastPlot(props: WeatherForecastPlotParams) {


    const { startDate, endDate, installationGNode } = props
    const [weatherData, setWeatherData] = useState<ForecastRuns | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [plotError, setPlotError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDataAsync = async () => {
            setIsLoading(true);
            setPlotError(null);
            setWeatherData(null);
            const bundleName = houseWeatherBundle(installationGNode);
            if (!bundleName) {
                setPlotError(`No weather bundle is known for ${installationGNode}`);
                setIsLoading(false);
                return;
            }
            try {
                const runs = await fetchForecastRuns({ bundleName, startDate, endDate, quantity: 'Temperature' });
                if (!runs) {
                    setPlotError(`Bundle ${bundleName} forecasts no temperature`);
                } else {
                    setWeatherData(runs);
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                setPlotError(message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDataAsync();

    }, [installationGNode, startDate, endDate])

    let content: React.ReactNode;
    if (weatherData) {
        const n = weatherData.runs.length;
        const tracesWithData: TraceWithData[] = weatherData.runs.map((run, idx) => ({
            seriesName: '',
            unit: weatherData.unit,
            xValues: run.sliceStartsS.map(formatHourStartSForDisplay),
            yValues: run.values,
            trace: {
                dataSeriesName: '',
                lineShape: 'hv' as const,
                opacity: idx === n - 1 ? 1 : 0.2,
                color: idx === n - 1 ? 'red' : RDBU_REV[Math.floor((idx / n) * (RDBU_REV.length - 1))]
            }
        }));

        const { plotlyData, plotlyLayout } = generateDefaultPlotInfo({
            plotConfig: props.plotConfig,
            tracesWithData,
            showPoints: props.showPoints,
            isDarkMode: props.isDarkMode,
            formattedStartDate: formatForDisplay(startDate),
            formattedEndDate: formatForDisplay(endDate)
        });
        content = <Plot data={plotlyData} layout={plotlyLayout} {...props.plotParams} />

    } else if (isLoading) {
        content = <div className="loader" aria-label="Loading weather forecasts" />;
    } else if (plotError) {
        content = <div className="alert alert-danger mt-3 mb-0" role="alert">{plotError}</div>
    }

    if (content) {
        return <PlotlyWrapper>{content}</PlotlyWrapper>
    }
}
