import { z } from 'zod';
import { MarketPriceUnit } from '../enums/MarketPriceUnit';
import { LeftRightDot, MarketSlotName, UtcMilliseconds, Uuid4Str } from '../formats';
import { PriceComponent } from './PriceComponent';

/** Sema: https://schemas.electricity.works/types/latest.price/001 */
export const LatestPrice = z
    .strictObject({
        FromGNodeAlias: LeftRightDot,
        PriceX1000: z.number().int(),
        PriceUnit: MarketPriceUnit,
        MarketSlotName: MarketSlotName,
        Components: z.array(PriceComponent),
        TariffAlias: LeftRightDot.optional(),
        CreatedMs: UtcMilliseconds.optional(),
        MessageId: Uuid4Str,
        TypeName: z.literal('latest.price'),
        Version: z.literal('001'),
    })
    .refine(checkAxiom1a, { message: 'Axiom 1 (ComponentsSumToPrice, clause a) failed: Components is empty', path: ['Components'] })
    .refine(checkAxiom1b, { message: 'Axiom 1 (ComponentsSumToPrice, clause b) failed: the components do not sum to PriceX1000', path: ['Components'] })
    .refine(checkAxiom2, { message: 'Axiom 2 (DistinctNamedComponents) failed: a Name other than Unknown appears twice', path: ['Components'] })
    .refine(checkAxiom3, { message: 'Axiom 3 (TariffWithDelivery) failed: TariffAlias is present exactly when a Delivery component is', path: ['TariffAlias'] });
export type LatestPrice = z.infer<typeof LatestPrice>;

type Shape = { PriceX1000: number; Components: PriceComponent[]; TariffAlias?: string };

function checkAxiom1a(p: Shape): boolean {
    return p.Components.length > 0;
}

function checkAxiom1b(p: Shape): boolean {
    return p.Components.reduce((sum, c) => sum + c.PriceX1000, 0) === p.PriceX1000;
}

function checkAxiom2(p: Shape): boolean {
    const named = p.Components.map((c) => c.Name).filter((n) => n !== 'Unknown');
    return new Set(named).size === named.length;
}

function checkAxiom3(p: Shape): boolean {
    const hasDelivery = p.Components.some((c) => c.Name === 'Delivery');
    return hasDelivery === (p.TariffAlias !== undefined);
}

/** The slot start the name's last segment states, in unix seconds. */
export function slotStartS(price: LatestPrice): number {
    return Number(price.MarketSlotName.slice(-10));
}
