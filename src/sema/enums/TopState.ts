import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw.top.state/000 */
export const TopState = semaStrEnum(
    'gw.top.state',
    '000',
    ['Auto', 'Admin'],
    'Auto',
);
export type TopState = z.infer<typeof TopState>;
