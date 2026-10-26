import type { LayoutLite } from './LayoutLite';

export const SIEG_FLOW_CHANNEL = 'sieg-flow';
export const SIEG_SEND_CHANNEL = 'sieg-send';
export const PRIMARY_FLOW_CHANNEL = 'primary-flow';

/** The sieg loop is in the layout when a data channel reads its flow. */
export function layoutHasSiegLoop(layout: LayoutLite | null | undefined): boolean {
    return !!layout && layout.DataChannels.some((c) => c.Name === SIEG_FLOW_CHANNEL);
}

export function hasPrimaryLoopFlow(readings: Record<string, number>, siegLoop: boolean): boolean {
    const reading = siegLoop ? readings[SIEG_SEND_CHANNEL] : readings[PRIMARY_FLOW_CHANNEL];
    return !!(reading && reading > 0);
}
