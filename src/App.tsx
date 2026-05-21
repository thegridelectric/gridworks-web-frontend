import { Navigate, useLocation } from "react-router";
import { Spinner } from "react-bootstrap";

import SessionContext, { canViewAdminPages, canViewRealTimePage, type Session } from "./_util/SessionContext";
import HeaderLayout from "./_layout/HeaderLayout";
import { getAuthToken } from "./auth/auth";
import { useEffect, useState } from "react";
import GridWorksApi from './_util/GridWorksApi';



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
                    const sessionResponse = await GridWorksApi.get<Session>('/api/v2/sessions/me');
                    setSession(sessionResponse.data);
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
