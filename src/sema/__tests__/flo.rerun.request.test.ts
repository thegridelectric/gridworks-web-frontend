import { describe, expect, it } from 'vitest';
import example from './fixtures/registry-example-flo.rerun.request-000.json';
import { FloRerunRequest } from '../types/FloRerunRequest';

describe('flo.rerun.request', () => {
    it('round-trips the registry example', () => {
        const parsed = FloRerunRequest.parse(example);
        expect(parsed).toEqual(example);
        expect(parsed.HpForcedOffSteps).toEqual([1]);
    });

    it('rejects a forced step outside the horizon (axiom 1)', () => {
        const broken = structuredClone(example);
        broken.HpForcedOnSteps = [99];
        expect(FloRerunRequest.safeParse(broken).success).toBe(false);
    });

    it('rejects the same step forced on and off (axiom 2)', () => {
        const broken = structuredClone(example);
        broken.HpForcedOnSteps = [1];
        expect(FloRerunRequest.safeParse(broken).success).toBe(false);
    });
});