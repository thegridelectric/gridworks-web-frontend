import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { PriceForecast } from '../../sema/types/PriceForecast';
import { forecast } from '../../sema/__tests__/price.forecast.test';
import { forecastSeries } from '../pricing-api';

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
