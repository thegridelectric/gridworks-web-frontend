import { useEffect, useRef, useState } from 'react';

import type { BasicInstallationInfo, Session } from '../_util/SessionContext';
import {
    clearAuth,
    getAuthToken,
    getAuthUserInstallations,
    isAdminUser,
    validateAuthSession,
} from './auth';
import { fetchFallbackInstallations } from './fetchFallbackInstallations';

interface UseAppSessionResult {
    isLoadingSession: boolean;
    session: Session | null;
    hasResolvedSession: boolean;
}

function filterInstallationsForCurrentUser(
    installations: BasicInstallationInfo[],
): BasicInstallationInfo[] {
    if (isAdminUser()) {
        return installations;
    }
    const allowedAliases = new Set(getAuthUserInstallations());
    if (allowedAliases.size === 0) {
        return [];
    }
    return installations.filter((installation) => {
        const alias = (installation.houseAlias || installation.displayName || '').trim().toLowerCase();
        return alias !== '' && allowedAliases.has(alias);
    });
}

export function useAppSession(loadSession: boolean): UseAppSessionResult {
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [session, setSession] = useState<Session | null>(null);
    const [hasResolvedSession, setHasResolvedSession] = useState(!loadSession);
    const previousLoadSessionRef = useRef(loadSession);
    const isEnteringProtectedRoute = loadSession && !previousLoadSessionRef.current;

    useEffect(() => {
        if (!loadSession) {
            setIsLoadingSession(false);
            setSession(null);
            setHasResolvedSession(true);
            return;
        }

        let cancelled = false;
        setIsLoadingSession(true);
        setHasResolvedSession(false);

        (async () => {
            try {
                const token = getAuthToken();
                if (!token) {
                    if (!cancelled) {
                        setSession(null);
                    }
                    return;
                }

                const userName = await validateAuthSession();
                if (cancelled) {
                    return;
                }

                let installations: BasicInstallationInfo[] = [];
                let homesError: string | null = null;
                try {
                    installations = await fetchFallbackInstallations(token);
                } catch (e) {
                    if (e instanceof Error && e.message === 'Unauthorized') {
                        clearAuth();
                        if (!cancelled) {
                            setSession(null);
                        }
                        return;
                    }
                    homesError = e instanceof Error ? e.message : 'Unknown error';
                }

                if (!cancelled) {
                    setSession({
                        userName,
                        installations: filterInstallationsForCurrentUser(installations),
                        homesError,
                    });
                }
            } catch {
                if (!cancelled) {
                    setSession(null);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingSession(false);
                    setHasResolvedSession(true);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [loadSession]);

    useEffect(() => {
        previousLoadSessionRef.current = loadSession;
    }, [loadSession]);

    return {
        isLoadingSession: isLoadingSession || isEnteringProtectedRoute,
        session,
        hasResolvedSession: hasResolvedSession && !isEnteringProtectedRoute,
    };
}
