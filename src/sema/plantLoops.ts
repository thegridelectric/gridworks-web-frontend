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

/** The layout reads the sieg send flow: the primary loop's flow is then that reading. */
export function layoutReadsSiegSend(layout: DeclaresChannels | null | undefined): boolean {
    return layoutHasDataChannel(layout, SIEG_SEND_CHANNEL);
}

/** The secondary loop (heat pump to exchanger) is in the layout when a data channel reads its flow. */
export function layoutHasSecondaryLoop(layout: DeclaresChannels | null | undefined): boolean {
    return layoutHasDataChannel(layout, SECONDARY_FLOW_CHANNEL);
}

// Channel-name matches. The fact each extracts is which loop a flow channel
// measures (sieg, primary, secondary); the layout fact that replaces them is a
// loop role on the channel in layout.lite, which no version states yet.
function layoutHasDataChannel(layout: DeclaresChannels | null | undefined, name: string): boolean {
    return !!layout && layout.DataChannels.some((c) => c.Name === name);
}

/** The sieg send flow in GPM at or above which the primary loop counts as flowing. */
const SIEG_SEND_FLOWING_GPM = 0.5;

/** Whether the primary loop is flowing. A layout that reads the sieg send
 *  flow decides by that reading; any other layout decides by the primary flow. */
export function hasPrimaryLoopFlow(readings: DisplayReadings, siegSendRead: boolean): boolean {
    if (siegSendRead) {
        return (readings[SIEG_SEND_CHANNEL]?.display ?? 0) >= SIEG_SEND_FLOWING_GPM;
    }
    return (readings[PRIMARY_FLOW_CHANNEL]?.display ?? 0) > 0;
}
