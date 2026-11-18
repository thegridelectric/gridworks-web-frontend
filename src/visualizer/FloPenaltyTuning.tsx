import type { ReactNode } from "react";
import type { PenaltyKey } from "./flo-rerun-tuning";

export type FloPenaltyTuningValues = Partial<Record<PenaltyKey, boolean | number>>;
export type FloPenaltyTuningDraft = Partial<Record<PenaltyKey, boolean | string>>;

type FloPenaltyField = {
    key: PenaltyKey;
    label: string;
    integer?: boolean;
};

type FloPenalty = {
    title: string;
    enabledKey: PenaltyKey;
    fields: FloPenaltyField[];
};

const FLO_PENALTIES: FloPenalty[] = [
    {
        title: "RSWT penalty",
        enabledKey: "RswtPenaltyEnabled",
        fields: [
            { key: "RswtPenaltyWeight", label: "Weight (ω)" },
            { key: "RswtPenaltyDecay", label: "Decay (λ)" },
            { key: "RswtPenaltyExponentRate", label: "Exponent rate (k)" },
            { key: "RswtPenaltyDecayMaxHour", label: "Decay max hour (H)", integer: true },
        ],
    },
    {
        title: "Unmet load penalty",
        enabledKey: "UnmetLoadPenaltyEnabled",
        fields: [
            { key: "UnmetLoadPenaltyWeight", label: "Weight (ω)" },
        ],
    },
    {
        title: "Stability penalty",
        enabledKey: "StabilityPenaltyEnabled",
        fields: [
            { key: "StabilityPenaltyWeight", label: "Weight (ω)" },
            { key: "StabilityPenaltyDecay", label: "Decay (λ)" },
            { key: "StabilityPenaltyThresholdKwh", label: "Threshold [kWh] (ΔE_max)" },
            { key: "StabilityPenaltyThresholdPriceMwh", label: "Threshold [$/MWh] (Δp_max)" },
            { key: "StabilityPenaltyHorizonHours", label: "Horizon [hours] (H)", integer: true },
        ],
    },
    {
        title: "Short-cycle penalty",
        enabledKey: "ShortCyclePenaltyEnabled",
        fields: [
            { key: "ShortCyclePenaltyWeight", label: "Weight (ω)" },
        ],
    },
];

const INTEGER_KEYS = new Set<PenaltyKey>(
    FLO_PENALTIES.flatMap((p) => p.fields.filter((f) => f.integer).map((f) => f.key)),
);

export function parseFloPenaltyFieldValue(key: PenaltyKey, raw: string): number | null {
    if (raw.trim() === "") {
        return null;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || (INTEGER_KEYS.has(key) && !Number.isInteger(value))) {
        return null;
    }
    return value;
}

export function floPenaltyTuningDraft(values: FloPenaltyTuningValues): FloPenaltyTuningDraft {
    const draft: FloPenaltyTuningDraft = {};
    for (const key of Object.keys(values) as PenaltyKey[]) {
        const value = values[key];
        if (value !== undefined) {
            draft[key] = typeof value === "boolean" ? value : String(value);
        }
    }
    return draft;
}

export function floPenaltyTuningFromDraft(draft: FloPenaltyTuningDraft): FloPenaltyTuningValues | null {
    const values: FloPenaltyTuningValues = {};
    for (const key of Object.keys(draft) as PenaltyKey[]) {
        const raw = draft[key];
        if (raw === undefined) {
            continue;
        }
        if (typeof raw === "boolean") {
            values[key] = raw;
            continue;
        }
        const value = parseFloPenaltyFieldValue(key, raw);
        if (value === null) {
            return null;
        }
        values[key] = value;
    }
    return values;
}

const FLO_PENALTY_FORMULAS: Partial<Record<PenaltyKey, ReactNode>> = {
    RswtPenaltyEnabled: (
        <>
            ω · p<sub>med</sub> · λ<sup>H − min(t, H)</sup> · Σ<sub>i</sub> V<sub>i</sub> · max(0, e<sup>k·(RSWT<sub>t</sub> − T<sub>i</sub>)</sup> − 1)
        </>
    ),
    StabilityPenaltyEnabled: (
        <>
            ω · p<sub>med</sub> · λ<sup>t</sup> · |e<sub>t</sub> − ê<sub>t</sub>|
        </>
    ),
    UnmetLoadPenaltyEnabled: (
        <>
            ω · max(p / COP) · max(0, E(s<sub>t+1</sub>) − (E(s<sub>t</sub>) + ΔE<sub>t</sub>) − L<sub>t</sub>)
        </>
    ),
    ShortCyclePenaltyEnabled: (
        <>
            ω · p<sub>med</sub> · (1 − Q<sub>t</sub> / Q<sub>t</sub><sup>max</sup>)
        </>
    ),
};

export function FloPenaltyTuning(props: {
    draft: FloPenaltyTuningDraft;
    onDraftChange: (next: FloPenaltyTuningDraft) => void;
    disabled: boolean;
}) {
    const { draft, onDraftChange, disabled } = props;
    const penalties = FLO_PENALTIES.filter((p) => typeof draft[p.enabledKey] === "boolean");
    if (penalties.length === 0) {
        return null;
    }

    function setValue(key: PenaltyKey, value: boolean | string) {
        onDraftChange({ ...draft, [key]: value });
    }

    return (
        <div className="flo-penalty-tuning">
            {penalties.map((penalty) => {
                const enabled = draft[penalty.enabledKey] === true;
                const checkboxId = `flo-penalty-${penalty.enabledKey}`;
                return (
                    <fieldset key={penalty.enabledKey} className="flo-penalty" disabled={disabled}>
                        <div className="form-check flo-penalty__toggle">
                            <input
                                id={checkboxId}
                                className="form-check-input"
                                type="checkbox"
                                checked={enabled}
                                onChange={(evt) => setValue(penalty.enabledKey, evt.currentTarget.checked)}
                            />
                            <label className="form-check-label" htmlFor={checkboxId}>
                                {penalty.title}
                            </label>
                        </div>
                        {FLO_PENALTY_FORMULAS[penalty.enabledKey] &&
                            <p className="flo-penalty__formula text-muted">
                                {FLO_PENALTY_FORMULAS[penalty.enabledKey]}
                            </p>
                        }
                        {penalty.fields
                            .filter((field) => typeof draft[field.key] === "string")
                            .map((field) => {
                                const raw = draft[field.key] as string;
                                const invalid = parseFloPenaltyFieldValue(field.key, raw) === null;
                                return (
                                    <label key={field.key} className="flo-penalty__field">
                                        <span className="text-muted small">{field.label}</span>
                                        <input
                                            type="number"
                                            className={`form-control form-control-sm text-light${invalid ? " is-invalid" : ""}`}
                                            step={field.integer ? 1 : "any"}
                                            value={raw}
                                            disabled={!enabled}
                                            onChange={(evt) => setValue(field.key, evt.currentTarget.value)}
                                        />
                                    </label>
                                );
                            })}
                    </fieldset>
                );
            })}
        </div>
    );
}
