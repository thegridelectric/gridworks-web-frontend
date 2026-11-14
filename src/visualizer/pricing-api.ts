import { isAxiosError } from "axios";
import type { DateTime } from "luxon";
import GridWorksApi from "../_util/GridWorksApi";
import { PriceForecast } from "../sema/types/PriceForecast";

/** The price panel's series: the forecast's slots inside the window and
 *  the forecast price of each, in USD/MWh. */
export type PriceSeries = {
    HourStartS: number[],
    ForecastList: number[],
};

export const PriceSeriesNames: [keyof PriceSeries] = ['ForecastList'];

/** The forecast's slots that start inside [start, end], with the price of
 *  each unscaled to USD/MWh. */
export function forecastSeries(forecast: PriceForecast, start: DateTime, end: DateTime): PriceSeries {
    const startS = start.toSeconds();
    const endS = end.toSeconds();
    const series: PriceSeries = { HourStartS: [], ForecastList: [] };
    forecast.SlotStartS.forEach((slotStartS, i) => {
        if (slotStartS < startS || slotStartS > endS) return;
        series.HourStartS.push(slotStartS);
        series.ForecastList.push(forecast.PriceX1000List[i] / 1000);
    });
    return series;
}

/** The price forecast the house had at the window's first hour, from the
 *  backend, cut to the window; empty series when the house had none. */
export async function fetchPriceForecast(params: {
    installationGNode: string;
    startDate: DateTime;
    endDate: DateTime;
}): Promise<PriceSeries> {
    const { installationGNode, startDate, endDate } = params;
    try {
        const res = await GridWorksApi.get<unknown>(`/api/v2/installations/${installationGNode}/price-forecast`, {
            params: { time: startDate.toISO() },
        });
        return forecastSeries(PriceForecast.parse(res.data), startDate, endDate);
    } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 404) {
            return { HourStartS: [], ForecastList: [] };
        }
        const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
        const errMsg = detail || (error instanceof Error ? error.message : `Unknown error type ${typeof error}`);
        throw new Error(`Pricing request failed: ${errMsg}`);
    }
}
