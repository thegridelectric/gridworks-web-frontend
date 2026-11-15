import { useState } from "react";
import { PENALTY_FIELDS, PENALTY_GROUPS, type PenaltyKey, type PenaltyTuning } from "./flo-rerun-tuning";

/** The re-run panel beside the FLO plot: the penalty fields of the hour's
 *  bruce tuning, prefilled from the request the LTN sent, a Re-run that
 *  solves the hour again with the edits, and a Reset that puts the
 *  journaled plot and the hour's tuning back. The parent keys this
 *  component on the hour so a new hour starts from its own tuning. */
export default function FloRerunPanel(props: {
    tuning: PenaltyTuning;
    isBusy: boolean;
    hasRerun: boolean;
    onRerun: (tuning: PenaltyTuning) => void;
    onReset: () => void;
}) {
    const { tuning: journaled, isBusy, hasRerun, onRerun, onReset } = props;
    const [tuning, setTuning] = useState<PenaltyTuning>(journaled);

    function set<K extends PenaltyKey>(key: K, value: PenaltyTuning[K]) {
        setTuning((was) => ({ ...was, [key]: value }));
    }

    function reset() {
        setTuning(journaled);
        onReset();
    }

    return (
        <form
            className="flo-rerun-panel mx-3 mt-3"
            aria-label="FLO re-run"
            onSubmit={(event) => {
                event.preventDefault();
                onRerun(tuning);
            }}
        >
            <fieldset disabled={isBusy} className="d-flex flex-wrap gap-4 align-items-start">
                {PENALTY_GROUPS.map((group) => (
                    <div key={group} className="flo-rerun-group">
                        <h6>{group}</h6>
                        {PENALTY_FIELDS.filter((f) => f.group === group).map((f) => (
                            <label key={f.key} className="flo-rerun-field">
                                <span>{f.label}</span>
                                {typeof journaled[f.key] === "boolean" ? (
                                    <input
                                        type="checkbox"
                                        checked={tuning[f.key] as boolean}
                                        onChange={(e) => set(f.key, e.currentTarget.checked as PenaltyTuning[typeof f.key])}
                                    />
                                ) : (
                                    <input
                                        type="number"
                                        step="any"
                                        className="form-control form-control-sm"
                                        value={tuning[f.key] as number}
                                        onChange={(e) => set(f.key, e.currentTarget.valueAsNumber as PenaltyTuning[typeof f.key])}
                                    />
                                )}
                            </label>
                        ))}
                    </div>
                ))}
                <div className="d-flex flex-column gap-2 align-self-end">
                    <button className="btn btn-sm btn-outline-primary" type="submit" aria-busy={isBusy}>Re-run</button>
                    <button className="btn btn-sm btn-outline-secondary" type="button" onClick={reset} disabled={!hasRerun && tuning === journaled}>Reset</button>
                </div>
            </fieldset>
        </form>
    );
}
