import { isAxiosError } from "axios";
import type { DateTime } from "luxon";
import GridWorksApi from "../_util/GridWorksApi";
import { StopgapPriceForecast } from "../sema/types/StopgapPriceForecast";

/** The price panel's series: the hours of the word's LMP list that fall in
 *  the window. The word's delivery list is not drawn. */
export type PriceSeries = {
    HourStartS: number[],
    LmpList: number[],
};

export const PriceSeriesNames: [keyof PriceSeries] = ['LmpList'];

/** The hours of the backend's latest forecast inside the window. The
 *  forecast covers the next 48 hours from the request, so a window in the
 *  past gets empty lists and a live window gets its last hours. */
export async function fetchPriceForecast(params: {
    startDate: DateTime;
    endDate: DateTime;
}): Promise<PriceSeries> {
    let forecast: StopgapPriceForecast;
    try {
        const res = await GridWorksApi.get<unknown>('/api/v2/price-forecast/latest');
        forecast = StopgapPriceForecast.parse(res.data);
    } catch (error: unknown) {
        const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
        const errMsg = detail || (error instanceof Error ? error.message : `Unknown error type ${typeof error}`);
        throw new Error(`Pricing request failed: ${errMsg}`);
    }
    const startS = params.startDate.toSeconds();
    const endS = params.endDate.toSeconds();
    const series: PriceSeries = { HourStartS: [], LmpList: [] };
    forecast.HourStartS.forEach((hourStartS, i) => {
        if (hourStartS < startS || hourStartS > endS) return;
        series.HourStartS.push(hourStartS);
        series.LmpList.push(forecast.LmpList[i]);
    });
    return series;
}
