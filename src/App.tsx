import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { Spinner } from "react-bootstrap";

import GridworksApi from './_util/GridWorksApi';
import SessionContext, { type Session } from "./_util/SessionContext";
import HeaderLayout from "./_layout/HeaderLayout";
import { fetchVisualizerHomes, housesToInstallations } from "./visualizer/fetchVisualizerHomes";
import { getVisualizerAuthToken } from "./visualizer/visualizerAuth";



export default function App({ children }: React.PropsWithChildren) {
    const location = useLocation();
    if (location.pathname === '/') {
        return <Navigate to="/installations/" />;
    }
    if (!location.pathname.endsWith('/')) {
        return <Navigate to={`${location.pathname}/`} replace />;
    }

    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [session, setSession] = useState<Session | null>(null);

    const loadSession = location.pathname !== '/login/';
    useEffect(() => {
        if (!loadSession) {
            return;
        }
        let cancelled = false;
        setIsLoadingSession(true);
        (async () => {
            try {
                const sessionRes = await GridworksApi.get<Session>('/api/v2/session');
                if (cancelled) return;
                const token = getVisualizerAuthToken();
                let installations = sessionRes.data.installations ?? [];
                let homesError: string | null = null;
                if (token) {
                    try {
                        const houses = await fetchVisualizerHomes(token);
                        if (!cancelled) {
                            installations = housesToInstallations(houses);
                        }
                    } catch (e) {
                        if (!cancelled) {
                            homesError =
                                e instanceof Error ? e.message : 'Unknown error';
                        }
                    }
                }
                if (!cancelled) {
                    setSession({
                        userName: sessionRes.data.userName,
                        installations,
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
                }
            }
        })();
        return () => {
            cancelled = true;
        };
        // Intentionally omit `location.pathname`: installation id lives in the path (e.g.
        // `/parameters/{id}/`); changing it must not refetch session or show the loading spinner.
    }, [loadSession]);

    if (loadSession) {

        if (isLoadingSession) {
            return <HeaderLayout>
                <Spinner animation="border" role="status" />
            </HeaderLayout>
        }

        if (!session) {
            return <Navigate to="/login/" replace />;
        }
    }


    return <SessionContext value={loadSession ? session : null}>
        {children}
    </SessionContext>

}