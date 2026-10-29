import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw.standby.posture/000 */
export const StandbyPosture = semaStrEnum(
    'gw.standby.posture',
    '000',
    ['MonitorOnly', 'NoHeatingOrCooling'],
    'MonitorOnly',
);
export type StandbyPosture = z.infer<typeof StandbyPosture>;
