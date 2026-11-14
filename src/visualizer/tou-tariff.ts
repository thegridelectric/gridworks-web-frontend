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

/** The tariff's on-peak hours as light pink blocks behind a plot's
 *  traces, over the full height of the plot, on its first time axis. */
export function onPeakShapes(tariff: TouTariff, start: DateTime, end: DateTime): Partial<Shape>[] {
    return onPeakSpans(tariff, start, end).map(([spanStart, spanEnd]) => ({
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: formatForDisplay(spanStart),
        x1: formatForDisplay(spanEnd),
        y0: 0,
        y1: 1,
        fillcolor: "lightpink",
        opacity: 0.35,
        layer: "below",
        line: { width: 0 },
    }));
}

function atWallClock(day: DateTime, hhmm: string): DateTime {
    const [hour, minute] = hhmm.split(":").map(Number);
    return day.set({ hour, minute, second: 0, millisecond: 0 });
}
