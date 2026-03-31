import { useContext, useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import './VisualizerPage.css';
import InstallationPicker from "../_shared/InstallationPicker";
import { useLocation } from "react-router";
import { parsePathname } from "../_util/urlUtility";
import SessionContext, { installationForRouteId } from "../_util/SessionContext";
import { fetchVisualizerPlots } from "./fetchVisualizerPlots";
import { downloadVisualizerFlo } from "./fetchVisualizerFlo";
import { getDarkModeForVisualizer } from "./visualizerDarkMode";
import VisualizerServerPlots from "./VisualizerServerPlots";
import type { VisualizerPlotsApiResponse } from "./visualizerApiTypes";
import { getVisualizerAuthToken } from "./visualizerAuth";
import VisualizerSignInForm from "./VisualizerSignInForm";

const CHANNEL_OPTION_GROUPS = [
    {
        category: 'Heat pump',
        channels: [
            { id: 'hp-lwt', label: 'Leaving water temperature' },
            { id: 'hp-ewt', label: 'Entering water temperature' },
            { id: 'hp-odu-pwr', label: 'Outdoor unit power' },
            { id: 'hp-idu-pwr', label: 'Indoor unit power' },
            { id: 'primary-flow', label: 'Primary pump flow rate' },
            { id: 'primary-pump-pwr', label: 'Primary pump power' },
            { id: 'oil-boiler-pwr', label: 'Oil boiler power' },
        ]
    },
    {
        category: 'Distribution',
        channels: [
            { id: 'dist-swt', label: 'Source water temperature' },
            { id: 'dist-rwt', label: 'Return water temperature' },
            { id: 'dist-flow', label: 'Distribution pump flow rate' },
            { id: 'dist-pump-pwr', label: 'Distribution pump power' },
        ]
    },
    {
        category: 'Zones',
        channels: [
            { id: 'zone-heat-calls', label: 'Heat calls' },
            { id: 'oat', label: 'Outside air temperature' },
        ]
    },
    {
        category: 'Buffer',
        channels: [
            { id: 'buffer-depths', label: 'Buffer depths' },
            { id: 'buffer-hot-pipe', label: 'Hot pipe' },
            { id: 'buffer-cold-pipe', label: 'Cold pipe' },
        ]
    },
    {
        category: 'Storage',
        channels: [
            { id: 'storage-depths', label: 'Storage depths' },
            { id: 'store-hot-pipe', label: 'Hot pipe' },
            { id: 'store-cold-pipe', label: 'Cold pipe' },
            { id: 'store-flow', label: 'Storage pump flow rate' },
            { id: 'store-pump-pwr', label: 'Storage pump power' },
            { id: 'store-energy', label: 'Available and required energy' },
        ]
    },
]

const NON_DEFAULT_CHANNELS = new Set([
    'buffer-hot-pipe',
    'buffer-cold-pipe',
    'store-hot-pipe',
    'store-cold-pipe',
    'store-energy'
])
const DEFAULT_CHANNELS = new Set(CHANNEL_OPTION_GROUPS.flatMap(g => g.channels).map(c => c.id).filter(id => !NON_DEFAULT_CHANNELS.has(id)))

function isEndDateOldEnough(endUnixMs: number, lookbackDays: number): boolean {
    const username = localStorage.getItem('username') || '';
    if (username.trim().toLowerCase() === 'admin') {
        return true;
    }
    const cutoff = DateTime.now().setZone('America/New_York').minus({ days: lookbackDays }).toUTC().toMillis();
    return endUnixMs <= cutoff;
}

function wallDateTimeToUtcMs(date: Date): number {
    const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return DateTime.fromFormat(`${ymd} ${hm}`, 'yyyy-MM-dd HH:mm', { zone: 'America/New_York' }).toUTC().toMillis();
}

function getDefaultDate(start: boolean): Date {
    const nyDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
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

export default function VisualizerPage() {

    const [startDateTime, setStartDateTime] = useState(getDefaultDate(true));
    const [endDateTime, setEndDateTime] = useState(getDefaultDate(false));
    const [channels, setChannels] = useState(DEFAULT_CHANNELS);
    const [plotsPayload, setPlotsPayload] = useState<VisualizerPlotsApiResponse['plots'] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFloLoading, setIsFloLoading] = useState(false);
    const [isShowingOptions, setIsShowingOptions] = useState(false);
    const [showPoints, setShowPoints] = useState(false);
    const [plotError, setPlotError] = useState<string | null>(null);
    const [, setAuthTick] = useState(0);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const location = useLocation();
    const { currentInstallationId, pathRoot } = parsePathname(location.pathname);
    const session = useContext(SessionContext);

    const installation = installationForRouteId(session?.installations, currentInstallationId);
    const houseAlias = (installation?.houseAlias?.trim() || installation?.id || '').trim();
    const hasVisualizerToken = !!getVisualizerAuthToken();
    const plotSelectedChannels = [...channels].sort().concat(showPoints ? ['show-points'] : []);

    const isPageFocusedRef = useRef(true);
    const blockPlotRef = useRef(false);
    const runPlotQueryRef = useRef<(startDt: Date, endDt: Date) => Promise<void>>(async () => { });
    const autoRefreshRef = useRef(autoRefresh);
    const visualizerCardRef = useRef<HTMLDivElement>(null);
    autoRefreshRef.current = autoRefresh;
    blockPlotRef.current = isLoading || isFloLoading;

    function setIncludesChannel(id: string, isIncluded: boolean) {
        if (isIncluded && !channels.has(id)) {
            const newChannels = new Set(channels);
            newChannels.add(id);
            setChannels(newChannels)
        } else if (!isIncluded && channels.has(id)) {
            const newChannels = new Set(channels);
            newChannels.delete(id);
            setChannels(newChannels);
        }
    }

    async function runPlotQuery(startDt: Date, endDt: Date) {
        setPlotError(null);

        if (!currentInstallationId) {
            setPlotError('Select an installation first.');
            return;
        }
        if (!houseAlias) {
            setPlotError('Could not resolve a house alias for this installation.');
            return;
        }

        const token = getVisualizerAuthToken();
        if (!token) {
            setPlotError('Sign in to the visualizer API above (same credentials as the backoffice login page).');
            return;
        }

        const startMs = wallDateTimeToUtcMs(startDt);
        const endMs = wallDateTimeToUtcMs(endDt);

        if (!isEndDateOldEnough(endMs, 10)) {
            window.alert('Access restricted: the end date must be more than 10 days in the past. Please choose an earlier end date and try again.');
            return;
        }

        const selectedChannels = [...channels].sort();
        if (showPoints) {
            selectedChannels.push('show-points');
        }

        setIsLoading(true);
        setPlotsPayload(null);
        try {
            const data = await fetchVisualizerPlots({
                houseAlias,
                startMs,
                endMs,
                selectedChannels,
                darkmode: getDarkModeForVisualizer(),
                token,
            });

            if (!data.success) {
                throw new Error(data.message || 'Visualizer returned success: false');
            }
            if (!data.plots) {
                throw new Error('Visualizer returned no plots object.');
            }

            setPlotsPayload(data.plots);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setPlotError(message);
        } finally {
            setIsLoading(false);
        }
    }

    runPlotQueryRef.current = runPlotQuery;

    async function onNowClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();
        if (isLoading || isFloLoading) {
            return;
        }
        const start = getDefaultDate(true);
        const end = getDefaultDate(false);
        setStartDateTime(start);
        setEndDateTime(end);
        await runPlotQuery(start, end);
    }

    function onClearClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();
        setPlotsPayload(null);
        setPlotError(null);
        setIsShowingOptions(false);
        setShowPoints(false);
        setChannels(DEFAULT_CHANNELS);
        setStartDateTime(getDefaultDate(true));
        setEndDateTime(getDefaultDate(false));
    }

    function onStartDateChange(evt: React.ChangeEvent<HTMLInputElement>) {
        const [year, month, day] = evt.currentTarget.value.split('-');
        if (!year || !month || !day) return;
        const next = new Date(startDateTime);
        next.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
        setStartDateTime(next);
    }

    function onStartTimeChange(evt: React.ChangeEvent<HTMLInputElement>) {
        const [hours, minutes] = evt.currentTarget.value.split(':');
        if (!hours || !minutes) return;
        const next = new Date(startDateTime);
        next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setStartDateTime(next);
    }

    function onEndDateChange(evt: React.ChangeEvent<HTMLInputElement>) {
        const [year, month, day] = evt.currentTarget.value.split('-');
        if (!year || !month || !day) return;
        const next = new Date(endDateTime);
        next.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
        setEndDateTime(next);
    }

    function onEndTimeChange(evt: React.ChangeEvent<HTMLInputElement>) {
        const [hours, minutes] = evt.currentTarget.value.split(':');
        if (!hours || !minutes) return;
        const next = new Date(endDateTime);
        next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setEndDateTime(next);
    }

    async function onPlotClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();
        await runPlotQuery(startDateTime, endDateTime);
    }

    async function onFloClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();
        setPlotError(null);

        if (!currentInstallationId) {
            setPlotError('Select an installation first.');
            return;
        }
        if (!houseAlias) {
            setPlotError('Could not resolve a house alias for this installation.');
            return;
        }

        const token = getVisualizerAuthToken();
        if (!token) {
            setPlotError('Sign in to the visualizer API above (same credentials as the backoffice login page).');
            return;
        }

        const endMs = wallDateTimeToUtcMs(endDateTime);
        if (!isEndDateOldEnough(endMs, 10)) {
            window.alert('Access restricted: the end date must be more than 10 days in the past. Please choose an earlier end date and try again.');
            return;
        }

        setIsFloLoading(true);
        try {
            await downloadVisualizerFlo({ houseAlias, timeMs: endMs, token });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setPlotError(message);
        } finally {
            setIsFloLoading(false);
        }
    }

    function onFullscreenToggle() {
        setIsFullscreen((was) => {
            const next = !was;
            if (was && !next) {
                queueMicrotask(() =>
                    visualizerCardRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }),
                );
            }
            return next;
        });
    }

    useEffect(() => {
        if (!autoRefresh || pathRoot !== 'visualizer') {
            return;
        }

        let intervalId: ReturnType<typeof setInterval> | undefined;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const clearTimers = () => {
            if (intervalId !== undefined) {
                clearInterval(intervalId);
                intervalId = undefined;
            }
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
                timeoutId = undefined;
            }
        };

        const maybeAutoRefreshTick = () => {
            if (!autoRefreshRef.current || document.hidden || !isPageFocusedRef.current) {
                return;
            }
            if (parsePathname(location.pathname).pathRoot !== 'visualizer') {
                return;
            }
            if (blockPlotRef.current) {
                return;
            }
            const start = getDefaultDate(true);
            const end = getDefaultDate(false);
            setStartDateTime(start);
            setEndDateTime(end);
            void runPlotQueryRef.current(start, end);
        };

        const startAutoRefresh = () => {
            clearTimers();
            timeoutId = setTimeout(maybeAutoRefreshTick, 500);
            intervalId = setInterval(maybeAutoRefreshTick, 60000);
        };

        const checkPageFocus = () => {
            isPageFocusedRef.current = document.hasFocus();
            const onVisualizerRoute = parsePathname(location.pathname).pathRoot === 'visualizer';
            const allow =
                isPageFocusedRef.current &&
                !document.hidden &&
                autoRefreshRef.current &&
                onVisualizerRoute;
            if (allow) {
                startAutoRefresh();
            } else if (!isPageFocusedRef.current || document.hidden || !onVisualizerRoute) {
                clearTimers();
            }
        };

        isPageFocusedRef.current = document.hasFocus();
        if (isPageFocusedRef.current && !document.hidden) {
            startAutoRefresh();
        }

        window.addEventListener('focus', checkPageFocus);
        window.addEventListener('blur', checkPageFocus);
        const onVisibilityChange = () => {
            if (!document.hidden) {
                setTimeout(checkPageFocus, 100);
            } else {
                isPageFocusedRef.current = false;
                clearTimers();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.removeEventListener('focus', checkPageFocus);
            window.removeEventListener('blur', checkPageFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            clearTimers();
        };
    }, [autoRefresh, location.pathname, pathRoot]);

    return (
        <div ref={visualizerCardRef} className={`card visualizer-card${isFullscreen ? ' fullscreen' : ''}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title">Visualizer</h5>
                <div className="status-badges">
                    {(isLoading || isFloLoading) && <div className="loader" aria-label="Loading visualizer data" />}
                    <div className="form-check form-check-inline me-3 d-flex align-items-center">
                        <input
                            className="form-check-input auto-refresh-checkbox"
                            type="checkbox"
                            id="auto-refresh-checkbox"
                            checked={autoRefresh}
                            onChange={(evt) => setAutoRefresh(evt.currentTarget.checked)}
                        />
                        <label className="form-check-label auto-refresh-label" htmlFor="auto-refresh-checkbox">
                            Auto-refresh
                        </label>
                    </div>
                    <button
                        className="fullscreen-btn"
                        type="button"
                        aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                        onClick={onFullscreenToggle}
                    >
                        <i className={`bi ${isFullscreen ? 'bi-arrows-angle-contract' : 'bi-arrows-fullscreen'}`} aria-hidden />
                    </button>
                    <button className="filter-toggle" type="button" onClick={onClearClick}>
                        <span>Clear</span>
                    </button>
                </div>
            </div>
            <div className="p-4">
                {!hasVisualizerToken &&
                    <VisualizerSignInForm onSuccess={() => setAuthTick((t) => t + 1)} />
                }
                <div className="mb-4">
                    <label className="form-label">Selected House</label>
                    <div className="selected-house-picker">
                        <InstallationPicker />
                    </div>
                </div>

                <table className="table table-borderless mb-4 data-query-form">
                    <tbody>
                        <tr>
                            <td>Start</td>
                            <td>
                                <input
                                    type="date"
                                    className="form-control text-light"
                                    value={formatDate(startDateTime)}
                                    onChange={onStartDateChange}
                                />
                            </td>
                            <td>
                                <input
                                    type="time"
                                    className="form-control text-light"
                                    value={formatTime(startDateTime)}
                                    onChange={onStartTimeChange}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>End</td>
                            <td>
                                <input
                                    type="date"
                                    className="form-control text-light"
                                    value={formatDate(endDateTime)}
                                    onChange={onEndDateChange}
                                />
                            </td>
                            <td>
                                <input
                                    type="time"
                                    className="form-control text-light"
                                    value={formatTime(endDateTime)}
                                    onChange={onEndTimeChange}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <fieldset className="d-flex gap-2 align-items-center" disabled={isLoading || isFloLoading} style={{ opacity: (isLoading || isFloLoading) ? 0.5 : 1 }}>
                    <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onPlotClick}>Plot</button>
                    <button className="btn btn-sm btn-outline-secondary" type="button" onClick={onNowClick}>8pm-Now</button>
                    <button className="btn btn-sm btn-outline-secondary" type="button" id="flo-btn" onClick={onFloClick} aria-busy={isFloLoading}>FLO</button>
                    <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => setIsShowingOptions(!isShowingOptions)}>Options</button>
                </fieldset>
                {plotError &&
                    <div className="alert alert-danger mt-3 mb-0" role="alert">{plotError}</div>
                }
            </div>

            {isShowingOptions &&
                <div id="options-div" className="options-container border-top mb-0">
                    <div className="options-content">
                        <div className="options-section mt-3">
                            <h6>Plot settings</h6>
                            <label>
                                <input type="checkbox" checked={showPoints} onChange={evt => {
                                    setShowPoints(evt.currentTarget.checked);
                                }} />
                                Show points
                            </label>
                        </div>
                        {CHANNEL_OPTION_GROUPS.map(g => {
                            return <div key={g.category} className="options-section">
                                <h6>{g.category}</h6>
                                {g.channels.map(c => {
                                    return <label key={c.id}>
                                        <input type="checkbox" checked={channels.has(c.id)}
                                            onChange={evt => {
                                                setIncludesChannel(c.id, evt.currentTarget.checked)
                                            }} />
                                        {c.label}
                                    </label>;
                                })}
                            </div>
                        })}
                    </div>
                </div>
            }

            {plotsPayload &&
                <div className="plot-container border-top">
                    <VisualizerServerPlots
                        plots={plotsPayload}
                        selectedChannels={plotSelectedChannels}
                        darkmode={getDarkModeForVisualizer()}
                    />
                </div>
            }

        </div>
    );
}
