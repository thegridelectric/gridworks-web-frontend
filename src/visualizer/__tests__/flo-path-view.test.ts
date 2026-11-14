import { describe, expect, it } from 'vitest';
import orange1Recommendation001 from '../../sema/__tests__/fixtures/orange1-flo.recommendation-001.json';
import exampleRecommendation000 from '../../sema/__tests__/fixtures/registry-example-flo.recommendation-000.json';
import { AnyFloRecommendation } from '../../sema/types/AnyFloRecommendation';
import orange1Params001 from '../../sema/__tests__/fixtures/orange1-flo.params-001.json';
import { FloParams } from '../../sema/types/FloParams';
import { cop, defaultPairIndex, paramsView, pathView, plotTitle, slotTitle, temperatureColor } from '../flo-path-view';

const orange1 = AnyFloRecommendation.parse(orange1Recommendation001);
const example000 = AnyFloRecommendation.parse(exampleRecommendation000);
const orange1Store = orange1.Version === '001' ? orange1.StoreStateList![1] : undefined;

describe('the FLO path view', () => {
    it('opens on the pair whose path costs least', () => {
        const costs = orange1.Version === '001' ? orange1.PathPenaltiesList!.map((p) => p.PathCostUsd) : [];
        expect(costs[0]).toBeLessThan(costs[1]);
        expect(defaultPairIndex(orange1)).toBe(0);
        expect(pathView(orange1, defaultPairIndex(orange1)).hpKw[0]).toBe(0);
    });

    it('opens on the lowest-priced pair when the recommendation states no path costs', () => {
        expect(defaultPairIndex(example000)).toBe(example000.PqPairs.length - 1);
    });

    it('lays the steps out from the slot start on the path step grid', () => {
        const view = pathView(orange1, 1);
        expect(view.stepStart).toHaveLength(48);
        expect(view.stepStart[0]).toBe('2026-11-09T14:00:00');
        expect(view.stepStart[1]).toBe('2026-11-09T15:00:00');
        expect(view.stepWidthMs[0]).toBe(3_600_000);
        expect(view.hpKw[0]).toBe(8.026);
        expect(view.quantityKw).toBe(8.026);
        expect(view.priceUsdMwh).toBe(101);
    });

    it('draws each step as three bands, top to bottom, that together fill the store', () => {
        const view = pathView(orange1, 1);
        const store = orange1Store!;
        expect(view.storeLayers).toBe(store.StoreLayers);
        expect(view.bands.map((b) => b.name)).toEqual(['Top', 'Middle', 'Bottom']);
        const step = 0;
        const [top, middle, bottom] = view.bands;
        expect(top.tempF[step]).toBe(store.TopFList[step]);
        expect(middle.tempF[step]).toBe(store.MiddleFList[step]);
        expect(bottom.tempF[step]).toBe(store.BottomFList[step]);
        expect(top.layers[step] + middle.layers[step] + bottom.layers[step]).toBe(store.StoreLayers);
        expect(top.base[step] + top.layers[step]).toBe(store.StoreLayers);
        expect(bottom.base[step]).toBe(0);
        expect(middle.base[step]).toBe(bottom.layers[step]);
    });

    it('stacks the three penalty series', () => {
        const view = pathView(orange1, 1);
        expect(view.penalties.map((p) => p.name)).toEqual(['RSWT penalty', 'Stability penalty', 'Short-cycle penalty']);
        expect(view.penalties[0].base.every((b) => b === 0)).toBe(true);
        expect(view.penalties[2].base[0]).toBe(view.penalties[0].usd[0] + view.penalties[1].usd[0]);
        expect(view.terminalCostUsd).not.toBeNull();
    });

    it('draws a 000 recommendation without layers or penalties', () => {
        const view = pathView(example000, 0);
        expect(view.bands).toEqual([]);
        expect(view.penalties).toEqual([]);
        expect(view.storeLayers).toBeNull();
        expect(view.storeKwh).toEqual([34.3, 27, 32.6]);
        expect(view.socPct).toBeNull();
        expect(view.terminalCostPct).toBeNull();
        expect(plotTitle(example000, view)).toBe(slotTitle(example000));
    });

    it('puts the store between the empty and full energies the store word states', () => {
        const view = pathView(orange1, 1);
        const store = orange1Store!;
        expect(view.socPct).toHaveLength(48);
        const path = orange1.OptimalPathList[1];
        expect(view.socPct![0]).toBeCloseTo((100 * (path.StoreWhList[0] - store.EmptyStoreWh)) / (store.FullStoreWh - store.EmptyStoreWh));
        for (const pct of view.socPct!) {
            expect(pct).toBeGreaterThanOrEqual(0);
            expect(pct).toBeLessThanOrEqual(100);
        }
    });

    it('states the terminal cost as a share of an empty store and titles the plot by the slot and the path cost', () => {
        const view = pathView(orange1, 1);
        expect(view.terminalCostPct).toBeCloseTo(100);
        expect(view.pathCostUsd).toBeCloseTo(7.981, 3);
        expect(slotTitle(orange1)).toBe('Nov 09, 2026 14:00 EST');
        expect(plotTitle(orange1, view)).toBe('Nov 09, 2026 14:00 EST ($7.98)');
    });

    it('colors the coldest temperature blue and the hottest red', () => {
        expect(temperatureColor(60)).toBe('rgb(255,245,240)');
        expect(temperatureColor(180)).toBe('rgb(103,0,13)');
        expect(temperatureColor(120)).toBe('rgb(251,106,74)');
    });
});

describe('the FLO params view', () => {
    const params = FloParams.parse(orange1Params001);
    const view = paramsView(params);

    it('lays the request out on its step grid with price as LMP plus distribution and load in kW', () => {
        expect(view.stepStart).toHaveLength(48);
        expect(view.stepStart[0]).toBe('2026-11-09T14:00:00');
        expect(view.priceUsdMwh[0]).toBeCloseTo(params.LmpUsdMwhList[0] + params.DistUsdMwhList[0]);
        expect(view.loadKw[5]).toBeCloseTo(params.LoadKwhList[5] / (params.StepDurationMinutes[5] / 60));
    });

    it('prices heat at each step by the COP bruce models from outside air', () => {
        expect(cop(params, params.CopMinOatF - 1)).toBe(params.CopMin);
        expect(cop(params, 40)).toBeCloseTo(params.CopIntercept + params.CopOatCoeff * 40);
        expect(view.thermalPriceUsdMwh[0]).toBeCloseTo(view.priceUsdMwh[0] / cop(params, params.OatFList[0]));
    });
});
