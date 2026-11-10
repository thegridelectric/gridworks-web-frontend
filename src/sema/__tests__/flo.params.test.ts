import { describe, expect, it } from 'vitest';
import orange1Params001 from './fixtures/orange1-flo.params-001.json';
import { FloParams } from '../types/FloParams';

describe('flo.params', () => {
    it('round-trips the request orange1 sent for a slot, tuned for bruce', () => {
        const parsed = FloParams.parse(orange1Params001);
        expect(parsed).toEqual(orange1Params001);
        expect(parsed.Tuning.TypeName).toBe('flo.tuning.bruce');
        expect(parsed.LmpUsdMwhList).toHaveLength(parsed.StepDurationMinutes.length);
    });

    it('rejects a price list shorter than the step grid (axiom 1)', () => {
        const broken = structuredClone(orange1Params001);
        broken.LmpUsdMwhList.pop();
        expect(FloParams.safeParse(broken).success).toBe(false);
    });

    it('rejects a previous estimate without the previous path (axiom 5)', () => {
        const broken = { ...structuredClone(orange1Params001), PreviousEstimateElecUsdMwhNow: 80 };
        expect(FloParams.safeParse(broken).success).toBe(false);
    });

    it('rejects a tuning whose RWT lines do not match its buckets (bruce axiom 1)', () => {
        const broken = structuredClone(orange1Params001);
        broken.Tuning.RwtSlopeByBucketList.push(0.5);
        expect(FloParams.safeParse(broken).success).toBe(false);
    });
});
