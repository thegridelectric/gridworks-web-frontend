import { z } from 'zod';
import { FloParams } from './FloParams';
import { FloParams001 } from './old_versions/FloParams001';

/** The `flo.params` versions the journal holds: 001 rows state the price
 *  as two lists (LMP and distribution) and name no forecast, so the
 *  backend serves each at its own version and the browser reads both. */
export const AnyFloParams = z.union([FloParams, FloParams001]);
export type AnyFloParams = z.infer<typeof AnyFloParams>;

/** The price the LTN asked the FLO to optimize against, per step, in USD
 *  per MWh: the one list at 002, the LMP and distribution lists summed at
 *  001. */
export function priceUsdMwhList(params: AnyFloParams): number[] {
    return params.Version === '002' ? params.PriceUsdMwhList : params.LmpUsdMwhList.map((lmp, i) => lmp + params.DistUsdMwhList[i]);
}
