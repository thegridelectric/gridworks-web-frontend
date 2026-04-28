import { DateTime } from 'luxon';

import {
    isAdminUser,
    isViewerDateRestrictionForInstallationAlias,
    isViewerUser,
} from '../auth/auth';

export const NEW_YORK_TIME_ZONE = 'America/New_York';

function normalizeAliasList(aliases?: string | string[]): string[] {
    if (aliases === undefined || aliases === null) {
        return [];
    }
    const arr = Array.isArray(aliases) ? aliases : [aliases];
    return arr.map((s) => s.trim().toLowerCase()).filter((a) => a.length > 0);
}

function shouldEnforceViewerLookback(installationAliases?: string | string[]): boolean {
    if (isAdminUser()) {
        return false;
    }
    const list = normalizeAliasList(installationAliases);
    if (list.length === 0) {
        return isViewerUser();
    }
    return list.some((alias) => isViewerDateRestrictionForInstallationAlias(alias));
}

/** When `installationAliases` is set, 10-day lookback applies if any alias is viewer-scoped. */
export function isEndDateOldEnough(
    endUnixMs: number,
    lookbackDays: number,
    installationAliases?: string | string[],
): boolean {
    if (!shouldEnforceViewerLookback(installationAliases)) {
        return true;
    }
    const cutoff = DateTime.now()
        .setZone(NEW_YORK_TIME_ZONE)
        .minus({ days: lookbackDays })
        .toUTC()
        .toMillis();
    return endUnixMs <= cutoff;
}

export function isEndDateOldEnoughUtc(
    endDate: DateTime,
    lookbackDays: number,
    installationAliases?: string | string[],
): boolean {
    if (!shouldEnforceViewerLookback(installationAliases)) {
        return true;
    }
    const cutoff = DateTime.now()
        .setZone(NEW_YORK_TIME_ZONE)
        .minus({ days: lookbackDays })
        .toUTC()
    return endDate <= cutoff;
}

export function wallDateTimeToUtc(date: Date): DateTime {
    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return DateTime.fromFormat(`${ymd} ${hm}`, 'yyyy-MM-dd HH:mm', { zone: NEW_YORK_TIME_ZONE })
        .toUTC();
}

export function wallDateTimeToUtcMs(date: Date): number {
    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return DateTime.fromFormat(`${ymd} ${hm}`, 'yyyy-MM-dd HH:mm', { zone: NEW_YORK_TIME_ZONE })
        .toUTC()
        .toMillis();
}

export function getNowInNewYork(): Date {
    return new Date(new Date().toLocaleString('en-US', { timeZone: NEW_YORK_TIME_ZONE }));
}

export function getDefaultDate(start: boolean): Date {
    const nyDate = getNowInNewYork();
    if (start) {
        nyDate.setDate(nyDate.getDate() - 1);
        nyDate.setHours(20, 0, 0, 0);
    } else {
        nyDate.setMinutes(nyDate.getMinutes() + 1);
    }
    return nyDate;
}

export function formatDate(dt: Date) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function formatTime(dt: Date) {
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}
