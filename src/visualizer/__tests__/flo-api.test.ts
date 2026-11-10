import { describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import GridWorksApi from "../../_util/GridWorksApi";
import { fetchRecommendation } from "../flo-api";

const slot = { installationGNode: "d1.isone.ct.newhaven.orange1", time: DateTime.fromISO("2026-11-10T12:19:00Z") };

describe("fetchRecommendation", () => {
    it("reads the backend's 404 as no FLO in the slot, as a response", async () => {
        const get = vi.spyOn(GridWorksApi, "get").mockResolvedValue({
            status: 404,
            data: { detail: "No FLO was run in this hour" },
        });
        await expect(fetchRecommendation(slot)).resolves.toBeNull();
        const config = get.mock.calls[0][1]!;
        expect(config.validateStatus!(404)).toBe(true);
        expect(config.validateStatus!(500)).toBe(false);
        get.mockRestore();
    });

    it("reports any other failure with the interceptor's message", async () => {
        const get = vi.spyOn(GridWorksApi, "get").mockRejectedValue(new Error("Internal Server Error"));
        await expect(fetchRecommendation(slot)).rejects.toThrow("FLO request failed: Internal Server Error");
        get.mockRestore();
    });
});
