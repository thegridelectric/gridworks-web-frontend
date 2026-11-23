export type FloHorizonBarSelections = {
    top: boolean[];
    bottom: boolean[];
};

export function emptyFloHorizonBarSelections(stepCount: number): FloHorizonBarSelections {
    const empty = Array.from({ length: stepCount }, () => false);
    return { top: empty, bottom: [...empty] };
}

/** Copy forced hours onto a horizon of `stepCount` steps, on the same step.
 *
 *  Hold mode does not slide the step. The next FLO already starts one hour
 *  earlier or later, so the same step is one clock hour earlier or later:
 *  a force on the hour labeled 05:00 is on 04:00 after a left step and on
 *  06:00 after a right step. Sliding the step as well would move it by two
 *  hours. A step past the end of a shorter horizon is dropped. */
export function fitFloHorizonBarSelections(
    selections: FloHorizonBarSelections,
    stepCount: number,
): FloHorizonBarSelections {
    const next = emptyFloHorizonBarSelections(stepCount);
    for (const bar of ["top", "bottom"] as const) {
        const selected = selections[bar];
        const n = Math.min(selected.length, stepCount);
        for (let i = 0; i < n; i++) {
            next[bar][i] = selected[i];
        }
    }
    return next;
}

/** The same selection as step ordinals for `flo.rerun.request`: 0 is the
 *  first horizon step. The panel shows those steps counted from 1. */
export function floHorizonSelectedSteps(selected: boolean[]): number[] {
    const steps: number[] = [];
    for (let i = 0; i < selected.length; i++) {
        if (selected[i]) {
            steps.push(i);
        }
    }
    return steps;
}
