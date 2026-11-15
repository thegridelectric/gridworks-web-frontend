import { isAxiosError } from "axios";
import type { DateTime } from "luxon";
import GridWorksApi from "../_util/GridWorksApi";
import { LatestPrice, slotStartS } from "../sema/types/LatestPrice";
import { PriceForecast } from "../sema/types/PriceForecast";

/** The price panel's forecast series: the forecast's slots inside the
 *  window and the forecast price of each, in USD/MWh. */
export type PriceSeries = {
    HourStartS: number[],
    ForecastList: number[],
};

/** The price panel's real-time series: the slots the market cleared inside
 *  the window and the price each cleared at, in USD/MWh. */
export type RealTimeSeries = {
    HourStartS: number[],
    RealTimeList: number[],
};

/** The forecast the panel draws and the market it names, `<commodity>.
 *  <product>.<maker alias>`, the prefix of the market's slot names; null
 *  when the house had no forecast at the window start. */
export type PriceForecastResult = {
    series: PriceSeries,
    market: string | null,
};

/** The slot length of the market's product. Every product the fleet clears
 *  is hourly; the product's slot length is a fact of gw.market.product.name,
 *  and a word stating it retires this constant. */
const SLOT_S = 3600;

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

/** The cleared prices as a step over [start, end], in USD/MWh: each slot
 *  from its start (clamped to `start`) to the next slot's start, or one
 *  slot length on, and a closing point where the last ends or the window
 *  does. The step runs across a slot the market did not clear. */
export function realTimeSeries(prices: LatestPrice[], start: DateTime, end: DateTime): RealTimeSeries {
    const startS = start.toSeconds();
    const endS = end.toSeconds();
    const sorted = [...prices].sort((a, b) => slotStartS(a) - slotStartS(b));
    const series: RealTimeSeries = { HourStartS: [], RealTimeList: [] };
    const slotEndS = (i: number): number =>
        i + 1 < sorted.length ? slotStartS(sorted[i + 1]) : slotStartS(sorted[i]) + SLOT_S;
    let lastShown = -1;
    sorted.forEach((price, i) => {
        const slotS = slotStartS(price);
        if (slotEndS(i) <= startS || slotS > endS) return;
        series.HourStartS.push(Math.max(slotS, startS));
        series.RealTimeList.push(price.PriceX1000 / 1000);
        lastShown = i;
    });
    if (lastShown >= 0) {
        series.HourStartS.push(Math.min(slotEndS(lastShown), endS));
        series.RealTimeList.push(series.RealTimeList[series.RealTimeList.length - 1]);
    }
    return series;
}

/** The market a forecast prices: the slot-name prefix of its maker's product. */
export function marketOf(forecast: PriceForecast): string {
    return `e.${forecast.ProductName}.${forecast.MarketMakerAlias}`;
}

/** The prices `market` cleared at over the window, from the backend, as a
 *  step cut to the window; empty series when it cleared nothing. */
export async function fetchLatestPrices(params: {
    market: string;
    startDate: DateTime;
    endDate: DateTime;
}): Promise<RealTimeSeries> {
    const { market, startDate, endDate } = params;
    try {
        const res = await GridWorksApi.get<unknown>(`/api/v2/markets/${market}/latest-prices`, {
            params: { start: startDate.toISO(), end: endDate.toISO() },
        });
        return realTimeSeries(LatestPrice.array().parse(res.data), startDate, endDate);
    } catch (error: unknown) {
        const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
        const errMsg = detail || (error instanceof Error ? error.message : `Unknown error type ${typeof error}`);
        throw new Error(`Real-time price request failed: ${errMsg}`);
    }
}

/** The price forecast the house had at the window's first hour, from the
 *  backend, cut to the window, with the market it names; an empty series
 *  and no market when the house had none. */
export async function fetchPriceForecast(params: {
    installationGNode: string;
    startDate: DateTime;
    endDate: DateTime;
}): Promise<PriceForecastResult> {
    const { installationGNode, startDate, endDate } = params;
    // A 404 is the backend's "no forecast for this hour" and resolves as a
    // response here, so the app's response interceptor never rewraps it.
    try {
        const res = await GridWorksApi.get<unknown>(`/api/v2/installations/${installationGNode}/price-forecast`, {
            params: { time: startDate.toISO() },
            validateStatus: (status) => status === 200 || status === 404,
        });
        if (res.status === 404) {
            return { series: { HourStartS: [], ForecastList: [] }, market: null };
        }
        const forecast = PriceForecast.parse(res.data);
        return { series: forecastSeries(forecast, startDate, endDate), market: marketOf(forecast) };
    } catch (error: unknown) {
        const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
        const errMsg = detail || (error instanceof Error ? error.message : `Unknown error type ${typeof error}`);
        throw new Error(`Pricing request failed: ${errMsg}`);
    }
}
