import { z } from 'zod';

/** Sema: https://schemas.electricity.works/types/price.quantity.unitless/001 */
export const PriceQuantityUnitless = z.strictObject({
    PriceX1000: z.number().int(),
    QuantityX1000: z.number().int(),
    TypeName: z.literal('price.quantity.unitless'),
    Version: z.literal('001'),
});
export type PriceQuantityUnitless = z.infer<typeof PriceQuantityUnitless>;
