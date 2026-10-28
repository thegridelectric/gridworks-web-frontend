import { z } from 'zod';

/** Sema: https://schemas.electricity.works/enums/gw1.unit/001 */
export const Gw1Unit001 = z.enum([
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
]);
export type Gw1Unit001 = z.infer<typeof Gw1Unit001>;
