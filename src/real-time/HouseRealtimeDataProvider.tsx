import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { hasRealTimeAccessForInstallationAlias } from '../auth/auth';
import SessionContext from '../_util/SessionContext';
import { getDashboardWebSocketUrl } from '../_util/visualizerApi';
import { controlFromSnapshot, type SnapshotPayload } from './snapshotState';

export interface HouseRealtimeData {
    control: string | null;
    mode: string | null;
    snapshotTimeUnixMs: number | null;
}

const EMPTY_REALTIME_DATA: HouseRealtimeData = {
    control: null,
    mode: null,
    snapshotTimeUnixMs: null,
};

const HouseRealtimeDataContext = createContext<Record<string, HouseRealtimeData> | null>(null);

function systemModeFromStatus(payload: unknown): string | null {
    if (payload === null || typeof payload !== 'object') {
        return null;
    }
    const systemMode = (payload as { system_mode?: unknown }).system_mode;
    if (typeof systemMode !== 'string' || !systemMode.trim()) {
        return null;
    }
    return systemMode;
}

function houseAliasesFromInstallations(
    installations: { houseAlias?: string; displayName: string }[],
): string[] {
    const unique = new Set<string>();
    for (const installation of installations) {
        const alias = (installation.houseAlias ?? installation.displayName ?? '').trim();
        if (!alias || !hasRealTimeAccessForInstallationAlias(alias)) {
            continue;
        }
        unique.add(alias);
    }
    return [...unique].sort();
}

export function HouseRealtimeDataProvider({ children }: { children: ReactNode }) {
    const session = useContext(SessionContext);
    const [dataByAlias, setDataByAlias] = useState<Record<string, HouseRealtimeData>>({});

    const subscribedAliases = useMemo(
        () => houseAliasesFromInstallations(session?.installations ?? []),
        [session?.installations],
    );

    const subscriptionKey = subscribedAliases.join('\0');

    useEffect(() => {
        if (subscribedAliases.length === 0) {
            return;
        }

        const sockets: WebSocket[] = [];

        const patchAlias = (alias: string, patch: Partial<HouseRealtimeData>) => {
            setDataByAlias((previous) => {
                const current = previous[alias] ?? EMPTY_REALTIME_DATA;
                const next = { ...current, ...patch };
                if (
                    current.control === next.control &&
                    current.mode === next.mode &&
                    current.snapshotTimeUnixMs === next.snapshotTimeUnixMs
                ) {
                    return previous;
                }
                return { ...previous, [alias]: next };
            });
        };

        for (const alias of subscribedAliases) {
            const ws = new WebSocket(getDashboardWebSocketUrl(alias));
            sockets.push(ws);

            ws.onmessage = (event) => {
                let parsed: { type?: string; message_type?: string; payload?: unknown };
                try {
                    parsed = JSON.parse(event.data) as typeof parsed;
                } catch {
                    return;
                }
                if (parsed.type === 'status') {
                    patchAlias(alias, { mode: systemModeFromStatus(parsed) });
                    return;
                }
                if (
                    parsed.type !== 'mqtt_message' ||
                    parsed.message_type !== 'snapshot.spaceheat' ||
                    !parsed.payload ||
                    typeof parsed.payload !== 'object'
                ) {
                    return;
                }
                const snapshot = parsed.payload as SnapshotPayload;
                patchAlias(alias, {
                    control: controlFromSnapshot(snapshot),
                    snapshotTimeUnixMs: snapshot.SnapshotTimeUnixMs ?? null,
                });
            };
        }

        return () => {
            for (const ws of sockets) {
                ws.close();
            }
        };
    }, [subscriptionKey, subscribedAliases]);

    return (
        <HouseRealtimeDataContext.Provider value={dataByAlias}>
            {children}
        </HouseRealtimeDataContext.Provider>
    );
}

export function useHouseRealtimeData(): Record<string, HouseRealtimeData> {
    const dataByAlias = useContext(HouseRealtimeDataContext);
    if (dataByAlias === null) {
        throw new Error('useHouseRealtimeData must be used within HouseRealtimeDataProvider');
    }
    return dataByAlias;
}
