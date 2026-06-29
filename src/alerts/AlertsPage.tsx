import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { RefreshCw } from 'feather-icons-react';

import { getRequiredAuthToken } from '../auth/auth';
import { NEW_YORK_TIME_ZONE } from '../_util/newYorkTime';
import { fetchAlertsHistory, type AlertRow } from './fetchAlerts';

import './AlertsPage.css';

const LOOKBACK_DAYS = 10;

const STATE_BADGE_CLASS: Record<string, string> = {
    notified: 'badge bg-secondary',
    acknowledged: 'badge bg-success',
    muted: 'badge bg-warning text-dark',
};

function formatTimestamp(seconds: number): string {
    return DateTime.fromSeconds(seconds, { zone: NEW_YORK_TIME_ZONE }).toFormat(
        'yyyy-LL-dd HH:mm:ss',
    );
}

export default function AlertsPage() {
    const token = getRequiredAuthToken();
    const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadAlerts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const end = Math.floor(Date.now() / 1000);
            const start = end - LOOKBACK_DAYS * 24 * 60 * 60;
            const data = await fetchAlertsHistory({
                token,
                startSeconds: start,
                endSeconds: end,
            });
            setAlerts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load alerts.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Load once when the page opens. Refreshing afterwards is manual.
    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    // Newest first.
    const rows = useMemo(() => {
        if (!alerts) {
            return [];
        }
        return [...alerts].sort((a, b) => b.time_received - a.time_received);
    }, [alerts]);

    return (
        <div className="card visualizer-card" id="alerts-card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Alerts</h5>
                <div className="status-badges">
                    <div
                        className="loader"
                        style={{ display: isLoading ? 'inline-block' : 'none' }}
                        aria-hidden={!isLoading}
                    />
                    <button
                        type="button"
                        className="filter-toggle"
                        onClick={loadAlerts}
                        disabled={isLoading}
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>
            <div className="p-4">
                <p className="alerts-subtitle">Alerts from the last {LOOKBACK_DAYS} days.</p>

                {error && (
                    <div className="alert alert-danger mb-0" role="alert">
                        {error}
                    </div>
                )}

                {!error && !isLoading && rows.length === 0 && (
                    <div className="text-muted">No alerts in the last {LOOKBACK_DAYS} days.</div>
                )}

                {rows.length > 0 && (
                    <div id="alerts-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Time received</th>
                                    <th>Site</th>
                                    <th>Alert</th>
                                    <th>Message</th>
                                    <th>State</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={`${r.time_received}-${r.site_alias}-${r.alert_alias}-${i}`}>
                                        <td>{formatTimestamp(r.time_received)}</td>
                                        <td>{r.site_alias}</td>
                                        <td>{r.alert_alias}</td>
                                        <td>{r.message}</td>
                                        <td>
                                            <span className={STATE_BADGE_CLASS[r.state] ?? 'badge bg-secondary'}>
                                                {r.state}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
