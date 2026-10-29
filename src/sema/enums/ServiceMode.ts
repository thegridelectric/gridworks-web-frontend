import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw1.service.mode/000 */
export const ServiceMode = semaStrEnum(
    'gw1.service.mode',
    '000',
    ['Heating', 'Cooling'],
    'Heating',
);
export type ServiceMode = z.infer<typeof ServiceMode>;
