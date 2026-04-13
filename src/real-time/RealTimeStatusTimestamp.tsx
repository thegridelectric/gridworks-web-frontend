import { useEffect, useState } from "react";
import { DateTime } from "luxon";

import { NEW_YORK_TIME_ZONE } from "../_util/newYorkTime";

interface RealTimeStatusTimestampProps {
    updateTime: Date;
    /** When false, loader uses two 30s halves per minute (:00 and :30 alignments). */
    autoSnapshotEnabled: boolean;
    /** Step in seconds (1–30); used when `autoSnapshotEnabled` is true. */
    snapshotStepSeconds: number;
}

function loaderProgressManualHalfMinute(currentTime: Date): number {
    const seconds = currentTime.getSeconds();
    const milliseconds = currentTime.getMilliseconds();
    if (seconds < 30) {
        return ((seconds + milliseconds / 1000) / 30) * 100;
    }
    return (((seconds - 30) + milliseconds / 1000) / 30) * 100;
}

/** Progress 0–100 between consecutive ticks at i·x seconds from minute start (i·x < 60) and the minute end. */
function loaderProgressAutoSnapshotGrid(currentTime: Date, xSeconds: number): number {
    const nowMs = currentTime.getTime();
    const periodMs = xSeconds * 1000;
    const d = new Date(nowMs);
    d.setMilliseconds(0);
    d.setSeconds(0);
    const baseMs = d.getTime();
    const ticks: number[] = [];
    for (let i = 0; i * xSeconds < 60; i++) {
        ticks.push(baseMs + i * periodMs);
    }
    const minuteEnd = baseMs + 60_000;
    if (ticks.length === 0 || ticks[ticks.length - 1] < minuteEnd) {
        ticks.push(minuteEnd);
    }
    for (let j = 0; j < ticks.length - 1; j++) {
        if (nowMs >= ticks[j] && nowMs < ticks[j + 1]) {
            const span = ticks[j + 1] - ticks[j];
            if (span <= 0) {
                return 0;
            }
            return ((nowMs - ticks[j]) / span) * 100;
        }
    }
    if (ticks.length > 0 && nowMs >= ticks[ticks.length - 1]) {
        return 0;
    }
    return 0;
}

export default function RealTimeStatusTimestamp({
    updateTime,
    autoSnapshotEnabled,
    snapshotStepSeconds,
}: RealTimeStatusTimestampProps) {

    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    useEffect(() => {
        let rafId = 0;
        const loop = () => {
            setCurrentTime(new Date());
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
        return () => {
            cancelAnimationFrame(rafId);
        };
    }, []);

    let formattedTime = 'Unknown';
    let isDataFresh = false;

    formattedTime = DateTime.fromJSDate(updateTime)
        .setZone(NEW_YORK_TIME_ZONE)
        .toFormat('yyyy-LL-dd HH:mm:ss');

    const twoMinutesAgo = new Date(currentTime.getTime() - 2 * 60 * 1000);
    isDataFresh = updateTime > twoMinutesAgo;
    const statusStyle = {
        color: isDataFresh ? 'var(--text-muted)' : 'red',
        fontWeight: isDataFresh ? '' : 'bold'
    };

    const step = Math.min(30, Math.max(1, Math.round(snapshotStepSeconds)));
    const progress = autoSnapshotEnabled
        ? loaderProgressAutoSnapshotGrid(currentTime, step)
        : loaderProgressManualHalfMinute(currentTime);

    const loaderProgressStyle = { width: Math.min(100, Math.max(0, progress)) + '%' };


    return <div id="dashboard-snapshot-timestamp" className="text-center text-muted mt-0" style={statusStyle}>
        Last snapshot: <span id="dashboard-snapshot-time" style={statusStyle}>{formattedTime}</span>

        {/* Loader */}
        <div id="dashboard-loader" className="mt-1">
            <span>Next snapshot:</span>
            <div id="loader-bar" style={{ 'display': isDataFresh ? 'flex' : 'none' }}>
                <div id="loader-progress" style={loaderProgressStyle}></div>
            </div>
        </div>

    </div>

}
