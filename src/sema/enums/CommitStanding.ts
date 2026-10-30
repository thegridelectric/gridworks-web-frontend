import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw.commit.standing/000 */
export const CommitStanding = semaStrEnum(
    'gw.commit.standing',
    '000',
    ['Unknown', 'OnMainHead', 'BehindMain', 'OffMain', 'Dirty'],
    'Unknown',
);
export type CommitStanding = z.infer<typeof CommitStanding>;
