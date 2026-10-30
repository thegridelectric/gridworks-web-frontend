import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw.dashboard.role/000 */
export const DashboardRole = semaStrEnum(
    'gw.dashboard.role',
    '000',
    ['Admin', 'Owner', 'Viewer'],
    'Viewer',
);
export type DashboardRole = z.infer<typeof DashboardRole>;
