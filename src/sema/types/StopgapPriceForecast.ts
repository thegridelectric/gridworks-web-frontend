import { z } from 'zod';
import { LeftRightDot, UtcSeconds, Uuid4Str } from '../formats';

/** Sema: https://schemas.electricity.works/types/gw.stopgap.price.forecast/000 */
export const StopgapPriceForecast = z
    .strictObject({
        FromGNodeAlias: LeftRightDot,
        PNodeAlias: LeftRightDot,
        TariffAlias: LeftRightDot,
        HourStartS: z.array(UtcSeconds),
        LmpList: z.array(z.number()),
        DistList: z.array(z.number()),
        PriceUid: Uuid4Str,
        ForecastCreatedS: UtcSeconds,
        TypeName: z.literal('gw.stopgap.price.forecast'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (ListLengthConsistency) failed: HourStartS, LmpList and DistList differ in length',
        path: ['HourStartS'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (HoursAscending) failed: HourStartS is not strictly increasing',
        path: ['HourStartS'],
    })
    .refine(checkAxiom3, {
        message: 'Axiom 3 (ForecastCreatedBeforeFirstHour) failed: ForecastCreatedS is not before the first hour',
        path: ['ForecastCreatedS'],
    });
export type StopgapPriceForecast = z.infer<typeof StopgapPriceForecast>;

type Shape = { HourStartS: number[]; LmpList: number[]; DistList: number[]; ForecastCreatedS: number };

function checkAxiom1(f: Shape): boolean {
    return f.HourStartS.length === f.LmpList.length && f.HourStartS.length === f.DistList.length;
}

function checkAxiom2(f: Shape): boolean {
    return f.HourStartS.every((h, i) => i === 0 || h > f.HourStartS[i - 1]);
}

function checkAxiom3(f: Shape): boolean {
    return f.HourStartS.length === 0 || f.ForecastCreatedS < f.HourStartS[0];
}
