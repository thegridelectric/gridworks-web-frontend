import { describe, expect, it } from 'vitest';
import orange1Recommendation001 from './fixtures/orange1-flo.recommendation-001.json';
import exampleRecommendation000 from './fixtures/registry-example-flo.recommendation-000.json';
import { AnyFloRecommendation } from '../types/AnyFloRecommendation';
import { FloRecommendation } from '../types/FloRecommendation';
import { FloRecommendation000 } from '../types/old_versions/FloRecommendation000';

describe('flo.recommendation', () => {
    it('round-trips a FLO service recommendation at 001 with store state and penalties', () => {
        const parsed = FloRecommendation.parse(orange1Recommendation001);
        expect(parsed).toEqual(orange1Recommendation001);
        expect(parsed.StoreStateList?.[0].StoreLayers).toBe(9);
        expect(parsed.PathPenaltiesList?.[0].RswtPenaltyUsdList).toHaveLength(48);
    });

    it('round-trips the registry example at 000 through the union', () => {
        expect(FloRecommendation000.parse(exampleRecommendation000)).toEqual(exampleRecommendation000);
        expect(AnyFloRecommendation.parse(exampleRecommendation000)).toEqual(exampleRecommendation000);
        expect(AnyFloRecommendation.parse(orange1Recommendation001)).toEqual(orange1Recommendation001);
    });

    it('rejects a path that does not start at its pair quantity (axiom 3)', () => {
        const broken = structuredClone(orange1Recommendation001);
        broken.OptimalPathList[1].HpAvgWList[0] += 1;
        expect(FloRecommendation.safeParse(broken).success).toBe(false);
    });

    it('rejects pairs whose prices do not descend (axiom 4)', () => {
        const broken = structuredClone(orange1Recommendation001);
        broken.PqPairs[1].PriceX1000 = broken.PqPairs[0].PriceX1000;
        expect(FloRecommendation.safeParse(broken).success).toBe(false);
    });

    it('rejects a store state with fewer steps than its path (axiom 6)', () => {
        const broken = structuredClone(orange1Recommendation001);
        broken.StoreStateList[0].TopFList.pop();
        expect(FloRecommendation.safeParse(broken).success).toBe(false);
    });

    it('rejects a thermocline below the store (axiom 2 of the store path)', () => {
        const broken = structuredClone(orange1Recommendation001);
        broken.StoreStateList[0].Thermocline2List[0] = broken.StoreStateList[0].StoreLayers + 1;
        expect(FloRecommendation.safeParse(broken).success).toBe(false);
    });

    it('rejects an empty store at the full energy (axiom 3 of the store path)', () => {
        const broken = structuredClone(orange1Recommendation001);
        broken.StoreStateList[0].EmptyStoreWh = broken.StoreStateList[0].FullStoreWh;
        expect(FloRecommendation.safeParse(broken).success).toBe(false);
    });

    it('rejects a terminal cost above the empty store cost (axiom 2 of the penalties)', () => {
        const broken = structuredClone(orange1Recommendation001);
        broken.PathPenaltiesList[0].TerminalCostUsd = broken.PathPenaltiesList[0].TerminalCostEmptyStoreUsd + 0.01;
        expect(FloRecommendation.safeParse(broken).success).toBe(false);
    });
});
