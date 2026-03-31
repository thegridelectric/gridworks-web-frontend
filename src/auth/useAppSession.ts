import { useEffect, useRef, useState } from 'react';

import GridworksApi from '../_util/GridWorksApi';
import type { Session } from '../_util/SessionContext';
import { getAuthToken, getDisplayUserName } from './auth';
import { fetchFallbackInstallations } from './fetchFallbackInstallations';

interface UseAppSessionResult {
    isLoadingSession: boolean;
    session: Session | null;
    hasResolvedSession: boolean;
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
                const sessionRes = await GridworksApi.get<Session>('/api/v2/session');
                if (cancelled) return;

                let installations = sessionRes.data.installations ?? [];
                let userName = sessionRes.data.userName;
                let homesError: string | null = null;
                const token = getAuthToken();

                if (installations.length === 0 && token) {
                    try {
                        const installationsFromFallback = await fetchFallbackInstallations(token);
                        if (!cancelled) {
                            installations = installationsFromFallback;
                            userName = getDisplayUserName();
                        }
                    } catch (e) {
                        if (!cancelled) {
                            homesError = e instanceof Error ? e.message : 'Unknown error';
                        }
                    }
                }

                if (!cancelled) {
                    setSession({
                        userName,
                        installations,
                        homesError,
                    });
                }
            } catch {
                const token = getAuthToken();
                if (!token) {
                    if (!cancelled) {
                        setSession(null);
                    }
                    return;
                }

                try {
                    const installationsFromFallback = await fetchFallbackInstallations(token);
                    if (!cancelled) {
                        setSession({
                            userName: getDisplayUserName(),
                            installations: installationsFromFallback,
                            homesError: null,
                        });
                    }
                } catch {
                    if (!cancelled) {
                        setSession(null);
                    }
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
