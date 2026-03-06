import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { Spinner } from "react-bootstrap";

import GridworksApi from './GridWorksApi';
import SessionContext, { type Session } from "./SessionContext";



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
        if (loadSession) {
            GridworksApi.get<Session>('/api/v2/session').then(
                response => {
                    setSession(response.data);
                },
                apiError => {
                    console.log(apiError.message),
                        setSession(null);
                }
            ).finally(() => {
                setIsLoadingSession(false);
            })
        }
    }, [loadSession]);

    if (loadSession) {

        if (isLoadingSession) {
            return <Spinner animation="border" role="status" />
        }

        if (!session) {
            return <Navigate to="/login/" replace />;
        }
    }


    return <div className="container-fluid">
        <SessionContext value={loadSession ? session: null}>
            {children}
        </SessionContext>
    </div>

}