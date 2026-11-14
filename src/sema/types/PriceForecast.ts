import { z } from 'zod';
import { MarketPriceUnit } from '../enums/MarketPriceUnit';
import { MarketProductName } from '../enums/MarketProductName';
import { LeftRightDot, UtcMilliseconds, UtcSeconds, Uuid4Str } from '../formats';

/** Sema: https://schemas.electricity.works/types/gw.price.forecast/000 */
export const PriceForecast = z
    .strictObject({
        FromGNodeAlias: LeftRightDot,
        MarketMakerAlias: LeftRightDot,
        ProductName: MarketProductName,
        ForecastUid: Uuid4Str,
        CreatedMs: UtcMilliseconds,
        SlotStartS: z.array(UtcSeconds),
        PriceUnit: MarketPriceUnit,
        PriceX1000List: z.array(z.number().int()),
        TypeName: z.literal('gw.price.forecast'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1a, { message: 'Axiom 1 (SlotGrid, clause a) failed: SlotStartS is empty', path: ['SlotStartS'] })
    .refine(checkAxiom1b, { message: 'Axiom 1 (SlotGrid, clause b) failed: SlotStartS is not strictly ascending', path: ['SlotStartS'] })
    .refine(checkAxiom1c, { message: 'Axiom 1 (SlotGrid, clause c) failed: a slot start is not divisible by 300', path: ['SlotStartS'] })
    .refine(checkAxiom2, { message: 'Axiom 2 (OnePricePerSlot) failed: PriceX1000List and SlotStartS differ in length', path: ['PriceX1000List'] });
export type PriceForecast = z.infer<typeof PriceForecast>;

type Shape = { SlotStartS: number[]; PriceX1000List: number[] };

function checkAxiom1a(f: Shape): boolean {
    return f.SlotStartS.length > 0;
}

function checkAxiom1b(f: Shape): boolean {
    return f.SlotStartS.every((s, i) => i === 0 || s > f.SlotStartS[i - 1]);
}

function checkAxiom1c(f: Shape): boolean {
    return f.SlotStartS.every((s) => s % 300 === 0);
}

function checkAxiom2(f: Shape): boolean {
    return f.PriceX1000List.length === f.SlotStartS.length;
}
