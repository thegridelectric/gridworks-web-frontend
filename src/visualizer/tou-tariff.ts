import { DateTime } from "luxon";
import GridWorksApi from "../_util/GridWorksApi";
import { TouTariff } from "../sema/types/TouTariff";
import type { TouWindow } from "../sema/types/TouWindow";

export { TouTariff };

/** The fleet's tariff from the backend. */
export async function fetchTouTariff(): Promise<TouTariff> {
    const res = await GridWorksApi.get<unknown>("/api/v2/tou-tariff/current");
    return TouTariff.parse(res.data);
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

function atWallClock(day: DateTime, hhmm: string): DateTime {
    const [hour, minute] = hhmm.split(":").map(Number);
    return day.set({ hour, minute, second: 0, millisecond: 0 });
}
