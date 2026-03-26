import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { DateTime } from 'luxon';
import { useLocation } from 'react-router';
import JSZip from 'jszip';

import SessionContext, {
    installationForRouteId,
    type BasicInstallationInfo,
} from './_util/SessionContext';
import { parsePathname } from './_util/urlUtility';
import { downloadElectricityUseCsv } from './visualizer/fetchElectricityUseCsv';
import { fetchElectricityUse } from './visualizer/fetchElectricityUse';
import { requestVisualizerCsv } from './visualizer/fetchVisualizerCsv';
import { getVisualizerAuthToken } from './visualizer/visualizerAuth';
import { getDarkModeForVisualizer } from './visualizer/visualizerDarkMode';
import VisualizerSignInForm from './visualizer/VisualizerSignInForm';

import './visualizer/VisualizerPage.css';
import './DataExportPage.css';

const LABEL_MUTED: CSSProperties = {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
};

const CHANNEL_SECTIONS: { title: string; items: { id: string; label: string }[] }[] = [
    {
        title: 'Heat pump',
        items: [
            { id: 'hp-lwt', label: 'Leaving water temperature' },
            { id: 'hp-ewt', label: 'Entering water temperature' },
            { id: 'hp-odu-pwr', label: 'Outdoor unit power' },
            { id: 'hp-idu-pwr', label: 'Indoor unit power' },
            { id: 'primary-flow', label: 'Primary pump flow rate' },
            { id: 'primary-pump-pwr', label: 'Primary pump power' },
            { id: 'primary-010v', label: 'Primary pump 0-10V' },
        ],
    },
    {
        title: 'Distribution',
        items: [
            { id: 'dist-swt', label: 'Source water temperature' },
            { id: 'dist-rwt', label: 'Return water temperature' },
            { id: 'dist-flow', label: 'Distribution pump flow rate' },
            { id: 'dist-pump-pwr', label: 'Distribution pump power' },
            { id: 'dist-010v', label: 'Distribution pump 0-10V' },
        ],
    },
    {
        title: 'Zones',
        items: [
            { id: 'zone-heat-calls', label: 'Heat calls' },
            { id: 'white-wires', label: 'White wire power' },
        ],
    },
    {
        title: 'Buffer',
        items: [
            { id: 'buffer-depths', label: 'Buffer depths' },
            { id: 'buffer-hot-pipe', label: 'Buffer hot pipe' },
            { id: 'buffer-cold-pipe', label: 'Buffer cold pipe' },
        ],
    },
    {
        title: 'Storage',
        items: [
            { id: 'storage-depths', label: 'Storage depths' },
            { id: 'store-hot-pipe', label: 'Storage hot pipe' },
            { id: 'store-cold-pipe', label: 'Storage cold pipe' },
            { id: 'store-flow', label: 'Storage pump flow rate' },
            { id: 'store-pump-pwr', label: 'Storage pump power' },
            { id: 'storage-010v', label: 'Storage pump 0-10V' },
        ],
    },
    {
        title: 'Other',
        items: [
            { id: 'oil-boiler-pwr', label: 'Oil boiler power' },
            { id: 'oat', label: 'Outside air temperature' },
            { id: 'relays', label: 'Relays' },
            { id: 'all-data', label: 'All other channels' },
        ],
    },
];

const ALL_CHANNEL_IDS = new Set(
    CHANNEL_SECTIONS.flatMap((s) => s.items.map((i) => i.id)),
);

function isEndDateOldEnough(endUnixMs: number, lookbackDays: number): boolean {
    const username = localStorage.getItem('username') || '';
    if (username.trim().toLowerCase() === 'admin') {
        return true;
    }
    const cutoff = DateTime.now()
        .setZone('America/New_York')
        .minus({ days: lookbackDays })
        .toUTC()
        .toMillis();
    return endUnixMs <= cutoff;
}

function getDefaultDate(start: boolean) {
    const nyDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    if (start) {
        nyDate.setDate(nyDate.getDate() - 1);
        nyDate.setHours(20, 0, 0, 0);
    } else {
        nyDate.setMinutes(nyDate.getMinutes() + 1);
    }
    return nyDate;
}

