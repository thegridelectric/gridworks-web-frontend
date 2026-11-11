import Plot, { type PlotParams } from "react-plotly.js";
import type { Shape } from "plotly.js";
import { fetchPriceForecast, PriceSeriesNames, type PriceSeries } from "./pricing-api";
import { fetchTouTariff, onPeakSpans, type TouTariff } from "./tou-tariff";
import React, { useEffect, useState } from "react";
import { formatForDisplay, formatHourStartSForDisplay, type PlotConfig } from "./plot-configs";
import { PlotlyWrapper } from "./PlotlyWrapper";
import { generateDefaultPlotInfo } from "./DefaultVisualizerPlot";
import type { DateTime } from "luxon";

/** The tariff's on-peak hours, shaded light pink behind the trace. */
const ON_PEAK_SHAPE: Partial<Shape> = {
    type: 'rect',
    xref: 'x',
    yref: 'paper',
    y0: 0,
    y1: 1,
    fillcolor: 'lightpink',
    opacity: 0.35,
    layer: 'below',
    line: { width: 0 }
};

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

    const { startDate, endDate } = props
    const [priceData, setPriceData] = useState<PriceSeries | null>(null);
    const [tariff, setTariff] = useState<TouTariff | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [plotError, setPlotError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDataAsync = async () => {
            setIsLoading(true);
            setPlotError(null);
            setPriceData(null);
            try {
                const [prices, touTariff] = await Promise.all([
                    fetchPriceForecast({ startDate, endDate }),
                    fetchTouTariff(),
                ]);
                setPriceData(prices);
                setTariff(touTariff);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                setPlotError(message);
            } finally {
                setIsLoading(false);
            }
        }
        fetchDataAsync();
        
    }, [startDate, endDate])

    let content: React.ReactNode;
    if (priceData && priceData.HourStartS.length === 0) {
        content = <div className="alert alert-secondary mt-3 mb-0" role="status">No price forecast in this window</div>
    } else if (priceData) {
        const pricesTimes = priceData.HourStartS.map(formatHourStartSForDisplay);
        const tracesWithData = PriceSeriesNames
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
        if (tariff) {
            plotlyLayout.shapes = onPeakSpans(tariff, startDate, endDate).map(([spanStart, spanEnd]): Partial<Shape> => ({
                ...ON_PEAK_SHAPE,
                x0: formatForDisplay(spanStart),
                x1: formatForDisplay(spanEnd),
            }));
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