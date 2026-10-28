/** Which loops a house's plant has, read from the channels its
 *  `layout.lite` declares. */
import type { DisplayReadings } from './displayReadings';

export const SIEG_FLOW_CHANNEL = 'sieg-flow';
export const SIEG_SEND_CHANNEL = 'sieg-send';
export const PRIMARY_FLOW_CHANNEL = 'primary-flow';
export const SECONDARY_FLOW_CHANNEL = 'secondary-flow';

/** The channel names a layout declares; every `layout.lite` version the browser reads has these. */
export interface DeclaresChannels {
    DataChannels: { Name: string }[];
}

/** The sieg loop is in the layout when a data channel reads its flow. */
export function layoutHasSiegLoop(layout: DeclaresChannels | null | undefined): boolean {
    return layoutHasDataChannel(layout, SIEG_FLOW_CHANNEL);
}

/** The secondary loop (heat pump to exchanger) is in the layout when a data channel reads its flow. */
export function layoutHasSecondaryLoop(layout: DeclaresChannels | null | undefined): boolean {
    return layoutHasDataChannel(layout, SECONDARY_FLOW_CHANNEL);
}

function layoutHasDataChannel(layout: DeclaresChannels | null | undefined, name: string): boolean {
    return !!layout && layout.DataChannels.some((c) => c.Name === name);
}

/** The sieg send flow in GPM at or above which the primary loop counts as flowing. */
const SIEG_SEND_FLOWING_GPM = 0.5;

export function hasPrimaryLoopFlow(readings: DisplayReadings, siegLoop: boolean): boolean {
    if (siegLoop) {
        return (readings[SIEG_SEND_CHANNEL]?.display ?? 0) >= SIEG_SEND_FLOWING_GPM;
    }
    return (readings[PRIMARY_FLOW_CHANNEL]?.display ?? 0) > 0;
}
