import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';
import { PriceForecast } from '../../sema/types/PriceForecast';
import { forecast } from '../../sema/__tests__/price.forecast.test';
import { forecastSeries } from '../pricing-api';

describe('forecastSeries', () => {
    const word = PriceForecast.parse(forecast);

    it('keeps the slots inside the window, in USD/MWh', () => {
        const start = DateTime.fromSeconds(1794427200);
        const end = DateTime.fromSeconds(1794430800);
        expect(forecastSeries(word, start, end)).toEqual({ HourStartS: [1794427200, 1794430800], ForecastList: [99.876, 98.806] });
    });

    it('is empty for a window the forecast does not reach', () => {
        const start = DateTime.fromSeconds(1794423600 - 7200);
        const end = DateTime.fromSeconds(1794423600 - 3600);
        expect(forecastSeries(word, start, end)).toEqual({ HourStartS: [], ForecastList: [] });
    });
});
