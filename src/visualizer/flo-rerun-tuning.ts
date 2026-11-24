import { z } from "zod";
import { AnyFloParams } from "../sema/types/AnyFloParams";
import { FloRerunRequest } from "../sema/types/FloRerunRequest";
import type { FloTuningBruce002 } from "../sema/types/old_versions/FloTuningBruce002";

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
export type PenaltyTuning = Pick<FloTuningBruce002, PenaltyKey>;

/** A request's bruce Tuning, at whichever `flo.tuning.bruce` version the
 *  request holds. */
export type BruceTuning = Extract<AnyFloParams["Tuning"], { TypeName: "flo.tuning.bruce" }>;

type UnmetLoadKnobs = Pick<FloTuningBruce002, "UnmetLoadPenaltyEnabled" | "UnmetLoadPenaltyWeight">;

const UNMET_LOAD_KEYS: readonly string[] = ["UnmetLoadPenaltyEnabled", "UnmetLoadPenaltyWeight"] satisfies (keyof UnmetLoadKnobs)[];

/** The unmet-load knobs as keys of a `flo.tuning.bruce` 003 Experimental,
 *  in the shape 002 declares them. Hand-coded: no word declares these
 *  keys; a `flo.tuning.bruce` version that declares the knobs retires it. */
const UnmetLoadExperimental = z.object({
    UnmetLoadPenaltyEnabled: z.boolean(),
    UnmetLoadPenaltyWeight: z.number(),
});

const UNMET_LOAD_OFF: UnmetLoadKnobs = {
    UnmetLoadPenaltyEnabled: false,
    UnmetLoadPenaltyWeight: 10,
};

/** The unmet-load knobs a bruce tuning states: declared fields at 002,
 *  keys of Experimental at 003. Null at 001, which has no unmet-load
 *  penalty, and for a 003 tuning whose Experimental does not hold them. */
export function unmetLoadKnobs(tuning: BruceTuning): UnmetLoadKnobs | null {
    if (tuning.Version === "002") {
        return { UnmetLoadPenaltyEnabled: tuning.UnmetLoadPenaltyEnabled, UnmetLoadPenaltyWeight: tuning.UnmetLoadPenaltyWeight };
    }
    if (tuning.Version === "003") {
        const knobs = UnmetLoadExperimental.safeParse(tuning.Experimental);
        return knobs.success ? knobs.data : null;
    }
    return null;
}

function withoutUnmetLoad(fields: object): Record<string, unknown> {
    return Object.fromEntries(Object.entries(fields).filter(([key]) => !UNMET_LOAD_KEYS.includes(key)));
}

/** The penalty tuning the hour's request was solved with, or null when
 *  the request's Tuning is not bruce's and no re-run can change it. */
export function penaltyTuning(params: AnyFloParams): PenaltyTuning | null {
    const tuning = params.Tuning;
    if (tuning.TypeName !== "flo.tuning.bruce") {
        return null;
    }
    const withUnmetLoad = { ...tuning, ...(unmetLoadKnobs(tuning) ?? UNMET_LOAD_OFF) };
    return Object.fromEntries(PENALTY_FIELDS.map((f) => [f.key, withUnmetLoad[f.key]])) as PenaltyTuning;
}

/** The hour's request with its bruce Tuning's penalty fields replaced, as
 *  a `flo.params` word the backend's codec reads: validated here so an
 *  edit that breaks the word is refused before it is sent. A 005 request
 *  stays 005 and a 002 to 004 request becomes 004, its Tuning
 *  `flo.tuning.bruce` 003 with the unmet-load knobs in Experimental beside
 *  the keys it already held; a 001 request stays 001 and drops the
 *  unmet-load knobs. */
export function withPenaltyTuning(params: AnyFloParams, tuning: PenaltyTuning): AnyFloParams {
    if (params.Tuning.TypeName !== "flo.tuning.bruce") {
        throw new Error(`A re-run edits flo.tuning.bruce; this request's Tuning is ${params.Tuning.TypeName}`);
    }
    const declared = withoutUnmetLoad(tuning);
    if (params.Version === "001") {
        return AnyFloParams.parse({ ...params, Tuning: { ...params.Tuning, ...declared } });
    }
    const knobs: UnmetLoadKnobs = {
        UnmetLoadPenaltyEnabled: tuning.UnmetLoadPenaltyEnabled,
        UnmetLoadPenaltyWeight: tuning.UnmetLoadPenaltyWeight,
    };
    const experimental = params.Tuning.Version === "003" ? params.Tuning.Experimental : {};
    return AnyFloParams.parse({
        ...params,
        Version: params.Version === "005" ? "005" : "004",
        Tuning: {
            ...withoutUnmetLoad(params.Tuning),
            ...declared,
            Experimental: { ...experimental, ...knobs },
            Version: "003",
        },
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
        Version: "003",
    });
}
