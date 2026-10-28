/** A channel's declared unit, looked up by name in the house's layout.lite:
 *  a data channel's TelemetryName or a derived channel's OutputUnit. */
import type { AnyLayoutLite } from './types/AnyLayoutLite';

export type ChannelUnit =
    | { kind: 'telemetry'; unit: string }
    | { kind: 'derived'; unit: string };

export function channelUnit(layout: AnyLayoutLite, channelName: string): ChannelUnit | undefined {
    const data = layout.DataChannels.find((c) => c.Name === channelName);
    if (data !== undefined) {
        return { kind: 'telemetry', unit: data.TelemetryName };
    }
    const derived = layout.DerivedChannels.find((c) => c.Name === channelName);
    if (derived !== undefined && derived.OutputUnit !== undefined) {
        return { kind: 'derived', unit: derived.OutputUnit };
    }
    return undefined;
}
