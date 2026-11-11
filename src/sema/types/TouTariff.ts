import { z } from 'zod';
import { IanaTimezoneStr, LeftRightDot } from '../formats';
import { TouWindow } from './TouWindow';

/** Sema: https://schemas.electricity.works/types/gw.tou.tariff/000 */
export const TouTariff = z
    .strictObject({
        Alias: LeftRightDot,
        DisplayName: z.string(),
        TimezoneStr: IanaTimezoneStr,
        OnPeakWindows: z.array(TouWindow),
        TypeName: z.literal('gw.tou.tariff'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (PerDayWindowNonOverlap) failed: two windows overlap on one day',
        path: ['OnPeakWindows'],
    });
export type TouTariff = z.infer<typeof TouTariff>;

function checkAxiom1(t: { OnPeakWindows: { Start: string; End: string; Days: string[] }[] }): boolean {
    const byDay = new Map<string, { Start: string; End: string }[]>();
    for (const w of t.OnPeakWindows) {
        for (const d of w.Days) byDay.set(d, [...(byDay.get(d) ?? []), w]);
    }
    for (const windows of byDay.values()) {
        const sorted = [...windows].sort((a, b) => a.Start.localeCompare(b.Start));
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].Start < sorted[i - 1].End) return false;
        }
    }
    return true;
}
