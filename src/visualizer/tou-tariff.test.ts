import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import elm013 from "../sema/__tests__/fixtures/elm-layout.lite-013.json";
import { AnyHouseSummary } from "../sema/types/AnyHouseSummary";
import { layoutTariff, onPeakShapes, onPeakSpans, TouTariff } from "./tou-tariff";

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

/** The registry's first gw.house.summary 003 example, with a layout. */
const summaryWith = (layout: object) => AnyHouseSummary.parse({
    Role: "Viewer",
    TaGNodeId: "5d3e8f14-7a2b-4c6e-9f10-2b8d4e6a1c3f",
    GNodeAlias: "hw1.isone.me.versant.keene.elm",
    Layout: layout,
    SendTimeMs: 1792014000000,
    TypeName: "gw.house.summary",
    Version: "003",
});

describe("layoutTariff", () => {
    it("is the layout's Tariff when the layout is 014", () => {
        const summary = summaryWith({ ...elm013, Tariff: tariff, Version: "014" });
        expect(layoutTariff(summary)).toEqual(tariff);
    });

    it("is null for a 013 layout, a summary with no layout, and no summary", () => {
        expect(layoutTariff(summaryWith(elm013))).toBeNull();
        expect(layoutTariff(summaryWith(undefined as unknown as object))).toBeNull();
        expect(layoutTariff(undefined)).toBeNull();
    });
});

describe("onPeakShapes", () => {
    it("lays one full-height rectangle per span on the first time axis", () => {
        const shapes = onPeakShapes(tariff, et("2026-11-11T00:00"), et("2026-11-12T00:00"));
        expect(shapes.map((s) => [s.x0, s.x1])).toEqual([
            ["2026-11-11T07:00:00", "2026-11-11T12:00:00"],
            ["2026-11-11T16:00:00", "2026-11-11T20:00:00"],
        ]);
        expect(shapes.every((s) => s.xref === "x" && s.yref === "paper" && s.y0 === 0 && s.y1 === 1)).toBe(true);
    });
});