function formatDate(dt: Date) {
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function formatTime(dt: Date) {
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

function wallDateTimeToUtcMs(date: Date): number {
    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return DateTime.fromFormat(`${ymd} ${hm}`, 'yyyy-MM-dd HH:mm', {
        zone: 'America/New_York',
    })
        .toUTC()
        .toMillis();
}

function triggerBlobDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function shortAliasesForElectricity(
    currentInstallationId: string | undefined,
    installation: BasicInstallationInfo | undefined,
    installations: BasicInstallationInfo[],
): string[] {
    if (currentInstallationId && installation) {
        const a = (installation.houseAlias || installation.displayName || '').trim();
        return a ? [a] : [];
    }
    const out: string[] = [];
    for (const inst of installations) {
        const a = (inst.houseAlias || inst.displayName || '').trim();
        if (a) {
            out.push(a);
        }
    }
    return out;
}

export default function DataExportPage() {
    const session = useContext(SessionContext);
    const location = useLocation();
    const { currentInstallationId } = parsePathname(location.pathname);
    const installation = installationForRouteId(session?.installations, currentInstallationId);

    const [, setAuthTick] = useState(0);
    const token = getVisualizerAuthToken();

    const channelCardRef = useRef<HTMLDivElement>(null);
    const hourlyCardRef = useRef<HTMLDivElement>(null);
    const hourlyPlotHostRef = useRef<HTMLDivElement>(null);
    const hourlyPlotBlobUrlsRef = useRef<string[]>([]);

    const houseAliasForCsv = (installation?.houseAlias?.trim() || installation?.id || '').trim();
    const channelSelectedHouseDisplay = useMemo(() => {
        if (!installation) {
            return '';
        }
        return (installation.houseAlias || installation.displayName || '').trim();
    }, [installation]);

    const installations = session?.installations ?? [];
    const hourlyAliases = useMemo(
        () => shortAliasesForElectricity(currentInstallationId, installation, installations),
        [currentInstallationId, installation, installations],
    );
    const hourlySelectedHouseDisplay =
        currentInstallationId && installation
            ? (installation.houseAlias || installation.displayName || '').trim() ||
              'Selected house'
            : 'Aggregate of all houses in the table';

    const [channelStart, setChannelStart] = useState(() => getDefaultDate(true));
    const [channelEnd, setChannelEnd] = useState(() => getDefaultDate(false));
    const [hourlyStart, setHourlyStart] = useState(() => getDefaultDate(true));
    const [hourlyEnd, setHourlyEnd] = useState(() => getDefaultDate(false));
    const [timestep, setTimestep] = useState('1');
    const [channelIds, setChannelIds] = useState<Set<string>>(() => new Set(ALL_CHANNEL_IDS));
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [channelBusy, setChannelBusy] = useState(false);
    const [hourlyCsvBusy, setHourlyCsvBusy] = useState(false);
    const [hourlyPlotBusy, setHourlyPlotBusy] = useState(false);
    const [hourlyPlotVisible, setHourlyPlotVisible] = useState(false);
    const [channelFullscreen, setChannelFullscreen] = useState(false);
    const [hourlyFullscreen, setHourlyFullscreen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hourlyActionsBusy = hourlyCsvBusy || hourlyPlotBusy;

    useEffect(() => {
        return () => {
            for (const u of hourlyPlotBlobUrlsRef.current) {
                URL.revokeObjectURL(u);
            }
            hourlyPlotBlobUrlsRef.current = [];
        };
    }, []);

    function revokeHourlyPlotBlobUrls() {
        for (const u of hourlyPlotBlobUrlsRef.current) {
            URL.revokeObjectURL(u);
        }
        hourlyPlotBlobUrlsRef.current = [];
    }

    function clearHourlyPlots() {
        revokeHourlyPlotBlobUrls();
        const host = hourlyPlotHostRef.current;
        if (host) {
            host.innerHTML = '';
        }
        setHourlyPlotVisible(false);
    }

    function toggleChannelFullscreen() {
        setChannelFullscreen((was) => {
            const next = !was;
            if (was && !next) {
                queueMicrotask(() =>
                    channelCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }),
                );
            }
            return next;
        });
    }

    function toggleHourlyFullscreen() {
        setHourlyFullscreen((was) => {
            const next = !was;
            if (was && !next) {
                queueMicrotask(() =>
                    hourlyCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }),
                );
            }
            return next;
        });
    }

    function setNowEnd(setter: (d: Date) => void) {
        const nyDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
        nyDate.setMinutes(nyDate.getMinutes() + 1);
        setter(nyDate);
    }

    function toggleChannel(id: string) {
        setChannelIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function selectAllChannels() {
        setChannelIds(new Set(ALL_CHANNEL_IDS));
    }

    function unselectAllChannels() {
        setChannelIds(new Set());
    }

    async function onChannelCsv() {
        setError(null);
        if (!token) {
            setError('Sign in to the visualizer API first.');
            return;
        }
        if (!houseAliasForCsv) {
            setError('Select a house in the table (row + URL) for channel CSV export.');
            return;
        }
        const selected = [...channelIds];
        if (selected.length === 0) {
            setError('Select at least one channel.');
            return;
        }
        const startMs = wallDateTimeToUtcMs(channelStart);
        const endMs = wallDateTimeToUtcMs(channelEnd);
        if (!isEndDateOldEnough(endMs, 10)) {
            setError('End time must be at least 10 days in the past (unless you are admin).');
            return;
        }

        setChannelBusy(true);
        try {
            let confirmWithUser = false;
            for (;;) {
                const result = await requestVisualizerCsv({
                    token,
                    houseAlias: houseAliasForCsv,
                    startMs,
                    endMs,
                    selectedChannels: selected,
                    timestep: timestep.trim() || '1',
                    confirmWithUser,
                });
                if (result.type === 'file') {
                    triggerBlobDownload(result.blob, result.filename);
                    return;
                }
                if (result.type === 'confirm') {
                    if (window.confirm(result.message)) {
                        confirmWithUser = true;
                        continue;
                    }
                    return;
                }
                setError(result.message);
                return;
            }
        } finally {
            setChannelBusy(false);
        }
    }

    async function onHourlyCsv() {
        setError(null);
        if (!token) {
            setError('Sign in to the visualizer API first.');
            return;
        }
        if (hourlyAliases.length === 0) {
            setError('No house aliases available for hourly export.');
            return;
        }
        const startMs = wallDateTimeToUtcMs(hourlyStart);
        const endMs = wallDateTimeToUtcMs(hourlyEnd);
        if (!isEndDateOldEnough(endMs, 10)) {
            setError('End time must be at least 10 days in the past (unless you are admin).');
            return;
        }

        setHourlyCsvBusy(true);
        try {
            const { blob, filename } = await downloadElectricityUseCsv({
                token,
                selectedShortAliases: hourlyAliases,
                startMs,
                endMs,
            });
            triggerBlobDownload(blob, filename);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Hourly CSV download failed.');
        } finally {
            setHourlyCsvBusy(false);
        }
    }

    async function onHourlyPlot() {
        setError(null);
        if (!token) {
            setError('Sign in to the visualizer API first.');
            return;
        }
        if (hourlyAliases.length === 0) {
            setError('No house aliases available for hourly plot.');
            return;
        }
        const startMs = wallDateTimeToUtcMs(hourlyStart);
        const endMs = wallDateTimeToUtcMs(hourlyEnd);
        if (!isEndDateOldEnough(endMs, 10)) {
            setError('End time must be at least 10 days in the past (unless you are admin).');
            return;
        }

        setHourlyPlotBusy(true);
        try {
            revokeHourlyPlotBlobUrls();
            const host = hourlyPlotHostRef.current;
            if (host) {
                host.innerHTML = '';
            }

            const result = await fetchElectricityUse({
                token,
                selectedShortAliases: hourlyAliases,
                startMs,
                endMs,
                darkmode: getDarkModeForVisualizer(),
            });

            if (result.kind === 'json_error') {
                if (result.message) {
                    window.alert(result.message);
                }
                setHourlyPlotVisible(true);
                const mount = hourlyPlotHostRef.current;
                if (mount) {
                    const el = document.createElement('div');
                    el.style.cssText =
                        'color: var(--text-muted); text-align: center; padding: 2rem; font-size: 0.875rem;';
                    el.textContent =
                        'Could not find data for the selected house(s) during this period.';
                    mount.appendChild(el);
                }
                return;
            }

            const zip = await JSZip.loadAsync(result.blob);
            setHourlyPlotVisible(true);
            const plotHost = hourlyPlotHostRef.current;
            if (!plotHost) {
                return;
            }

            plotHost.innerHTML = '';

            let hasPlots = false;
            const narrow = typeof window !== 'undefined' && window.innerWidth < 650;

            for (const filename of Object.keys(zip.files)) {
                if (!filename.endsWith('.html') || zip.files[filename].dir) {
                    continue;
                }
                const text = await zip.files[filename].async('text');
                hasPlots = true;
                const htmlBlob = new Blob([text], { type: 'text/html' });
                const htmlUrl = URL.createObjectURL(htmlBlob);
                hourlyPlotBlobUrlsRef.current.push(htmlUrl);

                const iframe = document.createElement('iframe');
                iframe.src = htmlUrl;
                iframe.style.width = narrow ? '100%' : '97.5%';
                iframe.style.height = '375px';
                iframe.style.maxWidth = '1500px';
                iframe.style.border = 'none';
                plotHost.appendChild(iframe);
            }

            if (!hasPlots) {
                const d = document.createElement('div');
                d.style.cssText =
                    'color: var(--danger-color); text-align: center; padding: 2rem; font-size: 0.875rem;';
                d.textContent = 'Could not find data for this house and time frame';
                plotHost.appendChild(d);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Hourly plot failed.');
            revokeHourlyPlotBlobUrls();
            const h = hourlyPlotHostRef.current;
            if (h) {
                h.innerHTML = '';
            }
            setHourlyPlotVisible(false);
        } finally {
            setHourlyPlotBusy(false);
        }
    }

    return (
        <div className="data-export-page">
            {!token && (
                <div className="card visualizer-card mb-4">
                    <div className="p-4">
                        <VisualizerSignInForm onSuccess={() => setAuthTick((t) => t + 1)} />
                    </div>
                </div>
            )}

            {error && (
                <div className="alert alert-danger mb-3" role="alert">
                    {error}
                </div>
            )}

            {/* 1. Channel data — backoffice data-download card */}
            <div
                ref={channelCardRef}
                className={`card visualizer-card mb-4${channelFullscreen ? ' fullscreen' : ''}`}
            >
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Download channel data</h5>
                    <div className="status-badges">
                        <div
                            className="loader"
                            style={{ display: channelBusy ? 'inline-block' : 'none' }}
                            aria-hidden={!channelBusy}
                        />
                        <button
                            type="button"
                            className="fullscreen-btn"
                            aria-label={channelFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            onClick={toggleChannelFullscreen}
                        >
                            <i
                                className={`bi ${channelFullscreen ? 'bi-arrows-angle-contract' : 'bi-arrows-fullscreen'}`}
                                aria-hidden
                            />
                        </button>
                    </div>
                </div>
                <div className="p-4">
                    <div className="mb-4">
                        <label className="form-label" style={LABEL_MUTED} htmlFor="data-export-channel-house">
                            Selected House
                        </label>
                        <input
                            id="data-export-channel-house"
                            type="text"
                            className="form-control text-light border-secondary data-export-selected-house"
                            readOnly
                            placeholder="Select a house in the table"
                            value={channelSelectedHouseDisplay}
                        />
                    </div>

                    <table className="table table-borderless mb-4 data-query-form">
                        <tbody>
                            <tr>
                                <td>Start</td>
                                <td>
                                    <input
                                        type="date"
                                        className="form-control text-light"
                                        value={formatDate(channelStart)}
                                        disabled={channelBusy}
                                        onChange={(ev) => {
                                            const d = new Date(channelStart);
                                            const [y, m, day] = ev.target.value.split('-').map(Number);
                                            d.setFullYear(y, m - 1, day);
                                            setChannelStart(d);
                                        }}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        className="form-control text-light"
                                        value={formatTime(channelStart)}
                                        disabled={channelBusy}
                                        onChange={(ev) => {
                                            const d = new Date(channelStart);
                                            const [hh, mm] = ev.target.value.split(':').map(Number);
                                            d.setHours(hh, mm, 0, 0);
                                            setChannelStart(d);
                                        }}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>End</td>
                                <td>
                                    <input
                                        type="date"
                                        className="form-control text-light"
                                        value={formatDate(channelEnd)}
                                        disabled={channelBusy}
                                        onChange={(ev) => {
                                            const d = new Date(channelEnd);
                                            const [y, m, day] = ev.target.value.split('-').map(Number);
                                            d.setFullYear(y, m - 1, day);
                                            setChannelEnd(d);
                                        }}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        className="form-control text-light"
                                        value={formatTime(channelEnd)}
                                        disabled={channelBusy}
                                        onChange={(ev) => {
                                            const d = new Date(channelEnd);
                                            const [hh, mm] = ev.target.value.split(':').map(Number);
                                            d.setHours(hh, mm, 0, 0);
                                            setChannelEnd(d);
                                        }}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="d-flex gap-2 align-items-center mb-3">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={channelBusy || !token || !houseAliasForCsv}
                            style={{ opacity: channelBusy ? 0.5 : 1 }}
                            onClick={onChannelCsv}
                        >
                            CSV
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setNowEnd(setChannelEnd)}
                            disabled={channelBusy}
                            style={{ opacity: channelBusy ? 0.5 : 1 }}
                        >
                            Now
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setOptionsOpen((o) => !o)}
                            disabled={channelBusy}
                            style={{ opacity: channelBusy ? 0.5 : 1 }}
                        >
                            Options
                        </button>
                    </div>

                    {optionsOpen && (
                        <div
                            className="options-container mb-0"
                            style={{ borderTop: '1px solid var(--border-color)' }}
                        >
                            <div className="options-content">
                                <div className="options-section mt-3">
                                    <h6>Time step (seconds)</h6>
                                    <input
                                        type="number"
                                        className="form-control border-secondary"
                                        style={{ marginLeft: 10, marginBottom: '2rem', maxWidth: 100 }}
                                        min={1}
                                        value={timestep}
                                        disabled={channelBusy}
                                        onChange={(e) => setTimestep(e.target.value)}
                                    />
                                </div>
                                <div className="options-section">
                                    <h6>Channel selection</h6>
                                    <div className="d-flex gap-2 mb-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={selectAllChannels}
                                            disabled={channelBusy}
                                        >
                                            Select all
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline-secondary"
                                            onClick={unselectAllChannels}
                                            disabled={channelBusy}
                                        >
                                            Unselect all
                                        </button>
                                    </div>
                                </div>
                                <div className="data-export-channel-options">
                                    {CHANNEL_SECTIONS.map((section) => (
                                        <div key={section.title} className="options-section">
                                            <h6>{section.title}</h6>
                                            {section.items.map((item) => (
                                                <label key={item.id}>
                                                    <input
                                                        type="checkbox"
                                                        checked={channelIds.has(item.id)}
                                                        disabled={channelBusy}
                                                        onChange={() => toggleChannel(item.id)}
                                                    />
                                                    {item.label}
                                                </label>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Hourly data — backoffice electricity card */}
            <div
                ref={hourlyCardRef}
                className={`card visualizer-card mb-4${hourlyFullscreen ? ' fullscreen' : ''}`}
            >
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Download hourly data</h5>
                    <div className="status-badges">
                        <div
                            className="loader"
                            style={{ display: hourlyActionsBusy ? 'inline-block' : 'none' }}
                            aria-hidden={!hourlyActionsBusy}
                        />
                        <button
                            type="button"
                            className="fullscreen-btn"
                            aria-label={hourlyFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                            onClick={toggleHourlyFullscreen}
                        >
                            <i
                                className={`bi ${hourlyFullscreen ? 'bi-arrows-angle-contract' : 'bi-arrows-fullscreen'}`}
                                aria-hidden
                            />
                        </button>
                        <button type="button" className="filter-toggle" onClick={clearHourlyPlots}>
                            <span>Clear</span>
                        </button>
                    </div>
                </div>
                <div
                    className="p-4"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                    <div className="mb-4">
                        <label className="form-label" style={LABEL_MUTED} htmlFor="data-export-hourly-house">
                            Selected House(s)
                        </label>
                        <input
                            id="data-export-hourly-house"
                            type="text"
                            className="form-control text-light border-secondary data-export-hourly-house-input"
                            readOnly
                            placeholder="Aggregate of all houses in the table"
                            value={hourlySelectedHouseDisplay}
                        />
                    </div>

                    <table className="table table-borderless mb-4 data-query-form">
                        <tbody>
                            <tr>
                                <td>Start</td>
                                <td>
                                    <input
                                        type="date"
                                        className="form-control text-light"
                                        value={formatDate(hourlyStart)}
                                        disabled={hourlyActionsBusy}
                                        onChange={(ev) => {
                                            const d = new Date(hourlyStart);
                                            const [y, m, day] = ev.target.value.split('-').map(Number);
                                            d.setFullYear(y, m - 1, day);
                                            setHourlyStart(d);
                                        }}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        className="form-control text-light"
                                        value={formatTime(hourlyStart)}
                                        disabled={hourlyActionsBusy}
                                        onChange={(ev) => {
                                            const d = new Date(hourlyStart);
                                            const [hh, mm] = ev.target.value.split(':').map(Number);
                                            d.setHours(hh, mm, 0, 0);
                                            setHourlyStart(d);
                                        }}
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td>End</td>
                                <td>
                                    <input
                                        type="date"
                                        className="form-control text-light"
                                        value={formatDate(hourlyEnd)}
                                        disabled={hourlyActionsBusy}
                                        onChange={(ev) => {
                                            const d = new Date(hourlyEnd);
                                            const [y, m, day] = ev.target.value.split('-').map(Number);
                                            d.setFullYear(y, m - 1, day);
                                            setHourlyEnd(d);
                                        }}
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        className="form-control text-light"
                                        value={formatTime(hourlyEnd)}
                                        disabled={hourlyActionsBusy}
                                        onChange={(ev) => {
                                            const d = new Date(hourlyEnd);
                                            const [hh, mm] = ev.target.value.split(':').map(Number);
                                            d.setHours(hh, mm, 0, 0);
                                            setHourlyEnd(d);
                                        }}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="d-flex gap-2 align-items-center">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={hourlyActionsBusy || !token || hourlyAliases.length === 0}
                            style={{ opacity: hourlyActionsBusy ? 0.5 : 1 }}
                            onClick={onHourlyPlot}
                        >
                            Plot
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={hourlyActionsBusy || !token || hourlyAliases.length === 0}
                            style={{ opacity: hourlyActionsBusy ? 0.5 : 1 }}
                            onClick={onHourlyCsv}
                        >
                            CSV
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setNowEnd(setHourlyEnd)}
                            disabled={hourlyActionsBusy}
                            style={{ opacity: hourlyActionsBusy ? 0.5 : 1 }}
                        >
                            Now
                        </button>
                    </div>
                </div>

                <div
                    id="data-export-electricity-plot-container"
                    className="plot-container"
                    style={{ display: hourlyPlotVisible ? 'flex' : 'none' }}
                >
                    <div ref={hourlyPlotHostRef} className="plot-div visualizer-server-plots-root" />
                </div>
            </div>
        </div>
    );
}
