import { describe, expect, it } from "vitest";
import { emptyFloHorizonBarSelections, fitFloHorizonBarSelections } from "../flo-horizon-selections";

function forcedOff(stepCount: number, hour: number) {
    const selections = emptyFloHorizonBarSelections(stepCount);
    selections.bottom[hour - 1] = true;
    return selections;
}

describe("hold mode keeps forced hours on the same horizon step", () => {
    it("leaves the step in place, so the clock hour moves by one with the FLO", () => {
        // Steps are one hour. The 5th step of a FLO starting at 01:00 is
        // 05:00. One hour earlier that same step is 04:00, and one hour
        // later it is 06:00. Moving the step index as well would jump two hours.
        const selections = forcedOff(24, 5);
        const carried = fitFloHorizonBarSelections(selections, 24);
        const step = 4;
        const startHour = 1;

        expect(carried.bottom[step]).toBe(true);
        expect(carried.bottom.filter(Boolean)).toEqual([true]);
        expect(carried.top.every((on) => !on)).toBe(true);
        expect((startHour + step) % 24).toBe(5);
        expect((startHour - 1 + step + 24) % 24).toBe(4);
        expect((startHour + 1 + step) % 24).toBe(6);
    });

    it("drops a forced hour past the end of a shorter horizon", () => {
        const selections = emptyFloHorizonBarSelections(8);
        selections.top[0] = true;
        selections.bottom[7] = true;

        const carried = fitFloHorizonBarSelections(selections, 7);

        expect(carried.top).toHaveLength(7);
        expect(carried.bottom).toHaveLength(7);
        expect(carried.top[0]).toBe(true);
        expect(carried.bottom.every((on) => !on)).toBe(true);
    });
});
