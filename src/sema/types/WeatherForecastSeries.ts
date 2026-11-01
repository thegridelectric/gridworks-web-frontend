import { z } from 'zod';
import { LeftRightDot, UtcIso8601Seconds } from '../formats';
import { Quantity } from '../enums/Quantity';
import { WeatherForecastFidelity } from '../enums/WeatherForecastFidelity';

/** Sema: https://schemas.electricity.works/types/gw.weather.forecast.series/000 */
export const WeatherForecastSeries = z
    .strictObject({
        ChannelName: LeftRightDot,
        Quantity: Quantity,
        Values: z.array(z.number().int()),
        Fidelity: WeatherForecastFidelity,
        SourceUpdatedTime: UtcIso8601Seconds,
        TypeName: z.literal('gw.weather.forecast.series'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (NonEmptyValues) failed: Values is empty',
        path: ['Values'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (ForecastNaming) failed: ChannelName has no interior "forecast" segment',
        path: ['ChannelName'],
    });
export type WeatherForecastSeries = z.infer<typeof WeatherForecastSeries>;

type Shape = { ChannelName: string; Values: number[] };

function checkAxiom1(s: Shape): boolean {
    return s.Values.length > 0;
}

function checkAxiom2(s: Shape): boolean {
    return s.ChannelName.split('.').slice(1, -1).includes('forecast');
}
