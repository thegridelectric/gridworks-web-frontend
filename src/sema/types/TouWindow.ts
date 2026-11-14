import { z } from 'zod';
import { DayOfWeek } from '../enums/DayOfWeek';
import { HhMm } from '../formats';

/** Sema: https://schemas.electricity.works/types/gw.tou.window/000 */
export const TouWindow = z
    .strictObject({
        Start: HhMm,
        End: HhMm,
        Days: z.array(DayOfWeek),
        TypeName: z.literal('gw.tou.window'),
        Version: z.literal('000'),
    })
    .refine((w) => w.Start < w.End, {
        message: 'Axiom 1 (WindowOrder) failed: Start is not strictly earlier than End',
        path: ['Start'],
    })
    .refine((w) => w.Days.length > 0 && new Set(w.Days).size === w.Days.length, {
        message: 'Axiom 2 (DaysNonEmptyUnique) failed: Days is empty or repeats a day',
        path: ['Days'],
    });
export type TouWindow = z.infer<typeof TouWindow>;
