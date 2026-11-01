import { z } from 'zod';
import { WeatherForecast } from './WeatherForecast';
import { WeatherForecast001 } from './old_versions/WeatherForecast001';

/** The `gw.weather.forecast` versions the journal holds: the service's
 *  001 emissions have no ForecastUid and no upgrade path, so the backend
 *  serves each at its own version and the browser reads both. */
export const AnyWeatherForecast = z.union([WeatherForecast, WeatherForecast001]);
export type AnyWeatherForecast = z.infer<typeof AnyWeatherForecast>;
