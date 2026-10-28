import { z } from 'zod';

/** Sema: https://schemas.electricity.works/enums/gw1.emission.method/000 */
export const Gw1EmissionMethod = z.enum(['OnTrigger', 'Periodic', 'AsyncAndPeriodic']);
export type Gw1EmissionMethod = z.infer<typeof Gw1EmissionMethod>;
