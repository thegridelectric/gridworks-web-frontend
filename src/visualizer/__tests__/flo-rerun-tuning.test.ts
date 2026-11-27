import { describe, expect, it } from "vitest";
import orange1Params001 from "../../sema/__tests__/fixtures/orange1-flo.params-001.json";
import exampleParams002 from "../../sema/__tests__/fixtures/registry-example-flo.params-002.json";
import exampleParams004 from "../../sema/__tests__/fixtures/registry-example-flo.params-004.json";
import exampleParams005 from "../../sema/__tests__/fixtures/registry-example-flo.params-005.json";
import { AnyFloParams } from "../../sema/types/AnyFloParams";
import {
    PENALTY_FIELDS,
    floRerunRequest,
    heatPumpModeTrackingEnabled,
    penaltyTuning,
    withPenaltyTuning,
} from "../flo-rerun-tuning";

const orange1 = AnyFloParams.parse(orange1Params001);
const example002 = AnyFloParams.parse(exampleParams002);
const example004 = AnyFloParams.parse(exampleParams004);
const example005 = AnyFloParams.parse(exampleParams005);

describe("the re-run's penalty tuning", () => {
    it("names the fifteen penalty fields of flo.tuning.bruce", () => {
        expect(PENALTY_FIELDS).toHaveLength(15);
        expect(new Set(PENALTY_FIELDS.map((f) => f.group))).toEqual(
            new Set(["RSWT penalty", "Unmet load penalty", "Short-cycle penalty", "Stability penalty"]),
        );
    });

    it("reads the hour's penalty tuning from a bruce request at either version", () => {
        for (const params of [orange1, example002]) {
            const tuning = penaltyTuning(params);
            expect(tuning).not.toBeNull();
            expect(Object.keys(tuning!).sort()).toEqual(PENALTY_FIELDS.map((f) => f.key).sort());
            expect(tuning!.StabilityPenaltyEnabled).toBe(params.Tuning.TypeName === "flo.tuning.bruce" && params.Tuning.StabilityPenaltyEnabled);
            expect(tuning!.UnmetLoadPenaltyEnabled).toBe(false);
            expect(tuning!.UnmetLoadPenaltyWeight).toBe(10);
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

    it("sends the edited params and the forced steps as flo.rerun.request", () => {
        const request = floRerunRequest(
            example002,
            { ...penaltyTuning(example002)!, RswtPenaltyWeight: 2.5 },
            [0],
            [1],
        );
        expect(request.TypeName).toBe("flo.rerun.request");
        expect(request.Version).toBe("003");
        expect(request.HpForcedOnSteps).toEqual([0]);
        expect(request.HpForcedOffSteps).toEqual([1]);
        expect(request.Params.Version).toBe("004");
        expect(request.Params.Tuning).toMatchObject({
            TypeName: "flo.tuning.bruce",
            Version: "003",
            RswtPenaltyWeight: 2.5,
            Experimental: {
                UnmetLoadPenaltyEnabled: false,
                UnmetLoadPenaltyWeight: 10,
                HeatPumpModeTrackingEnabled: true,
            },
        });
        expect(request.Params.Tuning).not.toHaveProperty("UnmetLoadPenaltyEnabled");
    });

    it("round-trips a 003 tuning's unmet-load knobs through Experimental, keeping its other keys", () => {
        const tuning = penaltyTuning(example004)!;
        expect(tuning.UnmetLoadPenaltyEnabled).toBe(true);
        expect(tuning.UnmetLoadPenaltyWeight).toBe(10);
        const word = structuredClone(exampleParams004);
        const sent = AnyFloParams.parse({ ...word, Tuning: { ...word.Tuning, Experimental: { ...word.Tuning.Experimental, OtherKnob: 3 } } });
        const edited = withPenaltyTuning(sent, { ...tuning, UnmetLoadPenaltyEnabled: false, UnmetLoadPenaltyWeight: 4.5 });
        expect(edited.Version).toBe("004");
        expect(edited.Tuning).toMatchObject({
            Version: "003",
            Experimental: {
                UnmetLoadPenaltyEnabled: false,
                UnmetLoadPenaltyWeight: 4.5,
                OtherKnob: 3,
                HeatPumpModeTrackingEnabled: true,
            },
        });
        expect(edited.Tuning).not.toHaveProperty("UnmetLoadPenaltyWeight");
        expect(penaltyTuning(edited)).toEqual({ ...tuning, UnmetLoadPenaltyEnabled: false, UnmetLoadPenaltyWeight: 4.5 });
    });

    it("reads mode tracking as on when the key is absent, and writes the choice beside the other knobs", () => {
        expect(heatPumpModeTrackingEnabled(example005)).toBe(true);
        const sent = AnyFloParams.parse({
            ...exampleParams005,
            Tuning: {
                ...exampleParams005.Tuning,
                Experimental: { ...exampleParams005.Tuning.Experimental, HeatPumpModeTrackingEnabled: false },
            },
        });
        expect(heatPumpModeTrackingEnabled(sent)).toBe(false);
        const edited = withPenaltyTuning(sent, penaltyTuning(sent)!, false);
        expect(edited.Tuning).toMatchObject({
            Experimental: { UnmetLoadPenaltyEnabled: true, UnmetLoadPenaltyWeight: 10, HeatPumpModeTrackingEnabled: false },
        });
        const broken = AnyFloParams.parse({
            ...exampleParams005,
            Tuning: {
                ...exampleParams005.Tuning,
                Experimental: { ...exampleParams005.Tuning.Experimental, HeatPumpModeTrackingEnabled: "no" },
            },
        });
        expect(heatPumpModeTrackingEnabled(broken)).toBeNull();
    });

    it("keeps a 005 request at 005, its COP fields as sent", () => {
        const edited = withPenaltyTuning(example005, { ...penaltyTuning(example005)!, RswtPenaltyWeight: 2.5 });
        expect(edited.Version).toBe("005");
        expect({ ...edited, Tuning: undefined }).toEqual({ ...example005, Tuning: undefined });
        expect(floRerunRequest(example005, penaltyTuning(example005)!, [], []).Params.Version).toBe("005");
    });

    it("refuses a step outside the horizon, or one forced both on and off", () => {
        const tuning = penaltyTuning(example002)!;
        const horizon = example002.StepDurationMinutes.length;
        expect(() => floRerunRequest(example002, tuning, [horizon], [])).toThrow();
        expect(() => floRerunRequest(example002, tuning, [0], [0])).toThrow();
    });
});
