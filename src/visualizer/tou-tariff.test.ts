import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import { onPeakSpans, TouTariff } from "./tou-tariff";

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

const tariff: TouTariff = TouTariff.parse({
    Alias: "versant.a1.home.eco.bonus",
    DisplayName: "Home Eco Rate with Bonus Meter",
    TimezoneStr: "America/New_York",
    OnPeakWindows: [
        { Start: "07:00", End: "12:00", Days: [...weekdays], TypeName: "gw.tou.window", Version: "000" },
        { Start: "16:00", End: "20:00", Days: [...weekdays], TypeName: "gw.tou.window", Version: "000" },
    ],
    TypeName: "gw.tou.tariff",
    Version: "000",
});

const et = (iso: string) => DateTime.fromISO(iso, { zone: "America/New_York" });
const asIso = (spans: [DateTime, DateTime][]) => spans.map(([a, b]) => [a.toISO(), b.toISO()]);

describe("onPeakSpans", () => {
    it("lays both weekday windows over a weekday", () => {
        // Wednesday 2026-11-11
        const spans = onPeakSpans(tariff, et("2026-11-11T00:00"), et("2026-11-12T00:00"));
        expect(asIso(spans)).toEqual([
            [et("2026-11-11T07:00").toISO(), et("2026-11-11T12:00").toISO()],
            [et("2026-11-11T16:00").toISO(), et("2026-11-11T20:00").toISO()],
        ]);
    });

    it("has no spans on a weekend", () => {
        // Saturday 2026-11-14 to Sunday 2026-11-15
        expect(onPeakSpans(tariff, et("2026-11-14T00:00"), et("2026-11-16T00:00"))).toEqual([]);
    });

    it("clips a span to the range", () => {
        const spans = onPeakSpans(tariff, et("2026-11-11T10:30"), et("2026-11-11T17:15"));
        expect(asIso(spans)).toEqual([
            [et("2026-11-11T10:30").toISO(), et("2026-11-11T12:00").toISO()],
            [et("2026-11-11T16:00").toISO(), et("2026-11-11T17:15").toISO()],
        ]);
    });

    it("reads the windows in the tariff's zone whatever zone the range is in", () => {
        const start = DateTime.fromISO("2026-11-11T12:00Z"); // 07:00 ET
        const end = DateTime.fromISO("2026-11-11T17:00Z"); // 12:00 ET
        const spans = onPeakSpans(tariff, start, end);
        expect(spans).toHaveLength(1);
        expect(spans[0][0].toMillis()).toBe(start.toMillis());
        expect(spans[0][1].toMillis()).toBe(end.toMillis());
    });
});
