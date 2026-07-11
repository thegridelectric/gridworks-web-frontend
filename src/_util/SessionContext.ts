import { DateTime } from 'luxon';
import { createContext } from 'react';
import type { InstallationSummary } from '../sema';

export function installationRoleForGNode(
    installationRoles: InstallationSummary[] | undefined,
    gNode: string | undefined,
): InstallationSummary | undefined {
    if (!installationRoles?.length || gNode == null || gNode === '') {
        return undefined;
    }
    const needle = decodeURIComponent(gNode).trim();
    return installationRoles.find((i) => i.GNodeAlias === needle);
}

export interface Session {
    username: string;
    refreshTime: DateTime;
    installations: InstallationSummary[];
}



export default createContext<Session | null>(null);

export function getRoleForInstallation(session: Session | null, installationGNode: string): string | null {
    if (!session) {
        return null;
    }

    return session.installations.find(ins => ins.GNodeAlias == installationGNode)?.Role || null;
}

export function canViewRealTimePage(session: Session | null): boolean {
    return !!session && session.installations.some(ins => ['owner', 'admin'].includes(ins.Role));
}

export function canConnectRealTimeData(session: Session | null, installationGNode: string) : boolean {
    const role = getRoleForInstallation(session, installationGNode);
    return !!role && ['owner', 'admin'].includes(role);
}

export function canViewAdminPages(session: Session | null): boolean {
    return !!session && session.installations.some(ins => ins.Role === 'admin');
}

export function hasUnlimitedLookback(session: Session, installationGNodes: string[]) {
    return !!session && installationGNodes.some(n => ['owner', 'admin'].includes(getRoleForInstallation(session, n) || 'missing'));
}

/** Only admins and owners can view data newer than 10 days. */
export function canViewDataFromDate(session: Session | null, installationGNodes: string[], date: DateTime) {
    if (!session) {
        return false;
    }

    if (installationGNodes.every(n => ['owner', 'admin'].includes(session.installations.find(ins => ins.GNodeAlias == n)?.Role || 'missing'))) {
        return true;
    }

    return date < DateTime.now().minus({days: 10});
}