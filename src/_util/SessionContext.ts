import { DateTime } from 'luxon';
import { createContext } from 'react';

/** Only these role keys are accepted; any other keys from the API are ignored. */
const ALLOWED_ROLE_NAMES = new Set(['admin', 'viewer', 'owner']);


export function installationRoleForGNode(
    installationRoles: InstallationRole[] | undefined,
    gNode: string | undefined,
): InstallationRole | undefined {
    if (!installationRoles?.length || gNode == null || gNode === '') {
        return undefined;
    }
    const needle = decodeURIComponent(gNode).trim();
    return installationRoles.find((i) => i.gNodeAlias === needle);
}

export interface InstallationRole {
    role: string;
    gNodeAlias: string;
    displayName: string;
    alertStatus: any;
    address: any;
    commit: string;
}

export interface Session {
    username: string;
    installationRoles: InstallationRole[];
}

export default createContext<Session | null>(null);

export function getRoleForInstallation(session: Session | null, installationGNode: string): string | null {
    if (!session) {
        return null;
    }

    return session.installationRoles.find(r => r.gNodeAlias == installationGNode)?.role || null;
}

export function canViewRealTimePage(session: Session | null): boolean {
    return !!session && session.installationRoles.some(r => ['owner', 'admin'].includes(r.role));
}

export function canConnectRealTimeData(session: Session | null, installationGNode: string) : boolean {
    const role = getRoleForInstallation(session, installationGNode);
    return !!role && ['owner', 'admin'].includes(role);
}

export function canViewAdminPages(session: Session | null): boolean {
    return !!session && session.installationRoles.some(r => r.role === 'admin');
}

export function hasUnlimitedLookback(session: Session, installationGNodes: string[]) {
    return !!session && installationGNodes.some(n => ['owner', 'admin'].includes(getRoleForInstallation(session, n) || 'missing'));
}

/** Only admins and owners can view data newer than 10 days. */
export function canViewDataFromDate(session: Session | null, installationGNodes: string[], date: DateTime) {
    if (!session) {
        return false;
    }

    if (installationGNodes.every(n => ['owner', 'admin'].includes(session.installationRoles.find(r => r.gNodeAlias == n)?.role || 'missing'))) {
        return true;
    }

    return date < DateTime.now().minus({days: 10});
}