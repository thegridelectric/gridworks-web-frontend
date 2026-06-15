import { useEffect, useMemo, useState } from 'react';

import { hasRealTimeAccessForInstallationAlias } from '../auth/auth';
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

export function useHouseRealtimeData(houseAliases: string[]): Record<string, HouseRealtimeData> {
    const [dataByAlias, setDataByAlias] = useState<Record<string, HouseRealtimeData>>({});

    const subscribedAliases = useMemo(() => {
        const unique = new Set<string>();
        for (const alias of houseAliases) {
            const trimmed = alias.trim();
            if (!trimmed || !hasRealTimeAccessForInstallationAlias(trimmed)) {
                continue;
            }
            unique.add(trimmed);
        }
        return [...unique].sort();
    }, [houseAliases]);

    const subscriptionKey = subscribedAliases.join('\0');

    useEffect(() => {
        if (subscribedAliases.length === 0) {
            setDataByAlias({});
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
    }, [subscriptionKey]);

    return dataByAlias;
}
