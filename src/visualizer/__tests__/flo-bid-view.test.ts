import { describe, expect, it } from 'vitest';
import orange1Recommendation001 from '../../sema/__tests__/fixtures/orange1-flo.recommendation-001.json';
import orange1Params001 from '../../sema/__tests__/fixtures/orange1-flo.params-001.json';
import { AnyFloRecommendation } from '../../sema/types/AnyFloRecommendation';
import { FloParams001 } from '../../sema/types/old_versions/FloParams001';
import { bidView } from '../flo-path-view';

const orange1 = AnyFloRecommendation.parse(orange1Recommendation001);
const params = FloParams001.parse(orange1Params001);

describe('the FLO bid view', () => {
    it('reads the pairs as kWh over the first step, highest price first', () => {
        const bid = bidView(orange1, params, null)!;
        expect(bid.pairs.priceMwh).toEqual([2000, 101]);
        expect(bid.pairs.quantityKwh).toEqual([0, 8.026]);
    });

    it('steps the demand down through each pair to the price floor', () => {
        const bid = bidView(orange1, params, null)!;
        expect(bid.step.quantityKwh).toEqual([0, 0, 8.026, 8.026]);
        expect(bid.step.priceMwh).toEqual([2000, 101, 101, -100]);
    });

    it('clears the forecast price, LMP plus distribution, at the pair that holds above it', () => {
        const bid = bidView(orange1, params, null)!;
        expect(bid.forecast.priceMwh).toBeCloseTo(102.54);
        expect(bid.forecast.intersection[0]).toBe(0);
        expect(bid.real).toBeNull();
    });

    it('draws the actual supply line where the slot has cleared', () => {
        const bid = bidView(orange1, params, 50)!;
        expect(bid.real).toEqual({ priceMwh: 50, intersection: [8.026, 50] });
    });

    it('crops the price axis to the bid rather than the market bounds', () => {
        const bid = bidView(orange1, params, null)!;
        expect(bid.yRange[0]).toBeCloseTo(102.54 - 1.54 - 60);
        expect(bid.yRange[1]).toBeCloseTo(102.54 + 60);
        expect(bid.yTicks).toEqual([101]);
        expect(bid.xRange[0]).toBe(-1);
        expect(bid.xRange[1]).toBeCloseTo(9.66 * 1.1);
        expect(bid.xTickQuantitiesKwh).toEqual([0, 8.026, 9.66]);
    });
});
