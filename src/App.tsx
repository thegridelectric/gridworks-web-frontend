import { Navigate, useLocation } from "react-router";
import { Spinner } from "react-bootstrap";

import SessionContext, { canViewAdminPages, canViewRealTimePage, type Session } from "./_util/SessionContext";
import HeaderLayout from "./_layout/HeaderLayout";
import { getAuthToken, parseUsernameFromAuthToken } from "./auth/auth";
import { useEffect, useState } from "react";
import GridWorksApi from './_util/GridWorksApi';
import { DateTime } from "luxon";
import type { InstallationSummary } from "./sema";



export default function App({ children }: React.PropsWithChildren) {

    const [session, setSession] = useState<Session | null>(null);
    const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);

    const location = useLocation();
    const authToken = getAuthToken();

    const isAuthRequired = location.pathname !== '/login/';
    const isSessionLoaded = !!session;

    useEffect(() => {
        (async function() {
            if (!isSessionLoaded && authToken) {
                try {
                    const refreshTime = DateTime.now();
                    // For now, a session is an array of installation summaries and the time that we fetched them.
                    // TODO implement auto-refresh with something like this:
                        // useEffect(() => {
                        //     const id = window.setInterval(() => setNowMs(Date.now()), tickMs);
                        //     return () => window.clearInterval(id);
                        // }, [tickMs]);

                    const installationSummariesResponse = await GridWorksApi.get<InstallationSummary[]>('/api/v2/installations/*/summaries');
                    const username = parseUsernameFromAuthToken(authToken!);
                    setSession({ 
                        username,
                        refreshTime,
                        installations: installationSummariesResponse.data 
                    });
                }
                catch (ex: any) {
                    console.warn('Authentication failed');
                    console.warn(ex);
                    setSessionLoadError('message' in ex ? ex.message : 'Unknown error')
                }
            }
        })();
    }, [authToken, isSessionLoaded]);

    if (location.pathname === '/') {
        return <Navigate to="/installations/" />;
    }
    if (!location.pathname.endsWith('/')) {
        return <Navigate to={`${location.pathname}/`} replace />;
    }
    if (isAuthRequired && !authToken) {
        return <Navigate to="/login/" replace state={{ from: location.pathname }} />;
    }

    if (authToken) {
        if (sessionLoadError) {
            return <Navigate to="/login/" replace state={{ from: location.pathname }} />;
        }
        else if (!session) {
            // If we have an authToken but no session we must be loading the session...
            return <HeaderLayout>
                <Spinner animation="border" role="status" />
            </HeaderLayout>
        }
        else if (!canViewAdminPages(session)) {
            const isAllowedPath =
                location.pathname.startsWith('/installations/') ||
                (location.pathname.startsWith('/real-time/') && canViewRealTimePage(session)) ||
                location.pathname.startsWith('/visualizer/');
            if (!isAllowedPath) {
                return <Navigate to="/installations/" replace />;
            }
        }
    }

    return <SessionContext value={session}>
        {children}
    </SessionContext>

}
