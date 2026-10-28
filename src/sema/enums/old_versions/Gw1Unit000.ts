import { z } from 'zod';

/** Sema: https://schemas.electricity.works/enums/gw1.unit/000 */
export const Gw1Unit000 = z.enum(['Unknown', 'Unitless', 'FahrenheitX100', 'Watts', 'WattHours', 'Gallons', 'GpmX100']);
export type Gw1Unit000 = z.infer<typeof Gw1Unit000>;
