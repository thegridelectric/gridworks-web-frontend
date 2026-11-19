import { DateTime } from "luxon";
import type { Shape } from "plotly.js";
import GridWorksApi from "../_util/GridWorksApi";
import type { AnyHouseSummary } from "../sema/types/AnyHouseSummary";
import { TouTariff } from "../sema/types/TouTariff";
import type { TouWindow } from "../sema/types/TouWindow";
import { formatForDisplay } from "./plot-configs";

export { TouTariff };

/** The fleet's tariff from the backend. */
export async function fetchTouTariff(): Promise<TouTariff> {
    const res = await GridWorksApi.get<unknown>("/api/v2/tou-tariff/current");
    return TouTariff.parse(res.data);
}

/** The tariff the house's layout states, when the layout is `layout.lite`
 *  014; null for an older layout, which states no tariff. */
export function layoutTariff(summary: AnyHouseSummary | undefined): TouTariff | null {
    const layout = summary?.Layout;
    return layout?.Version === "014" ? layout.Tariff : null;
}

/** The tariff the house is billed on: its layout's, else the fleet's one
 *  tariff. The fleet fallback stands in for a house whose latest layout is
 *  older than 014 and retires when every house's layout states its
 *  `Tariff`. */
export async function tariffForHouse(summary: AnyHouseSummary | undefined): Promise<TouTariff> {
    return layoutTariff(summary) ?? await fetchTouTariff();
}

/** The on-peak spans inside [start, end], as the tariff's windows recur on
 *  their days in the tariff's zone, clipped to the range. */
export function onPeakSpans(tariff: TouTariff, start: DateTime, end: DateTime): [DateTime, DateTime][] {
    const spans: [DateTime, DateTime][] = [];
    let day = start.setZone(tariff.TimezoneStr).startOf("day");
    const last = end.setZone(tariff.TimezoneStr);
    while (day <= last) {
        const weekday = day.weekdayLong as TouWindow["Days"][number];
        for (const window of tariff.OnPeakWindows) {
            if (!window.Days.includes(weekday)) continue;
            const spanStart = DateTime.max(atWallClock(day, window.Start), start);
            const spanEnd = DateTime.min(atWallClock(day, window.End), end);
            if (spanStart < spanEnd) spans.push([spanStart, spanEnd]);
        }
        day = day.plus({ days: 1 });
    }
    return spans;
}

/** The one fill for an on-peak hour wherever the page marks one: the
 *  price panel's bands, the FLO plot's bands and the horizon bars. */
export const ON_PEAK_FILL = "rgba(255, 182, 193, 0.35)";

/** The tariff's on-peak hours as light pink blocks behind a plot's
 *  traces, on its first time axis, over the full height of the plot or
 *  of the one y axis `yref` names. */
export function onPeakShapes(tariff: TouTariff, start: DateTime, end: DateTime, yref: "paper" | "y domain" = "paper"): Partial<Shape>[] {
    return onPeakSpans(tariff, start, end).map(([spanStart, spanEnd]) => ({
        type: "rect",
        xref: "x",
        yref,
        x0: formatForDisplay(spanStart),
        x1: formatForDisplay(spanEnd),
        y0: 0,
        y1: 1,
        fillcolor: ON_PEAK_FILL,
        layer: "below",
        line: { width: 0 },
    }));
}

/** Whether the instant is inside one of the tariff's on-peak windows. */
export function isOnPeak(tariff: TouTariff, at: DateTime): boolean {
    return onPeakSpans(tariff, at, at.plus({ seconds: 1 })).length > 0;
}

/** For each step, whether its start is on-peak. */
export function onPeakStepMask(tariff: TouTariff, stepStartS: number[]): boolean[] {
    return stepStartS.map((s) => isOnPeak(tariff, DateTime.fromSeconds(s)));
}

/** The on-peak delivery premium, USD/MWh: what an on-peak hour pays in
 *  delivery over an off-peak one. One hack constant: Versant A-1 (page
 *  6.1.1 Seventeenth Revision, effective 2026-07-01) has on-peak delivery
 *  at 588.53 in winter and 574.18 the rest of the year against 58.56
 *  off-peak, and the shoulder is 6 over off-peak, so one round figure
 *  serves the page. `gw.tou.tariff` 000 states the windows and no prices;
 *  a tariff word that states each period's delivery price retires this. */
export const ON_PEAK_DELIVERY_PREMIUM_USD_MWH = 530;

/** The delivery premium an hour starting at `at` pays over an off-peak
 *  one under the tariff, USD/MWh: the premium on-peak, zero otherwise. */
export function onPeakDeliveryPremiumUsdMwh(tariff: TouTariff, at: DateTime): number {
    return isOnPeak(tariff, at) ? ON_PEAK_DELIVERY_PREMIUM_USD_MWH : 0;
}

/** The prices with the on-peak delivery premium taken out of every
 *  on-peak step, so each step reads as if it paid the off-peak delivery
 *  charge: the price variation shows at one scale and the on-peak
 *  hours are the bands. `stepStartS[i]` is the start of the step
 *  `pricesUsdMwh[i]` prices. */
export function flatDeliveryPrices(tariff: TouTariff, stepStartS: number[], pricesUsdMwh: number[]): number[] {
    return pricesUsdMwh.map((price, i) => price - onPeakDeliveryPremiumUsdMwh(tariff, DateTime.fromSeconds(stepStartS[i])));
}

function atWallClock(day: DateTime, hhmm: string): DateTime {
    const [hour, minute] = hhmm.split(":").map(Number);
    return day.set({ hour, minute, second: 0, millisecond: 0 });
}
