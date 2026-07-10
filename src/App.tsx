import { Navigate, useLocation } from "react-router";
import { Spinner } from "react-bootstrap";

import SessionContext, { canViewAdminPages, canViewRealTimePage, type InstallationSummary, type Session } from "./_util/SessionContext";
import HeaderLayout from "./_layout/HeaderLayout";
import { getAuthToken } from "./auth/auth";
import { useEffect, useState } from "react";
import GridWorksApi from './_util/GridWorksApi';
import { DateTime } from "luxon";



export default function App({ children }: React.PropsWithChildren) {

    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [session, setSession] = useState<Session | null>(null);

    const location = useLocation();
    const authToken = getAuthToken();
    const isSessionRequired = location.pathname !== '/login/';

    useEffect(() => {
        (async function() {
            if (!session && isSessionRequired) {
                setIsLoadingSession(true);
                try {
                    const refreshTime = DateTime.now();
                    // For now, a session is an array of installation summaries and the time that we fetched them.
                    // TODO implement auto-refresh with something like this:
                        // useEffect(() => {
                        //     const id = window.setInterval(() => setNowMs(Date.now()), tickMs);
                        //     return () => window.clearInterval(id);
                        // }, [tickMs]);

                    const installationSummariesResponse = await GridWorksApi.get<InstallationSummary[]>('/api/v2/installations/*/summaries');
                    setSession({ 
                        refreshTime,
                        installations: installationSummariesResponse.data 
                    });
                }
                catch {
                    console.log('Authentication failed')
                }
                finally {
                    setIsLoadingSession(false);
                }
            }
        })();
    }, [session, isSessionRequired]);

    if (location.pathname === '/') {
        return <Navigate to="/installations/" />;
    }
    if (!location.pathname.endsWith('/')) {
        return <Navigate to={`${location.pathname}/`} replace />;
    }
    if (isSessionRequired && !authToken) {
        return <Navigate to="/login/" replace state={{ from: location.pathname }} />;
    }

    if (isSessionRequired) {
        if (isLoadingSession) {
            return <HeaderLayout>
                <Spinner animation="border" role="status" />
            </HeaderLayout>
        }

        if (!session) {
            return <Navigate to="/login/" replace />;
        }

        if (!canViewAdminPages(session)) {
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
