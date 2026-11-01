import { z } from 'zod';
import { LeftRightDot, NonEmptyString, NonNegativeInt, PositiveInt, UtcIso8601Seconds, Uuid4Str } from '../formats';
import { WeatherForecastBinding } from './WeatherForecastBinding';

/** Sema: https://schemas.electricity.works/types/gw.weather.forecast.bundle.gt/002 */
export const WeatherForecastBundleGt = z
    .strictObject({
        Name: LeftRightDot,
        DisplayName: NonEmptyString,
        LocationAlias: LeftRightDot,
        BindingList: z.array(WeatherForecastBinding),
        EmitPeriodS: PositiveInt,
        EmitOffsetS: NonNegativeInt,
        Start: UtcIso8601Seconds,
        Id: Uuid4Str,
        TypeName: z.literal('gw.weather.forecast.bundle.gt'),
        Version: z.literal('002'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (NonEmptyBindings) failed: BindingList is empty',
        path: ['BindingList'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (SharedSliceGrid) failed: the forecast channels differ in SliceDurationSList',
        path: ['BindingList'],
    })
    .refine(checkAxiom3, {
        message: 'Axiom 3 (EmitOffsetBound) failed: EmitOffsetS is not less than EmitPeriodS',
        path: ['EmitOffsetS'],
    })
    .refine(checkAxiom4, {
        message: 'Axiom 4 (DistinctChannels) failed: a ForecastChannel.Name repeats across BindingList',
        path: ['BindingList'],
    })
    .refine(checkAxiom5, {
        message: 'Axiom 5 (DistinctQuantities) failed: an ObservationChannel.Quantity repeats across BindingList',
        path: ['BindingList'],
    })
    .refine(checkAxiom6, {
        message: 'Axiom 6 (NameShape) failed: Name is not LocationAlias + "." + exactly one segment',
        path: ['Name'],
    });
export type WeatherForecastBundleGt = z.infer<typeof WeatherForecastBundleGt>;

type Shape = {
    Name: string;
    LocationAlias: string;
    BindingList: { ForecastChannel: { Name: string; SliceDurationSList: number[] }; ObservationChannel: { Quantity: string } }[];
    EmitPeriodS: number;
    EmitOffsetS: number;
};

function checkAxiom1(b: Shape): boolean {
    return b.BindingList.length > 0;
}

function checkAxiom2(b: Shape): boolean {
    const grids = new Set(b.BindingList.map((x) => x.ForecastChannel.SliceDurationSList.join(',')));
    return grids.size <= 1;
}

function checkAxiom3(b: Shape): boolean {
    return b.EmitOffsetS < b.EmitPeriodS;
}

function checkAxiom4(b: Shape): boolean {
    const names = b.BindingList.map((x) => x.ForecastChannel.Name);
    return new Set(names).size === names.length;
}

function checkAxiom5(b: Shape): boolean {
    const quantities = b.BindingList.map((x) => x.ObservationChannel.Quantity);
    return new Set(quantities).size === quantities.length;
}

function checkAxiom6(b: Shape): boolean {
    const prefix = `${b.LocationAlias}.`;
    const tail = b.Name.startsWith(prefix) ? b.Name.slice(prefix.length) : '';
    return tail.length > 0 && !tail.includes('.');
}
