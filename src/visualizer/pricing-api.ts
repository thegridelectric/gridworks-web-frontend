import { isAxiosError } from "axios";
import type { DateTime } from "luxon";
import GridWorksApi from "../_util/GridWorksApi";
import type { StopgapPriceForecast } from "../sema";

/** The price panel's series: the word's two price lists plus Total, a
 *  display sum of the two computed here (no word states a total price). */
export type PriceSeries = {
    HourStartS: number[],
    LmpList: number[],
    DistList: number[],
    TotalList: number[],
};

export const PriceSeriesNames: [keyof PriceSeries, keyof PriceSeries, keyof PriceSeries] = [
    'LmpList',
    'TotalList',
    'DistList',
]

/** The hours of the backend's latest forecast that fall inside the window.
 *  The forecast covers the next 48 hours from the request, so a window in
 *  the past gets empty lists. */
export async function fetchPriceForecast(params: {
    startDate: DateTime;
    endDate: DateTime;
}): Promise<PriceSeries> {
    let forecast: StopgapPriceForecast;
    try {
        const res = await GridWorksApi.get<StopgapPriceForecast>('/api/v2/price-forecast/latest');
        forecast = res.data;
    } catch (error: unknown) {
        const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
        const errMsg = detail || (error instanceof Error ? error.message : `Unknown error type ${typeof error}`);
        throw new Error(`Pricing request failed: ${errMsg}`);
    }
    const startS = params.startDate.toSeconds();
    const endS = params.endDate.toSeconds();
    const series: PriceSeries = { HourStartS: [], LmpList: [], DistList: [], TotalList: [] };
    forecast.HourStartS.forEach((hourStartS, i) => {
        if (hourStartS < startS || hourStartS > endS) return;
        series.HourStartS.push(hourStartS);
        series.LmpList.push(forecast.LmpList[i]);
        series.DistList.push(forecast.DistList[i]);
        series.TotalList.push(forecast.LmpList[i] + forecast.DistList[i]);
    });
    return series;
}
