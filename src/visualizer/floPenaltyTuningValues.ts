/** `flo.tuning.bruce` penalty fields, keyed by their flo.params names. */
export type FloPenaltyTuningValues = Record<string, boolean | number>;

/** Penalty fields being edited: checkboxes as booleans, numbers as the typed text. */
export type FloPenaltyTuningDraft = Record<string, boolean | string>;

export type FloPenaltyField = {
    key: string;
    label: string;
    integer?: boolean;
};

export type FloPenalty = {
    title: string;
    enabledKey: string;
    fields: FloPenaltyField[];
};

export const FLO_PENALTIES: FloPenalty[] = [
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

const INTEGER_KEYS = new Set(
    FLO_PENALTIES.flatMap((p) => p.fields.filter((f) => f.integer).map((f) => f.key)),
);

/** The number typed for `key`, or null if it is not a valid value for that field. */
export function parseFloPenaltyFieldValue(key: string, raw: string): number | null {
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
    for (const [key, value] of Object.entries(values)) {
        draft[key] = typeof value === "boolean" ? value : String(value);
    }
    return draft;
}

/** The tuning to send, or null while any number field is not a valid number. */
export function floPenaltyTuningFromDraft(draft: FloPenaltyTuningDraft): FloPenaltyTuningValues | null {
    const values: FloPenaltyTuningValues = {};
    for (const [key, raw] of Object.entries(draft)) {
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
