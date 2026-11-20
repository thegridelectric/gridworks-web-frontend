import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { AnyFloParams } from "../../sema/types/AnyFloParams";
import { AnyFloRecommendation } from "../../sema/types/AnyFloRecommendation";
import { defaultPairIndex } from "../flo-path-view";
import { pathCopAvgLwtFList, pathCopList, pathLwtFList } from "../flo-path-cop";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../../sema/__tests__/fixtures");

describe("pathCopList", () => {
    it("returns one COP per horizon step on the cheapest path", () => {
        const params = AnyFloParams.parse(
            JSON.parse(readFileSync(join(fixturesDir, "orange1-flo.params-001.json"), "utf8")),
        );
        const recommendation = AnyFloRecommendation.parse(
            JSON.parse(readFileSync(join(fixturesDir, "orange1-flo.recommendation-001.json"), "utf8")),
        );
        const pairIndex = defaultPairIndex(recommendation);
        const cop = pathCopList(params, recommendation, pairIndex);
        const avgLwt = pathCopAvgLwtFList(params, recommendation, pairIndex);
        const lwt = pathLwtFList(params, recommendation, pairIndex);
        expect(cop).not.toBeNull();
        expect(lwt).not.toBeNull();
        expect(avgLwt).not.toBeNull();
        expect(cop).toHaveLength(params.OatFList.length);
        const path = recommendation.OptimalPathList[pairIndex];
        cop!.forEach((value, t) => {
            if (path.HpAvgWList[t] <= 0) {
                expect(value).toBe(0);
            } else {
                expect(value).toBeGreaterThan(0);
            }
            expect(Number.isFinite(value)).toBe(true);
            if (path.HpAvgWList[t] <= 0) {
                expect(avgLwt![t]).toBe(0);
            } else {
                expect(avgLwt![t]).toBeCloseTo(lwt![t], 5);
            }
        });
        expect(cop!.some((value) => value > 0)).toBe(true);
    });
});