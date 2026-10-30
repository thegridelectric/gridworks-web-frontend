import { z } from 'zod';
import type { CommitStanding } from '../enums/CommitStanding';
import { HouseSummary } from './HouseSummary';
import { HouseSummary000 } from './old_versions/HouseSummary000';
import { HouseSummary001 } from './old_versions/HouseSummary001';

/** The `gw.house.summary` versions the browser reads, so either deploy
 *  order of the backend and the browser parses. */
export const AnyHouseSummary = z.union([HouseSummary, HouseSummary001, HouseSummary000]);
export type AnyHouseSummary = z.infer<typeof AnyHouseSummary>;

/** The scada's announced commit, which 000 does not state. */
export function scadaCommit(h: AnyHouseSummary): string | undefined {
    return h.Version === '000' ? undefined : h.ScadaCommit;
}

/** Where that commit stands against main, which only 002 states. */
export function scadaCommitStanding(h: AnyHouseSummary): CommitStanding | undefined {
    return h.Version === '002' ? h.ScadaCommitStanding : undefined;
}
