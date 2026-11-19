import { describe, expect, it } from "vitest";
import type { SyncedReadingsBundle } from "../../sema/types/SyncedReadingsBundle";
import { actualLoadKw, distKw, distSamples, DIST_ENERGY_RHO } from "../dist-load";

describe("distribution load", () => {
    it("matches the hourly dist_kwh power term, then scales by rho", () => {
        const flowGpm = 10;
        const swtF = 140;
        const rwtF = 100;
        const deltaC = ((swtF - rwtF) * 5) / 9;
        const fromSql = (500 * flowGpm * deltaC * 9) / 5 / 3410;
        expect(distKw(flowGpm, swtF, rwtF)).toBeCloseTo(fromSql);

        const startS = 1_700_000_000;
        const load = actualLoadKw(
            [
                { timeS: startS + 10, flowGpm, swtF, rwtF },
                { timeS: startS + 20, flowGpm: 0, swtF, rwtF },
            ],
            [startS, startS + 3600],
            [60, 60],
        );
        expect(load[0]).toBeCloseTo((fromSql / 2) * DIST_ENERGY_RHO);
        expect(load[1]).toBeNull();
    });

    it("reads flow and the two temperatures off a readings bundle", () => {
        const bundle = {
            TimestampList: ["2026-11-09T19:00:00Z", "2026-11-09T19:01:00Z"],
            ChannelReadingsList: [
                { ChannelName: "dist-flow", Unit: "GpmTimes100", ValueList: [1000, null] },
                { ChannelName: "dist-swt", Unit: "CelsiusTimes100", ValueList: [6000, 6000] },
                { ChannelName: "dist-rwt", Unit: "CelsiusTimes100", ValueList: [4000, 4000] },
            ],
        } as SyncedReadingsBundle;
        const samples = distSamples(bundle);
        expect(samples).toHaveLength(1);
        expect(samples[0].flowGpm).toBeCloseTo(10);
        expect(samples[0].swtF).toBeCloseTo(140);
        expect(samples[0].rwtF).toBeCloseTo(104);
    });
});
