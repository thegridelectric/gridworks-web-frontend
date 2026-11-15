import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/price.component.name/000 */
export const PriceComponentName = semaStrEnum(
    'price.component.name',
    '000',
    [
        'Unknown',
        'WholesaleEnergy',
        'WholesaleCongestion',
        'WholesaleLoss',
        'Delivery',
        'CoincidentPeakTransmission',
        'CoincidentPeakCapacity',
    ],
    'Unknown',
);
export type PriceComponentName = z.infer<typeof PriceComponentName>;
