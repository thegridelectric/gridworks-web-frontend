import { AnyFloParams } from "../sema/types/AnyFloParams";
import { FloRerunRequest } from "../sema/types/FloRerunRequest";
import type { FloTuningBruce } from "../sema/types/FloTuningBruce";

/** The penalty fields of `flo.tuning.bruce` a re-run may change, grouped
 *  under the penalty each tunes; the group names are the series names the
 *  FLO plot draws the penalties with. */
export const PENALTY_FIELDS = [
    { key: "RswtPenaltyEnabled", group: "RSWT penalty", label: "Enabled" },
    { key: "RswtPenaltyWeight", group: "RSWT penalty", label: "Weight" },
    { key: "RswtPenaltyDecay", group: "RSWT penalty", label: "Decay" },
    { key: "RswtPenaltyExponentRate", group: "RSWT penalty", label: "Exponent rate" },
    { key: "RswtPenaltyDecayMaxHour", group: "RSWT penalty", label: "Decay max hour" },
    { key: "UnmetLoadPenaltyEnabled", group: "Unmet load penalty", label: "Enabled" },
    { key: "UnmetLoadPenaltyWeight", group: "Unmet load penalty", label: "Weight" },
    { key: "ShortCyclePenaltyEnabled", group: "Short-cycle penalty", label: "Enabled" },
    { key: "ShortCyclePenaltyWeight", group: "Short-cycle penalty", label: "Weight" },
    { key: "StabilityPenaltyEnabled", group: "Stability penalty", label: "Enabled" },
    { key: "StabilityPenaltyWeight", group: "Stability penalty", label: "Weight" },
    { key: "StabilityPenaltyDecay", group: "Stability penalty", label: "Decay" },
    { key: "StabilityPenaltyThresholdKwh", group: "Stability penalty", label: "Threshold [kWh]" },
    { key: "StabilityPenaltyThresholdPriceMwh", group: "Stability penalty", label: "Threshold price [$/MWh]" },
    { key: "StabilityPenaltyHorizonHours", group: "Stability penalty", label: "Horizon [h]" },
] as const;

export type PenaltyKey = (typeof PENALTY_FIELDS)[number]["key"];
export type PenaltyTuning = Pick<FloTuningBruce, PenaltyKey>;

const UNMET_LOAD_OFF: Pick<FloTuningBruce, "UnmetLoadPenaltyEnabled" | "UnmetLoadPenaltyWeight"> = {
    UnmetLoadPenaltyEnabled: false,
    UnmetLoadPenaltyWeight: 10,
};

/** The penalty tuning the hour's request was solved with, or null when
 *  the request's Tuning is not bruce's and no re-run can change it. */
export function penaltyTuning(params: AnyFloParams): PenaltyTuning | null {
    const tuning = params.Tuning;
    if (tuning.TypeName !== "flo.tuning.bruce") {
        return null;
    }
    const withUnmetLoad = tuning.Version === "002" ? tuning : { ...tuning, ...UNMET_LOAD_OFF };
    return Object.fromEntries(PENALTY_FIELDS.map((f) => [f.key, withUnmetLoad[f.key]])) as PenaltyTuning;
}

/** The hour's request with its bruce Tuning's penalty fields replaced, as
 *  a `flo.params` word the backend's codec reads: validated here so an
 *  edit that breaks the word is refused before it is sent. A 002 request
 *  becomes 003; a 001 request stays 001. */
export function withPenaltyTuning(params: AnyFloParams, tuning: PenaltyTuning): AnyFloParams {
    if (params.Tuning.TypeName !== "flo.tuning.bruce") {
        throw new Error(`A re-run edits flo.tuning.bruce; this request's Tuning is ${params.Tuning.TypeName}`);
    }
    if (params.Version === "001") {
        const kept = Object.fromEntries(
            Object.entries(tuning).filter(([key]) => key !== "UnmetLoadPenaltyEnabled" && key !== "UnmetLoadPenaltyWeight"),
        );
        return AnyFloParams.parse({ ...params, Tuning: { ...params.Tuning, ...kept } });
    }
    return AnyFloParams.parse({
        ...params,
        Version: "003",
        Tuning: { ...params.Tuning, ...tuning, Version: "002" },
    });
}

/** The hour's request, with its bruce penalty tuning replaced, wrapped as
 *  the `flo.rerun.request` the re-run route solves. `hpForcedOnSteps` and
 *  `hpForcedOffSteps` are 0-based step ordinals. Validated here so an edit
 *  that breaks the word is refused before it is sent. */
export function floRerunRequest(
    params: AnyFloParams,
    tuning: PenaltyTuning,
    hpForcedOnSteps: number[],
    hpForcedOffSteps: number[],
): FloRerunRequest {
    return FloRerunRequest.parse({
        Params: withPenaltyTuning(params, tuning),
        HpForcedOnSteps: hpForcedOnSteps,
        HpForcedOffSteps: hpForcedOffSteps,
        TypeName: "flo.rerun.request",
        Version: "001",
    });
}
