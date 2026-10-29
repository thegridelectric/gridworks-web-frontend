import { z } from 'zod';
import { semaStrEnum } from '../semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw1.unit/001 */
export const Unit001 = semaStrEnum(
    'gw1.unit',
    '001',
    [
        'Unknown',
        'Unitless',
        'FahrenheitX100',
        'Watts',
        'WattHours',
        'Gallons',
        'GpmX100',
        'Seconds',
        'SecondsX10',
        'Milliseconds',
    ],
    'Unknown',
);
export type Unit001 = z.infer<typeof Unit001>;
