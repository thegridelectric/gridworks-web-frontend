import { z } from 'zod';
import { WeatherChannelGt } from './WeatherChannelGt';
import { WeatherForecastChannelGt } from './WeatherForecastChannelGt';

/** Sema: https://schemas.electricity.works/types/gw.weather.forecast.binding/000 */
export const WeatherForecastBinding = z
    .strictObject({
        ForecastChannel: WeatherForecastChannelGt,
        ObservationChannel: WeatherChannelGt,
        TypeName: z.literal('gw.weather.forecast.binding'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (TargetBinding) failed: ForecastChannel.TargetChannelName is not ObservationChannel.Name',
        path: ['ForecastChannel'],
    });
export type WeatherForecastBinding = z.infer<typeof WeatherForecastBinding>;

type Shape = { ForecastChannel: { TargetChannelName: string }; ObservationChannel: { Name: string } };

function checkAxiom1(b: Shape): boolean {
    return b.ForecastChannel.TargetChannelName === b.ObservationChannel.Name;
}
