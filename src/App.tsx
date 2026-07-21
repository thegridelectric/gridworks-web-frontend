import { Navigate, useLocation } from "react-router";
import { Spinner } from "react-bootstrap";

import SessionContext, { canViewRealTimePage, type Session } from "./_util/SessionContext";
import HeaderLayout from "./_layout/HeaderLayout";
import { getAuthToken, parseAuthToken } from "./auth/auth";
import { useEffect, useState } from "react";
import GridWorksApi from './_util/GridWorksApi';
import type { InstallationSummary } from "./sema";
import { useTimer } from "./_util/useTimer";
import { usePageVisibility } from "./_util/usePageVisibility";



export default function App({ children }: React.PropsWithChildren) {

    const [session, setSession] = useState<Session | null>(null);
    const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);

    const location = useLocation();
    const authToken = getAuthToken();
    const refreshTime = useTimer(36_000); // 0.01 hours, so the heat-call time will update
    const isVisible = usePageVisibility();


    // TODO in the future -- switch to react-query?
    //
    // const installationSummariesQuery = useQuery({
    //     queryKey: ['installation-summaries'],
    //     refetchInterval: 36_000,
    //     refetchIntervalInBackground: false, // default: false, pauses when tab hidden
    //     refetchOnWindowFocus: true, // refetch when tab regains focus
    //     queryFn: () => {

    //     })
    //  })

    const isAuthRequired = location.pathname !== '/login/';
    const isSessionLoaded = !!session;

    useEffect(() => {
        (async function() {
            if (authToken && (isVisible || !isSessionLoaded)) {
                try {
                    const installationSummariesResponse = await GridWorksApi.get<InstallationSummary[]>('/api/v2/installations/*/summaries');
                    const authTokenData = parseAuthToken(authToken!);
                    setSession({ 
                        ...authTokenData,
                        refreshTime,
                        installations: installationSummariesResponse.data 
                    });
                }
                catch (ex: any) {
                    // If it's a 401 then our interceptor will clear the auth token and redirect to login.
                    // For all other errors we just 
                    console.warn('Fetching installation summaries failed');
                    console.error(ex);
                    if (!session) {
                        setSessionLoadError('message' in ex ? ex.message : 'Unknown error')
                    }
                }
            }
        })();
    }, [authToken, isSessionLoaded, refreshTime, isVisible]);

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
            return <HeaderLayout>
                <div className="alert alert-danger mt-3 mb-0" role="alert">{sessionLoadError}</div>
            </HeaderLayout>
        }
        else if (!session) {
            // If we have an authToken but no session we must be loading the session...
            return <HeaderLayout>
                <Spinner animation="border" role="status" />
            </HeaderLayout>
        }
        else if (!session.isSystemAdmin) {
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
