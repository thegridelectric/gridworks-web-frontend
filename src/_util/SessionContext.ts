import { createContext } from 'react';

export interface BasicInstallationInfo {
    id: string,
    displayName: string
}

export interface Session {
    userName: string,
    installations: BasicInstallationInfo[]
}

export default createContext<Session | null>(null);

// export interface SessionContext {
//     isLoading: boolean,
//     session: Session | null
// }

// export default createContext<SessionContext>({isLoading: true, session: null});
