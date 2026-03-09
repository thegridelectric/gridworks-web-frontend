import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { Spinner } from "react-bootstrap";

import GridworksApi from './_util/GridWorksApi';
import SessionContext, { type Session } from "./_util/SessionContext";
import HeaderLayout from "./_layout/HeaderLayout";



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