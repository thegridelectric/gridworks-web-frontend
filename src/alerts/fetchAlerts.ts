import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';

export type AlertRow = {
    time_received: number;
    alert_alias: string;
    site_alias: string;
    message: string;
    state: string;
};

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

    return (await res.json()) as AlertRow[];
}
