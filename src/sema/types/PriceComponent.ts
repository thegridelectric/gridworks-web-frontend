import { z } from 'zod';
import { PriceComponentName } from '../enums/PriceComponentName';

/** Sema: https://schemas.electricity.works/types/price.component/000 */
export const PriceComponent = z.strictObject({
    Name: PriceComponentName,
    PriceX1000: z.number().int(),
    TypeName: z.literal('price.component'),
    Version: z.literal('000'),
});
export type PriceComponent = z.infer<typeof PriceComponent>;
