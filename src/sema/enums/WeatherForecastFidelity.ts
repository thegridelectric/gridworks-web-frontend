import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw.weather.forecast.fidelity/000 */
export const WeatherForecastFidelity = semaStrEnum(
    'gw.weather.forecast.fidelity',
    '000',
    ['Unknown', 'Live', 'Stored', 'SeasonalTemplate'],
    'Unknown',
);
export type WeatherForecastFidelity = z.infer<typeof WeatherForecastFidelity>;
