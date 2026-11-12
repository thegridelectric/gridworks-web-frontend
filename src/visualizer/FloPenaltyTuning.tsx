import type { ReactNode } from "react";
import {
    FLO_PENALTIES,
    parseFloPenaltyFieldValue,
    type FloPenaltyTuningDraft,
} from "./floPenaltyTuningValues";

/** Right-hand side of each penalty, as written in optimal-flexibility/docs/penalties.md. */
const FLO_PENALTY_FORMULAS: Record<string, ReactNode> = {
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

    function setValue(key: string, value: boolean | string) {
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
