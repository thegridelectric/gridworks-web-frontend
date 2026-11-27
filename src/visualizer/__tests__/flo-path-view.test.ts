import { describe, expect, it } from 'vitest';
import orange1Recommendation001 from '../../sema/__tests__/fixtures/orange1-flo.recommendation-001.json';
import exampleRecommendation000 from '../../sema/__tests__/fixtures/registry-example-flo.recommendation-000.json';
import { AnyFloRecommendation } from '../../sema/types/AnyFloRecommendation';
import orange1Params001 from '../../sema/__tests__/fixtures/orange1-flo.params-001.json';
import { FloParams001 } from '../../sema/types/old_versions/FloParams001';
import { defaultPairIndex, paramsView, pathView, penaltyBars, plotTitle, slotTitle, storeBars, storeEndTimes, storeLabelColor, storePlot, temperatureColor, thermoclineLayer } from '../flo-path-view';

const orange1 = AnyFloRecommendation.parse(orange1Recommendation001);
const example000 = AnyFloRecommendation.parse(exampleRecommendation000);
const orange1Store = orange1.Version === '001' ? orange1.StoreStateList![1] : undefined;

describe('the FLO path view', () => {
    it('opens on the pair the first-step forecast falls in', () => {
        const params = FloParams001.parse(orange1Params001);
        expect(defaultPairIndex(orange1, params)).toBe(0);
        expect(pathView(orange1, defaultPairIndex(orange1, params)).hpKw[0]).toBe(0);
    });

    it('opens on the lower pair when the forecast is below the kink, even if that path costs more', () => {
        const raw = structuredClone(orange1Params001);
        raw.LmpUsdMwhList[0] = 0;
        const params = FloParams001.parse(raw);
        const costs = orange1.Version === '001' ? orange1.PathPenaltiesList!.map((p) => p.PathCostUsd) : [];
        expect(costs[0]).toBeLessThan(costs[1]);
        expect(defaultPairIndex(orange1, params)).toBe(1);
    });

    it('uses the forecast for a recommendation that states no path costs', () => {
        const params = FloParams001.parse(orange1Params001);
        expect(defaultPairIndex(example000, params)).toBe(1);
    });

    it('lays the steps out from the slot start on the path step grid', () => {
        const view = pathView(orange1, 1);
        expect(view.stepStart).toHaveLength(48);
        expect(view.stepStart[0]).toBe('2026-11-09T14:00:00');
        expect(view.stepStart[1]).toBe('2026-11-09T15:00:00');
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

    it('stacks the unmet-load penalty between RSWT and stability when the recommendation states it', () => {
        const word = {
            ...orange1Recommendation001,
            Version: '002',
            PathPenaltiesList: orange1Recommendation001.PathPenaltiesList.map((penalties) => ({
                ...penalties,
                Version: '001',
                UnmetLoadPenaltyUsdList: penalties.RswtPenaltyUsdList.map(() => 1.25),
            })),
        };
        const view = pathView(AnyFloRecommendation.parse(word), 1);
        expect(view.penalties.map((p) => p.name)).toEqual([
            'RSWT penalty',
            'Unmet load penalty',
            'Stability penalty',
            'Short-cycle penalty',
        ]);
        expect(view.penalties[1].usd[0]).toBe(1.25);
        expect(view.penalties[2].base[0]).toBe(view.penalties[0].usd[0] + 1.25);
    });

    it('reads the unmet-load series from Experimental in a 002 penalties word', () => {
        const word = structuredClone(orange1Recommendation001);
        word.Version = '003';
        const penaltiesList = word.PathPenaltiesList.map((penalties) => ({
            ...penalties,
            Version: '002',
            Experimental: { UnmetLoadPenaltyUsdList: penalties.RswtPenaltyUsdList.map(() => 0.75) },
        }));
        const view = pathView(AnyFloRecommendation.parse({ ...word, PathPenaltiesList: penaltiesList }), 1);
        expect(view.penalties.map((p) => p.name)).toEqual([
            'RSWT penalty',
            'Unmet load penalty',
            'Stability penalty',
            'Short-cycle penalty',
        ]);
        expect(view.penalties[1].usd[0]).toBe(0.75);
        expect(view.penalties[2].base[0]).toBe(view.penalties[0].usd[0] + 0.75);
    });

    it('draws no unmet-load series for a 002 penalties word whose Experimental holds none', () => {
        const word = structuredClone(orange1Recommendation001);
        word.Version = '003';
        const penaltiesList = word.PathPenaltiesList.map((penalties) => ({ ...penalties, Version: '002', Experimental: {} }));
        const view = pathView(AnyFloRecommendation.parse({ ...word, PathPenaltiesList: penaltiesList }), 1);
        expect(view.penalties.map((p) => p.name)).toEqual(['RSWT penalty', 'Stability penalty', 'Short-cycle penalty']);
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

    it('puts the initial store on the first hour and the recommendation states at each step end', () => {
        const params = FloParams001.parse(orange1Params001);
        const view = pathView(orange1, 1);
        const store = orange1Store!;
        const plotted = storePlot(view, params);
        expect(thermoclineLayer(1, 3, 9)).toBe(3);
        expect(thermoclineLayer(2, 3, 9)).toBe(6);
        expect(plotted.time).toHaveLength(view.stepStart.length + 1);
        expect(plotted.time[0]).toBe(view.stepStart[0]);
        expect(plotted.time[1]).toBe(view.stepStart[1]);
        expect(plotted.time[plotted.time.length - 1]).toBe(view.horizonEnd);
        expect(plotted.barWidthMs).toHaveLength(plotted.time.length);
        expect(plotted.barWidthMs[plotted.barWidthMs.length - 1]).toBe(view.barWidthMs[view.barWidthMs.length - 1]);
        const [bottom, middle, top] = plotted.bars;
        expect(top.temp[0]).toBe(params.InitialTopTempF);
        expect(middle.temp[0]).toBe(params.InitialMiddleTempF);
        expect(bottom.temp[0]).toBe(params.InitialBottomTempF);
        expect(top.y[0]).toBe(3);
        expect(middle.y[0]).toBe(3);
        expect(bottom.y[0]).toBe(3);
        expect(top.temp[1]).toBe(store.TopFList[0]);
        expect(top.temp[top.temp.length - 1]).toBe(store.TopFList[store.TopFList.length - 1]);
        expect(top.textColor[0]).toBe('green');
        const last = top.temp.length - 1;
        expect(top.textColor[last]).toBe(storeLabelColor(top.temp[last], undefined));
        const ends = storeEndTimes(view);
        expect(ends).toHaveLength(store.TopFList.length);
        expect(ends[0]).toBe(view.stepStart[1]);
        expect(ends[ends.length - 1]).toBe(view.horizonEnd);
    });

    it('draws recommendation store states at step ends when the request is unknown', () => {
        const view = pathView(orange1, 1);
        const plotted = storePlot(view, null);
        expect(plotted.time).toEqual(storeEndTimes(view));
        expect(plotted.bars[2].temp[0]).toBe(orange1Store!.TopFList[0]);
        expect(plotted.time[0]).not.toBe(view.stepStart[0]);
    });

    it('paints the tank the way the visualizer does: bottom to top, green once a layer meets RSWT, no label on a one-layer middle', () => {
        const view = pathView(orange1, 1);
        const rswt = FloParams001.parse(orange1Params001).RswtFList;
        const bars = storeBars(view, rswt);
        expect(bars).toHaveLength(3);
        expect(bars[0].y[0] + bars[1].y[0] + bars[2].y[0]).toBe(view.storeLayers);
        expect(bars[1].text[0]).toBe(bars[1].y[0] > 1 ? String(Math.trunc(bars[1].temp[0])) : "");
        const hot = bars[2].temp.findIndex((t, i) => rswt[i] <= t);
        if (hot >= 0) expect(bars[2].textColor[hot]).toBe("green");
        expect(storeLabelColor(90, 100)).toBe("gray");
        expect(storeLabelColor(110, 120)).toBe("white");
    });

    it('stacks the terminal cost on the last step and leaves 30% of headroom', () => {
        const view = pathView(orange1, 1);
        const drawn = penaltyBars(view, { rswt: true, unmet: false, stability: true, shortCycle: false, terminal: true });
        expect(drawn.series.map((s) => s.name)[0]).toBe("RSWT penalty");
        const terminal = drawn.series[drawn.series.length - 1];
        expect(terminal.y[terminal.y.length - 1]).toBe(view.terminalCostUsd);
        expect(terminal.y[0]).toBe(0);
        expect(drawn.yRange?.[0]).toBe(0);
        expect(drawn.yRange?.[1]).toBeGreaterThan(0);
    });
});

describe('the FLO params view', () => {
    const params = FloParams001.parse(orange1Params001);
    const view = paramsView(params);

    it('lays a 001 request out on its step grid with price as LMP plus distribution and load in kW', () => {
        expect(view.stepStart).toHaveLength(48);
        expect(view.stepStart[0]).toBe('2026-11-09T14:00:00');
        expect(view.priceUsdMwh[0]).toBeCloseTo(params.LmpUsdMwhList[0] + params.DistUsdMwhList[0]);
        expect(view.loadKw[5]).toBeCloseTo(params.LoadKwhList[5] / (params.StepDurationMinutes[5] / 60));
        expect(view.oatF[5]).toBeCloseTo(params.OatFList[5]);
        expect(view.rswtF[5]).toBeCloseTo(params.RswtFList[5]);
    });
});
