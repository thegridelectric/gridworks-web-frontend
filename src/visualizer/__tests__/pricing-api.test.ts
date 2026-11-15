import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { PriceForecast } from '../../sema/types/PriceForecast';
import { forecast } from '../../sema/__tests__/price.forecast.test';
import latestPriceExample from '../../sema/__tests__/fixtures/registry-example-latest.price-001.json';
import { LatestPrice } from '../../sema/types/LatestPrice';
import { forecastSeries, marketOf, realTimeSeries } from '../pricing-api';

describe('forecastSeries', () => {
    const word = PriceForecast.parse(forecast);

    it('steps over the slots inside the window, closing where the last one ends, in USD/MWh', () => {
        const start = DateTime.fromSeconds(1794427200);
        const end = DateTime.fromSeconds(1794434400);
        expect(forecastSeries(word, start, end)).toEqual({
            HourStartS: [1794427200, 1794430800, 1794434400],
            ForecastList: [99.876, 98.806, 98.806],
        });
    });

    it('draws a window inside one slot as that slot\'s price from the window start to its end', () => {
        const start = DateTime.fromSeconds(1794427200 + 600);
        const end = DateTime.fromSeconds(1794427200 + 2400);
        expect(forecastSeries(word, start, end)).toEqual({
            HourStartS: [1794427200 + 600, 1794427200 + 2400],
            ForecastList: [99.876, 99.876],
        });
    });

    it('closes the last slot of the word one grid step after it starts', () => {
        const start = DateTime.fromSeconds(1794430800);
        const end = DateTime.fromSeconds(1794430800 + 7200);
        expect(forecastSeries(word, start, end)).toEqual({
            HourStartS: [1794430800, 1794434400],
            ForecastList: [98.806, 98.806],
        });
    });

    it('is empty for a window the forecast does not reach', () => {
        const start = DateTime.fromSeconds(1794423600 - 7200);
        const end = DateTime.fromSeconds(1794423600 - 3600);
        expect(forecastSeries(word, start, end)).toEqual({ HourStartS: [], ForecastList: [] });
    });
});

describe('realTimeSeries', () => {
    const slot = 1794412800;
    const cleared = (slotS: number, priceX1000: number): LatestPrice =>
        LatestPrice.parse({ ...latestPriceExample, MarketSlotName: `e.rt60gate5.hw1.isone.me.versant.keene.${slotS}`, PriceX1000: priceX1000,
            Components: [{ Name: 'Unknown', PriceX1000: priceX1000, TypeName: 'price.component', Version: '000' }], TariffAlias: undefined });

    it('steps over the cleared slots inside the window, closing one slot after the last, in USD/MWh', () => {
        const prices = [cleared(slot + 3600, 99_876), cleared(slot, 628_052)];
        const start = DateTime.fromSeconds(slot + 1800);
        const end = DateTime.fromSeconds(slot + 3 * 3600);
        expect(realTimeSeries(prices, start, end)).toEqual({
            HourStartS: [slot + 1800, slot + 3600, slot + 7200],
            RealTimeList: [628.052, 99.876, 99.876],
        });
    });

    it('is empty when no cleared slot touches the window', () => {
        const start = DateTime.fromSeconds(slot + 2 * 3600);
        const end = DateTime.fromSeconds(slot + 3 * 3600);
        expect(realTimeSeries([cleared(slot, 1000)], start, end)).toEqual({ HourStartS: [], RealTimeList: [] });
    });
});

describe('marketOf', () => {
    it('is the slot-name prefix of the forecast\'s product at its maker', () => {
        expect(marketOf(PriceForecast.parse(forecast))).toBe('e.rt60gate5.hw1.isone.me.versant.keene');
    });
});
