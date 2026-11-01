import { z } from 'zod';
import { LeftRightDot, UtcIso8601Seconds, UtcMilliseconds, Uuid4Str } from '../formats';
import { WeatherForecastSeries } from './WeatherForecastSeries';

/** Sema: https://schemas.electricity.works/types/gw.weather.forecast/002 */
export const WeatherForecast = z
    .strictObject({
        BundleName: LeftRightDot,
        MessageCreatedMs: UtcMilliseconds,
        FirstSliceStart: UtcIso8601Seconds,
        ForecastUid: Uuid4Str,
        SeriesList: z.array(WeatherForecastSeries),
        TypeName: z.literal('gw.weather.forecast'),
        Version: z.literal('002'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (NonEmptySeriesList) failed: SeriesList is empty',
        path: ['SeriesList'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (EqualValueLengths) failed: the series differ in Values length',
        path: ['SeriesList'],
    })
    .refine(checkAxiom3, {
        message: 'Axiom 3 (DistinctChannels) failed: a ChannelName repeats across SeriesList',
        path: ['SeriesList'],
    })
    .refine(checkAxiom4, {
        message: 'Axiom 4 (DistinctQuantities) failed: a Quantity repeats across SeriesList',
        path: ['SeriesList'],
    });
export type WeatherForecast = z.infer<typeof WeatherForecast>;

type Shape = { SeriesList: { ChannelName: string; Quantity: string; Values: number[] }[] };

function checkAxiom1(f: Shape): boolean {
    return f.SeriesList.length > 0;
}

function checkAxiom2(f: Shape): boolean {
    return new Set(f.SeriesList.map((s) => s.Values.length)).size <= 1;
}

function checkAxiom3(f: Shape): boolean {
    const names = f.SeriesList.map((s) => s.ChannelName);
    return new Set(names).size === names.length;
}

function checkAxiom4(f: Shape): boolean {
    const quantities = f.SeriesList.map((s) => s.Quantity);
    return new Set(quantities).size === quantities.length;
}
