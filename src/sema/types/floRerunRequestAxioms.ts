import type { AnyFloParams } from './AnyFloParams';

export type RerunRequestShape = {
    Params: AnyFloParams;
    HpForcedOnSteps: number[];
    HpForcedOffSteps: number[];
};

export function checkAxiom1(r: RerunRequestShape): boolean {
    const horizon = r.Params.StepDurationMinutes.length;
    const inRange = (steps: number[]) => steps.every((s) => s >= 0 && s < horizon);
    return inRange(r.HpForcedOnSteps) && inRange(r.HpForcedOffSteps);
}

export function checkAxiom2(r: RerunRequestShape): boolean {
    const off = new Set(r.HpForcedOffSteps);
    return r.HpForcedOnSteps.every((s) => !off.has(s));
}

/** `[check, message, path]` refinements for `FloRerunRequest`. */
export const FLO_RERUN_REQUEST_AXIOMS: [typeof checkAxiom1 | typeof checkAxiom2, string, string][] = [
    [checkAxiom1, 'Axiom 1 (ForcedStepsWithinHorizon) failed', 'HpForcedOnSteps'],
    [checkAxiom2, 'Axiom 2 (ForcedOnOffDisjoint) failed', 'HpForcedOnSteps'],
];