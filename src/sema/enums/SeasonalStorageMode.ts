import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw1.seasonal.storage.mode/000 */
export const SeasonalStorageMode = semaStrEnum(
    'gw1.seasonal.storage.mode',
    '000',
    ['AllTanks', 'BufferOnly'],
    'AllTanks',
);
export type SeasonalStorageMode = z.infer<typeof SeasonalStorageMode>;
