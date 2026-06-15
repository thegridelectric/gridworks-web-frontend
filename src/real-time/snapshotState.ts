export interface SnapshotState {
    StateEnum?: string;
    State?: string;
}

export interface SnapshotPayload {
    SnapshotTimeUnixMs: number;
    LatestReadingList?: { ChannelName: string; Value: number }[];
    LatestStateList?: SnapshotState[];
}

/** Minutes since snapshot time, matching the real-time dashboard's last-snapshot age. */
export function lastHeardLabel(snapshotTimeUnixMs: number | null, nowMs: number): string {
    if (snapshotTimeUnixMs == null) {
        return '—';
    }
    const ageMs = Math.max(0, nowMs - snapshotTimeUnixMs);
    if (ageMs < 60_000) {
        return '< 1 min';
    }
    const minutes = Math.floor(ageMs / 60_000);
    return `${minutes} min ago`;
}

/** Control from snapshot: gw1.main.auto.state when top.state is Auto, otherwise top.state. */
export function controlFromSnapshot(snapshot: SnapshotPayload): string | null {
    const states = snapshot.LatestStateList ?? [];
    let topState: string | undefined;
    let mainAutoState: string | undefined;
    for (const entry of states) {
        if (entry.StateEnum === undefined) {
            continue;
        }
        if (entry.StateEnum === 'top.state') {
            topState = entry.State;
        } else if (entry.StateEnum === 'gw1.main.auto.state') {
            mainAutoState = entry.State;
        }
    }
    if (topState === undefined) {
        return null;
    }
    if (topState === 'Auto') {
        return mainAutoState ?? null;
    }
    return topState;
}
