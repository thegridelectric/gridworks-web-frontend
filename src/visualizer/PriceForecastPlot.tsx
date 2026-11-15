import Plot, { type PlotParams } from "react-plotly.js";
import { fetchLatestPrices, fetchPriceForecast, type PriceSeries, type RealTimeSeries } from "./pricing-api";
import { onPeakShapes, tariffForHouse, type TouTariff } from "./tou-tariff";
import React, { useContext, useEffect, useState } from "react";
import SessionContext, { installationRoleForGNode } from "../_util/SessionContext";
import { formatForDisplay, formatHourStartSForDisplay, type PlotConfig } from "./plot-configs";
import { PlotlyWrapper } from "./PlotlyWrapper";
import { generateDefaultPlotInfo } from "./DefaultVisualizerPlot";
import type { DateTime } from "luxon";

export interface PriceForecastPlotParams {
    installationGNode: string,
    startDate: DateTime,
    endDate: DateTime,
    plotConfig: PlotConfig,
    plotParams: Partial<PlotParams>,
    showPoints: boolean,
    isDarkMode: boolean
}

export default function PriceForecastPlot(props: PriceForecastPlotParams) {

    const { installationGNode, startDate, endDate } = props
    const session = useContext(SessionContext);
    const summary = installationRoleForGNode(session?.installations, installationGNode);
    const [priceData, setPriceData] = useState<PriceSeries | null>(null);
    const [realTime, setRealTime] = useState<RealTimeSeries | null>(null);
    const [tariff, setTariff] = useState<TouTariff | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [plotError, setPlotError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDataAsync = async () => {
            setIsLoading(true);
            setPlotError(null);
            setPriceData(null);
            setRealTime(null);
            try {
                const [forecast, touTariff] = await Promise.all([
                    fetchPriceForecast({ installationGNode, startDate, endDate }),
                    tariffForHouse(summary),
                ]);
                // The real-time trace is the market the forecast names; with
                // no forecast the panel knows no market and draws none.
                const cleared = forecast.market === null
                    ? { HourStartS: [], RealTimeList: [] }
                    : await fetchLatestPrices({ market: forecast.market, startDate, endDate });
                setPriceData(forecast.series);
                setRealTime(cleared);
                setTariff(touTariff);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                setPlotError(message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDataAsync();
        
    }, [installationGNode, startDate, endDate, summary])

    let content: React.ReactNode;
    if (priceData && realTime && priceData.HourStartS.length === 0 && realTime.HourStartS.length === 0) {
        content = <div className="alert alert-secondary mt-3 mb-0" role="status">No price forecast in this window</div>
    } else if (priceData && realTime) {
        const series: { seriesName: string, xS: number[], yValues: number[] }[] = [
            { seriesName: 'ForecastList', xS: priceData.HourStartS, yValues: priceData.ForecastList },
            { seriesName: 'RealTimeList', xS: realTime.HourStartS, yValues: realTime.RealTimeList },
        ];
        const tracesWithData = series
            .filter(x => x.xS.length > 0)
            .map(({ seriesName, xS, yValues }) => ({
                seriesName,
                unit: 'DollarsPerMWh',
                xValues: xS.map(formatHourStartSForDisplay),
                yValues,
                trace: props.plotConfig.traces?.find(t => t.dataSource === 'prices' && t.dataSeriesName === seriesName)
            }))
            .filter(x => x.trace);
    
        const {plotlyData, plotlyLayout} = generateDefaultPlotInfo({
            plotConfig: props.plotConfig,
            tracesWithData,
            showPoints: props.showPoints,
            isDarkMode: props.isDarkMode,
            formattedStartDate: formatForDisplay(startDate),
            formattedEndDate: formatForDisplay(endDate)
        });
        // A price reads against zero; autorange on a flat hour would zoom into
        // a band a dollar wide.
        plotlyLayout.yaxis = { ...plotlyLayout.yaxis, rangemode: 'tozero' };
        if (tariff) {
            plotlyLayout.shapes = onPeakShapes(tariff, startDate, endDate);
        }
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