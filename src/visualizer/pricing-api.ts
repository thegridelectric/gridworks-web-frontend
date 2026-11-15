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

/** The forecast as a step over [start, end], in USD/MWh: the slot in
 *  force at `start` (clamped to it), every slot that starts inside the
 *  window, and a closing point where the last of them ends or the window
 *  does, whichever is first, so a window inside one slot still draws a
 *  step. Empty when no slot covers any of the window. A slot ends where the
 *  next begins; the word's last slot takes the grid's last step. */
export function forecastSeries(forecast: PriceForecast, start: DateTime, end: DateTime): PriceSeries {
    const startS = start.toSeconds();
    const endS = end.toSeconds();
    const slots = forecast.SlotStartS;
    const series: PriceSeries = { HourStartS: [], ForecastList: [] };
    const slotEndS = (i: number): number =>
        i + 1 < slots.length ? slots[i + 1] : slots[i] + (slots.length > 1 ? slots[i] - slots[i - 1] : 3600);
    let lastShown = -1;
    slots.forEach((slotStartS, i) => {
        if (slotEndS(i) <= startS || slotStartS > endS) return;
        series.HourStartS.push(Math.max(slotStartS, startS));
        series.ForecastList.push(forecast.PriceX1000List[i] / 1000);
        lastShown = i;
    });
    if (lastShown >= 0) {
        series.HourStartS.push(Math.min(slotEndS(lastShown), endS));
        series.ForecastList.push(series.ForecastList[series.ForecastList.length - 1]);
    }
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
    // A 404 is the backend's "no forecast for this hour" and resolves as a
    // response here, so the app's response interceptor never rewraps it.
    try {
        const res = await GridWorksApi.get<unknown>(`/api/v2/installations/${installationGNode}/price-forecast`, {
            params: { time: startDate.toISO() },
            validateStatus: (status) => status === 200 || status === 404,
        });
        if (res.status === 404) {
            return { HourStartS: [], ForecastList: [] };
        }
        return forecastSeries(PriceForecast.parse(res.data), startDate, endDate);
    } catch (error: unknown) {
        const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
        const errMsg = detail || (error instanceof Error ? error.message : `Unknown error type ${typeof error}`);
        throw new Error(`Pricing request failed: ${errMsg}`);
    }
}
