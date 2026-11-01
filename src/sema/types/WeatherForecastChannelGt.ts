import { z } from 'zod';
import { LeftRightDot, NonEmptyString, PositiveInt, UtcIso8601Seconds, Uuid4Str } from '../formats';

/** Sema: https://schemas.electricity.works/types/gw.weather.forecast.channel.gt/000 */
export const WeatherForecastChannelGt = z
    .strictObject({
        Name: LeftRightDot,
        TargetChannelName: LeftRightDot,
        Forecaster: LeftRightDot,
        Method: LeftRightDot,
        SourceLocator: NonEmptyString.optional(),
        TotalSlices: PositiveInt,
        SliceDurationSList: z.array(PositiveInt),
        ForecastDurationMinutes: PositiveInt,
        Start: UtcIso8601Seconds,
        Id: Uuid4Str,
        TypeName: z.literal('gw.weather.forecast.channel.gt'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (SliceCount) failed: TotalSlices is not the length of SliceDurationSList',
        path: ['TotalSlices'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (DurationConsistency) failed: SliceDurationSList does not sum to ForecastDurationMinutes * 60',
        path: ['ForecastDurationMinutes'],
    })
    .refine(checkAxiom3, {
        message: 'Axiom 3 (SliceQuantum) failed: a slice duration is not a positive multiple of 300',
        path: ['SliceDurationSList'],
    })
    .refine(checkAxiom4, {
        message: 'Axiom 4 (NameShape) failed: Name is not TargetChannelName + ".forecast." + more',
        path: ['Name'],
    });
export type WeatherForecastChannelGt = z.infer<typeof WeatherForecastChannelGt>;

type Shape = {
    Name: string;
    TargetChannelName: string;
    TotalSlices: number;
    SliceDurationSList: number[];
    ForecastDurationMinutes: number;
};

function checkAxiom1(c: Shape): boolean {
    return c.TotalSlices === c.SliceDurationSList.length;
}

function checkAxiom2(c: Shape): boolean {
    return c.SliceDurationSList.reduce((a, b) => a + b, 0) === c.ForecastDurationMinutes * 60;
}

function checkAxiom3(c: Shape): boolean {
    return c.SliceDurationSList.every((d) => d > 0 && d % 300 === 0);
}

function checkAxiom4(c: Shape): boolean {
    const prefix = `${c.TargetChannelName}.forecast.`;
    return c.Name.startsWith(prefix) && c.Name.length > prefix.length;
}
