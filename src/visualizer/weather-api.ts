import { isAxiosError } from 'axios';
import type { DateTime } from 'luxon';
import GridWorksApi from '../_util/GridWorksApi';
import type { Quantity } from '../sema/enums/Quantity';
import { AnyWeatherForecast } from '../sema/types/AnyWeatherForecast';
import { WeatherForecastBundleGt } from '../sema/types/WeatherForecastBundleGt';

/** One emission of the bundle, for one quantity: the slice start times and
 *  the word's scaled integer values, plus the emission's creation time. */
export type ForecastRun = {
    createdMs: number;
    sliceStartsS: number[];
    values: number[];
};

/** A quantity's forecast runs from a bundle over a window, with the unit
 *  the values are scaled in (the bound observation channel's `Unit`). */
export type ForecastRuns = {
    unit: string;
    runs: ForecastRun[];
};

/** The runs of `quantity` in `forecasts`, on the slice grid of the bundle's
 *  forecast channel for that quantity, oldest first. The bundle binds each
 *  forecast channel to the observed channel whose unit scales the values.
 *  A bundle that binds no channel of the quantity has no runs. */
export function forecastRuns(bundle: WeatherForecastBundleGt, forecasts: AnyWeatherForecast[], quantity: Quantity): ForecastRuns | null {
    const binding = bundle.BindingList.find((b) => b.ObservationChannel.Quantity === quantity);
    if (!binding) return null;
    const channelName = binding.ForecastChannel.Name;
    const durations = binding.ForecastChannel.SliceDurationSList;
    const runs: ForecastRun[] = [];
    for (const forecast of forecasts) {
        const series = forecast.SeriesList.find((s) => s.ChannelName === channelName);
        if (!series) continue;
        const firstS = Date.parse(forecast.FirstSliceStart) / 1000;
        const sliceStartsS: number[] = [];
        let t = firstS;
        for (let i = 0; i < series.Values.length; i++) {
            sliceStartsS.push(t);
            t += durations[i] ?? durations[durations.length - 1];
        }
        runs.push({ createdMs: forecast.MessageCreatedMs, sliceStartsS, values: [...series.Values] });
    }
    runs.sort((a, b) => a.createdMs - b.createdMs);
    return { unit: binding.ObservationChannel.Unit, runs };
}

/** The bundle's record and the emissions the journal received from a day
 *  before the window start to its end, so the run in force at the window
 *  start is drawn too. */
export async function fetchForecastRuns(params: {
    bundleName: string;
    startDate: DateTime;
    endDate: DateTime;
    quantity: Quantity;
}): Promise<ForecastRuns | null> {
    const { bundleName, startDate, endDate, quantity } = params;
    try {
        const [bundleRes, forecastsRes] = await Promise.all([
            GridWorksApi.get<unknown>(`/api/v2/weather/bundles/${bundleName}`),
            GridWorksApi.get<unknown>(`/api/v2/weather/bundles/${bundleName}/forecasts`, {
                params: { start: startDate.minus({ hours: 24 }).toISO(), end: endDate.toISO() },
            }),
        ]);
        const bundle = WeatherForecastBundleGt.parse(bundleRes.data);
        const forecasts = AnyWeatherForecast.array().parse(forecastsRes.data);
        return forecastRuns(bundle, forecasts, quantity);
    } catch (error: unknown) {
        const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
        const errMsg = detail || (error instanceof Error ? error.message : `Unknown error type ${typeof error}`);
        throw new Error(`Weather request failed: ${errMsg}`);
    }
}
