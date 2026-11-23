import { describe, expect, it, vi } from "vitest";
import { DateTime } from "luxon";
import GridWorksApi from "../../_util/GridWorksApi";
import orange1Params001 from "../../sema/__tests__/fixtures/orange1-flo.params-001.json";
import orange1Recommendation001 from "../../sema/__tests__/fixtures/orange1-flo.recommendation-001.json";
import { AnyFloParams } from "../../sema/types/AnyFloParams";
import { FloRerunRequest } from "../../sema/types/FloRerunRequest";
import { fetchRecommendation, probeRerun, rerun } from "../flo-api";

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

describe("probeRerun", () => {
    it("reads 405 on the POST-only path as the route being mounted", async () => {
        const get = vi.spyOn(GridWorksApi, "get").mockResolvedValue({ status: 405, data: { detail: "Method Not Allowed" } });
        await expect(probeRerun(slot.installationGNode)).resolves.toBe(true);
        expect(get.mock.calls[0][0]).toBe(`/api/v2/installations/${slot.installationGNode}/flo.rerun`);
        get.mockRestore();
    });

    it("reads 404 as no route, and any failure the same way", async () => {
        const get = vi.spyOn(GridWorksApi, "get").mockResolvedValue({ status: 404, data: { detail: "Not Found" } });
        await expect(probeRerun(slot.installationGNode)).resolves.toBe(false);
        get.mockRejectedValue(new Error("Network Error"));
        await expect(probeRerun(slot.installationGNode)).resolves.toBe(false);
        get.mockRestore();
    });
});

describe("rerun", () => {
    const params = AnyFloParams.parse(orange1Params001);
    const request = FloRerunRequest.parse({
        Params: params,
        HpForcedOnSteps: [1],
        HpForcedOffSteps: [0],
        TypeName: "flo.rerun.request",
        Version: "002",
    });

    it("posts the word to the house in its GNodeAlias and parses the recommendation", async () => {
        const post = vi.spyOn(GridWorksApi, "post").mockResolvedValue({ status: 200, data: orange1Recommendation001 });
        const answer = await rerun(request);
        expect(answer.OptimalPathList.length).toBeGreaterThan(0);
        expect(post.mock.calls[0][0]).toBe(`/api/v2/installations/${params.GNodeAlias}/flo.rerun`);
        expect(post.mock.calls[0][1]).toBe(request);
        post.mockRestore();
    });

    it("reports the backend's detail when bruce could not solve", async () => {
        const post = vi.spyOn(GridWorksApi, "post").mockRejectedValue(new Error("bruce reads flo.params 002 and this is 001"));
        await expect(rerun(request)).rejects.toThrow("FLO re-run failed: bruce reads flo.params 002 and this is 001");
        post.mockRestore();
    });
});
