import { Navigate, useLocation } from "react-router";
import { Spinner } from "react-bootstrap";

import SessionContext from "./_util/SessionContext";
import HeaderLayout from "./_layout/HeaderLayout";
import { getAuthToken, hasAnyRealTimeEligibleRole, isAdminUser } from "./auth/auth";
import { useAppSession } from "./auth/useAppSession";



export default function App({ children }: React.PropsWithChildren) {
    const location = useLocation();
    const authToken = getAuthToken();
    const loadSession = location.pathname !== '/login/';
    const { isLoadingSession, session, hasResolvedSession } = useAppSession(loadSession);

    if (location.pathname === '/') {
        return <Navigate to="/installations/" />;
    }
    if (!location.pathname.endsWith('/')) {
        return <Navigate to={`${location.pathname}/`} replace />;
    }
    if (loadSession && !authToken) {
        return <Navigate to="/login/" replace state={{ from: location.pathname }} />;
    }
    if (loadSession && !isAdminUser()) {
        const isAllowedPath =
            location.pathname.startsWith('/installations/') ||
            (hasAnyRealTimeEligibleRole() && location.pathname.startsWith('/real-time/')) ||
            location.pathname.startsWith('/visualizer/');
        if (!isAllowedPath) {
            return <Navigate to="/installations/" replace />;
        }
    }

    if (loadSession) {
        if (isLoadingSession || !hasResolvedSession) {
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
