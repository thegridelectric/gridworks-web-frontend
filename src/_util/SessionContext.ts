import { createContext } from 'react';

import type { HouseParameters } from '../parameters/types';

export interface BasicInstallationInfo {
    id: string;
    displayName: string;
    houseAlias?: string;
    locationLabel?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    };
    primaryContact?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
    };
    secondaryContact?: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
    };
    commit?: string;
    hardwareLayout?: string;
    alertStatus?: 'ok' | 'alert' | 'unknown';
    alertMessage?: string;
    houseParameters?: HouseParameters;
}

/** Match route segment to session row; IDs from /homes may be numbers while the URL is always a string. */
export function installationForRouteId(
    installations: BasicInstallationInfo[] | undefined,
    routeId: string | undefined,
): BasicInstallationInfo | undefined {
    if (!installations?.length || routeId == null || routeId === '') {
        return undefined;
    }
    const needle = decodeURIComponent(routeId).trim();
    return installations.find((i) => String(i.id).trim() === needle);
}

export interface Session {
    userName: string;
    installations: BasicInstallationInfo[];
    homesError?: string | null;
}

export default createContext<Session | null>(null);

// export interface SessionContext {
//     isLoading: boolean,
//     session: Session | null
// }

// export default createContext<SessionContext>({isLoading: true, session: null});
