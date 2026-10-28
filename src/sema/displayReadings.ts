/** A snapshot's readings converted for display through the unit the
 *  house's `layout.lite` declares for each channel. A channel the layout
 *  does not declare, or whose unit has no row in the unit table, keeps
 *  its raw value and no display value; the page shows it marked. */
import { channelUnit } from './layoutUnits';
import type { AnyLayoutLite } from './types/AnyLayoutLite';
import { toDisplayValue } from './units';

export interface DisplayReading {
    /** The integer the scada sent. */
    raw: number;
    /** The declared unit, when the layout declares the channel. */
    unit?: string;
    /** The value in the unit table's display unit, when the unit has a row. */
    display?: number;
}

export type DisplayReadings = Record<string, DisplayReading>;

export function displayReadings(layout: AnyLayoutLite | undefined, readings: Record<string, number>): DisplayReadings {
    const out: DisplayReadings = {};
    for (const [name, raw] of Object.entries(readings)) {
        const declared = layout === undefined ? undefined : channelUnit(layout, name);
        if (declared === undefined) {
            out[name] = { raw };
            continue;
        }
        out[name] = { raw, unit: declared.unit, display: toDisplayValue(declared.unit, raw) };
    }
    return out;
}

/** The marker on a value shown unconverted. */
export const RAW_MARKER = ' raw';

/** The reading as text: the display value to `digits` with `suffix`, the raw
 *  integer with the raw marker when there is no display value, `-` when
 *  there is no reading. */
export function formatReading(reading: DisplayReading | undefined, digits: number, suffix = ''): string {
    if (reading === undefined) {
        return '-';
    }
    if (reading.display === undefined) {
        return `${reading.raw}${RAW_MARKER}`;
    }
    return `${reading.display.toFixed(digits)}${suffix}`;
}
