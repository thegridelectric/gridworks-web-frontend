import Plot, { type PlotParams } from "react-plotly.js";
import { fetchPriceForecast, PriceForecastApiResponseSeriesNames, type PriceForecastApiReponse } from "./pricing-api";
import React, { useEffect, useState } from "react";
import { formatForDisplay, formatHourStartSForDisplay, type PlotConfig } from "./plot-configs";
import { PlotlyWrapper } from "./PlotlyWrapper";
import { generateDefaultPlotInfo } from "./DefaultVisualizerPlot";
import type { DateTime } from "luxon";

export interface PriceForecastPlotParams {
    houseAlias: string,
    startDate: DateTime,
    endDate: DateTime,
    plotConfig: PlotConfig,
    plotParams: Partial<PlotParams>,
    showPoints: boolean,
    isDarkMode: boolean
}

export default function PriceForecastPlot(props: PriceForecastPlotParams) {

    const { startDate, endDate, houseAlias } = props
    const [priceData, setPriceData] = useState<PriceForecastApiReponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [plotError, setPlotError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDataAsync = async () => {
            setIsLoading(true);
            setPlotError(null);
            setPriceData(null);
            try {
                const apiResult = await fetchPriceForecast({
                    houseAlias,
                    startDate,
                    endDate
                });
                setPriceData(apiResult as PriceForecastApiReponse);
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
    if (priceData) {
        const pricesTimes = priceData.HourStartS.map(formatHourStartSForDisplay);
        const tracesWithData = PriceForecastApiResponseSeriesNames
            .map(seriesName => ({
                seriesName,
                unit: 'DollarsPerMWh',
                xValues: pricesTimes,
                yValues: priceData[seriesName],
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