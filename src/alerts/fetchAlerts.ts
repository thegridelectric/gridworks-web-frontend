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

function normalizeAlertRow(raw: unknown): AlertRow | null {
    if (typeof raw !== 'object' || raw === null) {
        return null;
    }

    const row = raw as Record<string, unknown>;
    const nested =
        typeof row.alert === 'object' && row.alert !== null
            ? (row.alert as Record<string, unknown>)
            : null;

    const timeSent = parseUnixSeconds(
        nested?.time_sent ?? row.time_sent ?? nested?.time_received ?? row.time_received,
    );
    if (timeSent === null) {
        return null;
    }

    const siteAlias = String(nested?.site_alias ?? row.site_alias ?? '').trim();
    const alertAlias = String(nested?.alert_alias ?? row.alert_alias ?? '').trim();
    const message = String(nested?.message ?? row.message ?? '');
    const state = String(row.state ?? '');

    if (!siteAlias || !alertAlias) {
        return null;
    }

    return {
        time_sent: timeSent,
        site_alias: siteAlias,
        alert_alias: alertAlias,
        message,
        state,
    };
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
    const res = await fetch(url, {
        headers: {
            Authorization: `Bearer ${params.token}`,
        },
    });

    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error(`Alerts request failed (${res.status})`);
    }

    const raw = (await res.json()) as unknown;
    if (!Array.isArray(raw)) {
        throw new Error('Alerts response was not an array');
    }

    return raw.flatMap((item) => {
        const row = normalizeAlertRow(item);
        return row ? [row] : [];
    });
}
