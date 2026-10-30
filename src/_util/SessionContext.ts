import { DateTime } from 'luxon';
import { createContext } from 'react';
import { z } from 'zod';
import { AnyHouseSummary } from '../sema/types/AnyHouseSummary';

/** The summaries response parsed as `gw.house.summary` words. A summary
 *  that fails to parse is left out and warned about, so one house's seam
 *  fault does not blank the dashboard for the rest. */
export function parseHouseSummaries(data: unknown): AnyHouseSummary[] {
    const items = z.array(z.unknown()).parse(data);
    return items.flatMap((item) => {
        const parsed = AnyHouseSummary.safeParse(item);
        if (!parsed.success) {
            console.warn('gw.house.summary does not parse', item, parsed.error.issues);
            return [];
        }
        return [parsed.data];
    });
}

export function installationRoleForGNode(
    installationRoles: AnyHouseSummary[] | undefined,
    gNode: string | undefined,
): AnyHouseSummary | undefined {
    if (!installationRoles?.length || gNode == null || gNode === '') {
        return undefined;
    }
    const needle = decodeURIComponent(gNode).trim();
    return installationRoles.find((i) => i.GNodeAlias === needle);
}

export interface Session {
    username: string;
    isSystemAdmin: boolean;
    refreshTime: DateTime;
    installations: AnyHouseSummary[];
}



export default createContext<Session | null>(null);

export function getRoleForInstallation(session: Session | null, installationGNode: string): string | null {
    if (!session) {
        return null;
    }

    return session.installations.find(ins => ins.GNodeAlias == installationGNode)?.Role || null;
}

export function canViewRealTimePage(session: Session | null): boolean {
    return !!session && session.installations.some(ins => ['Owner', 'Admin'].includes(ins.Role));
}

export function canConnectRealTimeData(session: Session | null, installationGNode: string) : boolean {
    const role = getRoleForInstallation(session, installationGNode);
    return !!role && ['Owner', 'Admin'].includes(role);
}

export function hasUnlimitedLookback(session: Session, installationGNodes: string[]) {
    return !!session && installationGNodes.some(n => ['Owner', 'Admin'].includes(getRoleForInstallation(session, n) || 'missing'));
}

/** Only admins and owners can view data newer than 10 days. */
export function canViewDataFromDate(session: Session | null, installationGNodes: string[], date: DateTime) {
    if (!session) {
        return false;
    }

    if (installationGNodes.every(n => ['Owner', 'Admin'].includes(session.installations.find(ins => ins.GNodeAlias == n)?.Role || 'missing'))) {
        return true;
    }

    return date < DateTime.now().minus({days: 10});
}