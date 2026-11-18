import { describe, expect, it } from 'vitest';
import orange1Params001 from './fixtures/orange1-flo.params-001.json';
import exampleParams002 from './fixtures/registry-example-flo.params-002.json';
import { AnyFloParams, priceUsdMwhList } from '../types/AnyFloParams';
import { FloParams002 } from '../types/old_versions/FloParams002';
import { FloParams001 } from '../types/old_versions/FloParams001';

describe('flo.params', () => {
    it('round-trips the registry example at 002, with one price list and the forecast it was read from', () => {
        const parsed = FloParams002.parse(exampleParams002);
        expect(parsed).toEqual(exampleParams002);
        expect(parsed.PriceUsdMwhList).toHaveLength(parsed.StepDurationMinutes.length);
        expect(parsed.PriceForecastId).toBe(exampleParams002.PriceForecastId);
    });

    it('round-trips the request orange1 sent at 001 through the union, tuned for bruce', () => {
        const parsed = FloParams001.parse(orange1Params001);
        expect(parsed).toEqual(orange1Params001);
        expect(parsed.Tuning.TypeName).toBe('flo.tuning.bruce');
        expect(AnyFloParams.parse(orange1Params001)).toEqual(orange1Params001);
        expect(AnyFloParams.parse(exampleParams002)).toEqual(exampleParams002);
    });

    it('reads the price per step from whichever version the journal holds', () => {
        expect(priceUsdMwhList(AnyFloParams.parse(exampleParams002))).toEqual(exampleParams002.PriceUsdMwhList);
        const summed = priceUsdMwhList(AnyFloParams.parse(orange1Params001));
        expect(summed[0]).toBeCloseTo(orange1Params001.LmpUsdMwhList[0] + orange1Params001.DistUsdMwhList[0]);
    });

    it('rejects a price list shorter than the step grid (axiom 1), at either version', () => {
        const broken002 = structuredClone(exampleParams002);
        broken002.PriceUsdMwhList.pop();
        expect(FloParams002.safeParse(broken002).success).toBe(false);
        const broken001 = structuredClone(orange1Params001);
        broken001.LmpUsdMwhList.pop();
        expect(FloParams001.safeParse(broken001).success).toBe(false);
    });

    it('rejects a previous estimate without the previous path (axiom 5)', () => {
        const broken = { ...structuredClone(exampleParams002), PreviousEstimateElecUsdMwhNow: 80 };
        expect(FloParams002.safeParse(broken).success).toBe(false);
    });

    it('rejects a tuning whose RWT lines do not match its buckets (bruce axiom 1)', () => {
        const broken = structuredClone(orange1Params001);
        broken.Tuning.RwtSlopeByBucketList.push(0.5);
        expect(FloParams001.safeParse(broken).success).toBe(false);
    });
});
