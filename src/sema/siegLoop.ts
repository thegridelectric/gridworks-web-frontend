import type { LayoutLite } from './LayoutLite';

export const SIEG_FLOW_CHANNEL = 'sieg-flow';

/** The sieg loop is in the layout when a data channel reads its flow. */
export function layoutHasSiegLoop(layout: LayoutLite | null | undefined): boolean {
    return !!layout && layout.DataChannels.some((c) => c.Name === SIEG_FLOW_CHANNEL);
}
