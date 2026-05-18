



import Plot, { type PlotParams } from "react-plotly.js";
import { fetchPriceForecast, PriceForecastApiResponseSeriesNames, type PriceForecastApiReponse } from "./pricing-api";
import React, { useEffect, useState } from "react";
import { formatForDisplay, formatHourStartSForDisplay, formatIsoTimeForDisplay, type PlotConfig } from "./plot-configs";
import { PlotlyWrapper } from "./PlotlyWrapper";
import { generateDefaultPlotInfo, type TraceWithData } from "./DefaultVisualizerPlot";
import type { DateTime } from "luxon";
import { fetchMessages } from "./messages-api";


export interface WeatherForecastPlotParams {
    houseAlias: string,
    startDate: DateTime,
    endDate: DateTime,
    plotConfig: PlotConfig,
    plotParams: Partial<PlotParams>,
    showPoints: boolean,
    isDarkMode: boolean
}

interface WeatherForecastMessage {
    // Note that we are ignoring the time included in the message, 
    // and assuming that the time intervals are always 1 hour
    // Time: number[],
    OatF: number[],
    ForecastCreatedS: number,
}

interface WeatherForecastRun {
    times_ms: number[];
    oat_f: number[];
    run_index: number;
    is_latest: boolean;
}

export function parseWeatherForecastMessages(weatherForecasts: WeatherForecastMessage[]): WeatherForecastRun[] {
    // Deduplicate by hour, keeping the last message per hour (same as dict assignment in Python).
    const oatForecasts = new Map<number, number[]>();
    for (const message of weatherForecasts) {
        const forecastStartTime = Math.floor(message.ForecastCreatedS / 3600) * 3600;
        oatForecasts.set(forecastStartTime, message.OatF);
    }

    const runs: WeatherForecastRun[] = [];
    const n = oatForecasts.size;
    let i = 0;
    for (const [weatherTime, oat] of oatForecasts) {
        const timesS = Array.from({ length: oat.length }, (_, j) => weatherTime + 3600 * j);
        runs.push({
            times_ms: timesS.map((t) => t * 1000),
            oat_f: [...oat],
            run_index: i,
            is_latest: i === n - 1,
        });
        i++;
    }

    return runs;
}



// function parseWeatherForecastData(messages: any[]): WeatherForecastPlotData {
//     // const result: WeatherForecastPlotData = {
//     //     timestamps: [],
//     //     latestOatForecast: [],
//     //     priorOatForecasts: [],
//     // }


//     const oat_forecasts: Record<number, number[]> = {}
//     // Messages will be sorted by ascending ForecastCreatedS
//     for (const msg of messages) {
//         const forecastMessage = msg as WeatherForecastMessage;
//         if (forecastMessage) {
//             const forecast_start_time = Math.floor(forecastMessage.ForecastCreatedS / 3600) * 3600;
//             oat_forecasts[forecast_start_time] = forecastMessage.OatF
//         }
//     }

//     const runs = []
//     const n = Object.keys(oat_forecasts).length;
//     for (let i = 0; i < n; i++) {

//     for i, weather_time in enumerate(oat_forecasts):
//         oat = oat_forecasts[weather_time]
//         times_s = [int(weather_time) + 3600 * j for j in range(len(oat))]
//         runs.append({
//             'times_ms': [t * 1000 for t in times_s],
//             'oat_f': list(oat),
//             'run_index': i,
//             'is_latest': i == n - 1,
//         })



//     for (const msg of messages) {
//     }
// }


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

export default function WeatherForecastPlot(props: WeatherForecastPlotParams) {


    const { startDate, endDate, houseAlias } = props
    const [weatherData, setWeatherData] = useState<WeatherForecastRun[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [plotError, setPlotError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDataAsync = async () => {
            setIsLoading(true);
            setPlotError(null);
            setWeatherData(null);
            try {
                const apiResult = await fetchMessages({
                    houseAlias,
                    startDate: startDate.minus({ hours: 24 }),
                    endDate,
                    messageTypes: ['weather.forecast']
                });
                const weatherMessages = apiResult.map(r => r as WeatherForecastMessage).filter(m => !!m);
                const parsedData = parseWeatherForecastMessages(weatherMessages);
                setWeatherData(parsedData);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                setPlotError(message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDataAsync();

    }, [houseAlias, startDate, endDate])

    let content: React.ReactNode;
    if (weatherData) {
        const tracesWithData: TraceWithData[] = weatherData.map((data, idx) => ({
            seriesName: '',
            unit: undefined,
            xValues: data.times_ms.map(ms => formatHourStartSForDisplay(ms / 1000)),
            yValues: data.oat_f,
            trace: {
                dataSeriesName: '',
                lineShape: 'hv' as const,
                opacity: data.is_latest ? 1 : 0.2,
                color: data.is_latest ? 'red' : RDBU_REV[Math.floor((idx / weatherData.length) * (RDBU_REV.length - 1))]
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
        content = <div className="loader" aria-label="Loading price data" />;
    } else if (plotError) {
        content = <div className="alert alert-danger mt-3 mb-0" role="alert">{plotError}</div>
    }

    if (content) {
        return <PlotlyWrapper>{content}</PlotlyWrapper>
    }
}