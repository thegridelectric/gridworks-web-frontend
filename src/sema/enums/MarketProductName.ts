import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw.market.product.name/001 */
export const MarketProductName = semaStrEnum(
    'gw.market.product.name',
    '001',
    ['unknown', 'da60', 'rt60gate5', 'rt60gate30', 'rt60gate30b', 'rt30gate5', 'rt15gate5', 'rt5gate5', 'rt60gate1'],
    'unknown',
);
export type MarketProductName = z.infer<typeof MarketProductName>;
