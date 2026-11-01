import { z } from 'zod';
import { LeftRightDot, LowercaseToken, NonEmptyString, NonNegativeInt, PositiveInt, UtcIso8601Seconds, Uuid4Str } from '../formats';
import { Quantity } from '../enums/Quantity';
import { Unit } from '../enums/Unit';

/** Sema: https://schemas.electricity.works/types/gw.weather.channel.gt/002 */
export const WeatherChannelGt = z
    .strictObject({
        Name: LeftRightDot,
        DisplayName: NonEmptyString,
        Quantity: Quantity,
        Unit: Unit,
        StationAlias: LowercaseToken,
        EmitPeriodS: PositiveInt,
        EmitOffsetS: NonNegativeInt,
        Start: UtcIso8601Seconds,
        Id: Uuid4Str,
        TypeName: z.literal('gw.weather.channel.gt'),
        Version: z.literal('002'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (NameDerivation) failed: Name is not StationAlias + "." + the lowercased Quantity',
        path: ['Name'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (EmitOffsetBound) failed: EmitOffsetS is not less than EmitPeriodS',
        path: ['EmitOffsetS'],
    });
export type WeatherChannelGt = z.infer<typeof WeatherChannelGt>;

type Shape = { Name: string; StationAlias: string; Quantity: string; EmitPeriodS: number; EmitOffsetS: number };

function checkAxiom1(c: Shape): boolean {
    const derived = `${c.StationAlias}.${c.Quantity.toLowerCase()}`;
    return c.Name === derived || c.Name.startsWith(derived + '.');
}

function checkAxiom2(c: Shape): boolean {
    return c.EmitOffsetS < c.EmitPeriodS;
}
