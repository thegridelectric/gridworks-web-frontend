import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import { RefreshCw } from 'feather-icons-react';

import { getRequiredAuthToken } from '../auth/auth';
import SessionContext from '../_util/SessionContext';
import { useHouseTableSelection } from '../_util/useHouseTableSelection';
import { NEW_YORK_TIME_ZONE } from '../_util/newYorkTime';
import { fetchAlertsHistory, type AlertRow } from './fetchAlerts';

import './AlertsPage.css';
import type { InstallationSummary } from '../sema';

const LOOKBACK_DAYS = 10;
const EMPTY_INSTALLATIONS: InstallationSummary[] = [];

function selectedAliasList(
    selectedIds: ReadonlySet<string>,
    installations: InstallationSummary[],
): string[] {
    if (selectedIds.size === 0) {
        return [];
    }
    const aliases: string[] = [];
    for (const inst of installations) {
        if (!selectedIds.has(String(inst.GNodeAlias))) {
            continue;
        }
        const a = (inst.GNodeAlias || inst.DisplayName || '').trim();
        if (a) {
            aliases.push(a);
        }
    }
    return aliases;
}

const STATE_BADGE_CLASS: Record<string, string> = {
    processed: 'badge bg-secondary',
    sent: 'badge bg-warning text-dark',
    notified: 'badge bg-warning text-dark',
    acknowledged: 'badge bg-success',
    muted: 'badge bg-success',
};

function formatTimestamp(seconds: number): string {
    const unixSeconds = Number(seconds);
    if (!Number.isFinite(unixSeconds)) {
        return '—';
    }
    return DateTime.fromSeconds(unixSeconds, { zone: NEW_YORK_TIME_ZONE }).toFormat(
        'yyyy-LL-dd HH:mm:ss',
    );
}

export default function AlertsPage() {
    const token = getRequiredAuthToken();
    const session = useContext(SessionContext);
    const { selectedInstallationIds } = useHouseTableSelection();
    const installations = session?.installations ?? EMPTY_INSTALLATIONS;
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
            console.log('[alerts-debug] AlertsPage loadAlerts received', {
                count: data.length,
                rows: data,
            });
            setAlerts(data);
        } catch (err) {
            console.error('[alerts-debug] AlertsPage loadAlerts failed', err);
            setError(err instanceof Error ? err.message : 'Failed to load alerts.');
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    // Load once when the page opens. Refreshing afterwards is manual.
    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    const selectedAliases = useMemo(
        () => selectedAliasList(selectedInstallationIds, installations),
        [selectedInstallationIds, installations],
    );

    const selectedHouseDisplay = selectedAliases.join(', ');

    // Newest first, filtered to the selected houses (all houses when none selected).
    const rows = useMemo(() => {
        if (!alerts) {
            return [];
        }
        const sorted = [...alerts].sort((a, b) => b.time_sent - a.time_sent);
        if (selectedAliases.length === 0) {
            console.log('[alerts-debug] AlertsPage table rows (no house filter)', {
                apiCount: alerts.length,
                displayedCount: sorted.length,
                siteAliasesInApi: [...new Set(alerts.map((a) => a.site_alias))],
            });
            return sorted;
        }
        const allowed = new Set(selectedAliases);
        const filtered = sorted.filter((r) => allowed.has(r.site_alias));
        const excluded = sorted.filter((r) => !allowed.has(r.site_alias));
        console.log('[alerts-debug] AlertsPage table rows (house filter active)', {
            selectedAliases,
            apiCount: alerts.length,
            displayedCount: filtered.length,
            excludedCount: excluded.length,
            siteAliasesInApi: [...new Set(alerts.map((a) => a.site_alias))],
            excludedRows: excluded,
            displayedRows: filtered,
        });
        return filtered;
    }, [alerts, selectedAliases]);

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
                <div className="mb-4">
                    <label className="form-label alerts-selected-house-label" htmlFor="alerts-selected-house">
                        Selected House(s)
                    </label>
                    <input
                        id="alerts-selected-house"
                        type="text"
                        className="form-control text-light border-secondary"
                        readOnly
                        placeholder="All houses in the table"
                        value={selectedHouseDisplay}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    />
                </div>

                {error && (
                    <div className="alert alert-danger mb-0" role="alert">
                        {error}
                    </div>
                )}

                {!error && !isLoading && rows.length === 0 && (
                    <div className="text-muted">No alerts in the last {LOOKBACK_DAYS} days for the selected houses.</div>
                )}

                {rows.length > 0 && (
                    <div id="alerts-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Time sent</th>
                                    <th>Site</th>
                                    <th>Alert</th>
                                    <th>Message</th>
                                    <th>State</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={`${r.time_sent}-${r.site_alias}-${r.alert_alias}-${i}`}>
                                        <td>{formatTimestamp(r.time_sent)}</td>
                                        <td>{r.site_alias}</td>
                                        <td>{r.alert_alias}</td>
                                        <td>{r.message}</td>
                                        <td>
                                            <span
                                                className={`${STATE_BADGE_CLASS[r.state] ?? 'badge bg-secondary'} text-capitalize`}
                                            >
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
