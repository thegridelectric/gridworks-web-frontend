import { describe, expect, it } from "vitest";
import orange1Params001 from "../../sema/__tests__/fixtures/orange1-flo.params-001.json";
import exampleParams002 from "../../sema/__tests__/fixtures/registry-example-flo.params-002.json";
import { AnyFloParams } from "../../sema/types/AnyFloParams";
import { PENALTY_FIELDS, penaltyTuning, withPenaltyTuning } from "../flo-rerun-tuning";

const orange1 = AnyFloParams.parse(orange1Params001);
const example002 = AnyFloParams.parse(exampleParams002);

describe("the re-run's penalty tuning", () => {
    it("names the thirteen penalty fields of flo.tuning.bruce", () => {
        expect(PENALTY_FIELDS).toHaveLength(13);
        expect(new Set(PENALTY_FIELDS.map((f) => f.group))).toEqual(new Set(["RSWT penalty", "Short-cycle penalty", "Stability penalty"]));
    });

    it("reads the hour's penalty tuning from a bruce request at either version", () => {
        for (const params of [orange1, example002]) {
            const tuning = penaltyTuning(params);
            expect(tuning).not.toBeNull();
            expect(Object.keys(tuning!).sort()).toEqual(PENALTY_FIELDS.map((f) => f.key).sort());
            expect(tuning!.StabilityPenaltyEnabled).toBe(params.Tuning.TypeName === "flo.tuning.bruce" && params.Tuning.StabilityPenaltyEnabled);
        }
    });

    it("puts the edits into the word and leaves the rest of the request as sent", () => {
        const edited = withPenaltyTuning(orange1, { ...penaltyTuning(orange1)!, StabilityPenaltyEnabled: false, RswtPenaltyWeight: 2.5 });
        expect(edited.Tuning.TypeName).toBe("flo.tuning.bruce");
        if (edited.Tuning.TypeName === "flo.tuning.bruce") {
            expect(edited.Tuning.StabilityPenaltyEnabled).toBe(false);
            expect(edited.Tuning.RswtPenaltyWeight).toBe(2.5);
            expect(edited.Tuning.NumLayers).toBe(orange1.Tuning.TypeName === "flo.tuning.bruce" ? orange1.Tuning.NumLayers : -1);
        }
        expect({ ...edited, Tuning: undefined }).toEqual({ ...orange1, Tuning: undefined });
    });

    it("refuses an edit that breaks the word", () => {
        expect(() => withPenaltyTuning(orange1, { ...penaltyTuning(orange1)!, StabilityPenaltyHorizonHours: -1 })).toThrow();
    });
});
