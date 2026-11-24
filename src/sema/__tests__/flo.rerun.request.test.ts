import { describe, expect, it } from 'vitest';
import example from './fixtures/registry-example-flo.rerun.request-000.json';
import example002 from './fixtures/registry-example-flo.rerun.request-002.json';
import example003 from './fixtures/registry-example-flo.rerun.request-003.json';
import { FloRerunRequest } from '../types/FloRerunRequest';
import { FloRerunRequest002 } from '../types/old_versions/FloRerunRequest002';
import { FloRerunRequest001 } from '../types/old_versions/FloRerunRequest001';
import { FloRerunRequest000 } from '../types/old_versions/FloRerunRequest000';

describe('flo.rerun.request', () => {
    it('round-trips the registry example at 003, wrapping flo.params 005', () => {
        const parsed = FloRerunRequest.parse(example003);
        expect(parsed).toEqual(example003);
        expect(parsed.Params.Version).toBe('005');
    });

    it('holds flo.params 001 to 004 at 002, so a 005 params needs 003', () => {
        expect(FloRerunRequest002.safeParse({ ...structuredClone(example003), Version: '002' }).success).toBe(false);
    });

    it('round-trips the registry example at 002, wrapping flo.params 004', () => {
        const parsed = FloRerunRequest002.parse(example002);
        expect(parsed).toEqual(example002);
        expect(parsed.Params.Version).toBe('004');
    });

    it('holds flo.params 001 to 003 at 001, so a 004 params needs 002', () => {
        expect(FloRerunRequest001.safeParse({ ...structuredClone(example002), Version: '001' }).success).toBe(false);
    });

    it('round-trips the registry example', () => {
        const parsed = FloRerunRequest000.parse(example);
        expect(parsed).toEqual(example);
        expect(parsed.HpForcedOffSteps).toEqual([1]);
    });

    it('rejects a forced step outside the horizon (axiom 1)', () => {
        const broken = { ...structuredClone(example), HpForcedOnSteps: [99] };
        expect(FloRerunRequest000.safeParse(broken).success).toBe(false);
    });

    it('rejects the same step forced on and off (axiom 2)', () => {
        const broken = { ...structuredClone(example), HpForcedOnSteps: [1] };
        expect(FloRerunRequest000.safeParse(broken).success).toBe(false);
    });
});