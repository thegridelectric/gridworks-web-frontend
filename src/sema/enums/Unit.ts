import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw1.unit/003 */
export const Unit = semaStrEnum(
    'gw1.unit',
    '003',
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
        'DollarsX1000',
        'MilesPerHourX1000',
        'KilowattHoursX1000',
        'WattsPerSquareMeter',
        'MilesPerHourX10',
        'FahrenheitX10',
    ],
    'Unknown',
);
export type Unit = z.infer<typeof Unit>;
