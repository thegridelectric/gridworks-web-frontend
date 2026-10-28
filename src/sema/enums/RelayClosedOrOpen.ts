import { z } from 'zod';

/** Sema: https://schemas.electricity.works/enums/relay.closed.or.open/000 */
export const RelayClosedOrOpen = z.enum(['RelayClosed', 'RelayOpen']);
export type RelayClosedOrOpen = z.infer<typeof RelayClosedOrOpen>;
