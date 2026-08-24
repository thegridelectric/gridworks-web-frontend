import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';

export type AlertRow = {
    time_sent: number;
    alert_alias: string;
    site_alias: string;
    message: string;
    state: string;
};

function parseUnixSeconds(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return null;
}

function normalizeAlertRow(raw: unknown, index: number): AlertRow | null {
    const logPrefix = `[alerts-debug] row ${index}`;

    if (typeof raw !== 'object' || raw === null) {
        console.log(logPrefix, 'dropped: not an object', raw);
        return null;
    }

    const row = raw as Record<string, unknown>;
    const nested =
        typeof row.alert === 'object' && row.alert !== null
            ? (row.alert as Record<string, unknown>)
            : null;

    const timeSentRaw =
        nested?.time_sent ?? row.time_sent ?? nested?.time_received ?? row.time_received;
    const timeSent = parseUnixSeconds(timeSentRaw);
    if (timeSent === null) {
        console.log(logPrefix, 'dropped: invalid time_sent/time_received', {
            raw,
            timeSentRaw,
            topLevelKeys: Object.keys(row),
            nestedKeys: nested ? Object.keys(nested) : null,
        });
        return null;
    }

    const siteAlias = String(nested?.site_alias ?? row.site_alias ?? '').trim();
    const alertAlias = String(nested?.alert_alias ?? row.alert_alias ?? '').trim();
    const message = String(nested?.message ?? row.message ?? '');
    const state = String(row.state ?? '');

    if (!siteAlias || !alertAlias) {
        console.log(logPrefix, 'dropped: missing site_alias or alert_alias', {
            raw,
            siteAlias,
            alertAlias,
        });
        return null;
    }

    const normalized = {
        time_sent: timeSent,
        site_alias: siteAlias,
        alert_alias: alertAlias,
        message,
        state,
    };
    console.log(logPrefix, 'accepted', normalized);
    return normalized;
}

/**
 * Fetches the alert history for a time window.
 *
 * Calls the web-backend with the user's session token; the backend proxies to
 * alert-manager's GET /alerts-history (so the alert-manager secret never reaches
 * the browser). start/end are unix seconds, inclusive.
 */
export async function fetchAlertsHistory(params: {
    token: string;
    startSeconds: number;
    endSeconds: number;
}): Promise<AlertRow[]> {
    const base = getVisualizerApiBaseUrl();
    const url = `${base}/alerts-history?start=${params.startSeconds}&end=${params.endSeconds}`;
    console.log('[alerts-debug] fetchAlertsHistory request', {
        url,
        startSeconds: params.startSeconds,
        endSeconds: params.endSeconds,
        startIso: new Date(params.startSeconds * 1000).toISOString(),
        endIso: new Date(params.endSeconds * 1000).toISOString(),
    });

    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${params.token}`,
        },
    });

    console.log('[alerts-debug] fetchAlertsHistory response', {
        status: res.status,
        ok: res.ok,
    });

    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error(`Alerts request failed (${res.status})`);
    }

    const raw = (await res.json()) as unknown;
    console.log('[alerts-debug] fetchAlertsHistory raw JSON', raw);

    if (!Array.isArray(raw)) {
        console.log('[alerts-debug] fetchAlertsHistory invalid payload type', typeof raw);
        throw new Error('Alerts response was not an array');
    }

    console.log('[alerts-debug] fetchAlertsHistory raw array length', raw.length);

    const normalized = raw.flatMap((item, index) => {
        const row = normalizeAlertRow(item, index);
        return row ? [row] : [];
    });

    console.log('[alerts-debug] fetchAlertsHistory normalized', {
        acceptedCount: normalized.length,
        droppedCount: raw.length - normalized.length,
        rows: normalized,
    });

    return normalized;
}
