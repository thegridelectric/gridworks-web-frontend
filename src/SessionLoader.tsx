// import { useEffect, useState } from "react";
// import { Navigate } from "react-router";
// import { Spinner } from "react-bootstrap";

// import GridworksApi from './GridWorksApi';
// import SessionContext, { type Session } from "./SessionContext";

// export default function SessionLoader({ children }: React.PropsWithChildren) {
//     const [isLoadingSession, setIsLoadingSession] = useState(true);
//     const [session, setSession] = useState<Session | null>(null);
//     useEffect(() => {
//         GridworksApi.get<Session>('/api/v2/session').then(
//             response => {
//                 setSession(response.data);
//             },
//             apiError => {
//                 console.log(apiError.message),
//                     setSession(null);
//             }
//         ).finally(() => {
//             setIsLoadingSession(false);
//         })
//     }, []);

//     if (isLoadingSession) {
//         return <Spinner animation="border" role="status" />;
//     }

//     if (!session) {
//         return <Navigate to="/login/" replace />;
//     }

//     return <SessionContext value={session}>
//         {children}
//     </SessionContext>

// }