import { useContext, useEffect, useRef, useState } from "react";
import './VisualizerPage.css';
import SingleInstallationPicker from "../_shared/SingleInstallationPicker";
import SessionContext, { canViewDataFromDate } from "../_util/SessionContext";
import {
    formatDate,
    formatTime,
    getDefaultDate,
    wallDateTimeToUtc,
} from "../_util/newYorkTime";
import { getIsDarkMode } from "../_util/theme";
import { useRouteInfo } from "../_util/useRouteInfo";
import GridWorksApi from '../_util/GridWorksApi';
import type { ReadingsBundleApiResponse } from "../sema";
import { VisualizerOptionsPanel } from "./VisualizerControls";
import { CLIENT_ONLY_VISUALIZER_CHANNEL_IDS } from "./visualizerChannels";
import { useVisualizerControls } from "./useVisualizerControls";
import { useVisualizerAutoRefresh } from "./useVisualizerAutoRefresh";
import { PLOT_CONFIGS } from "./plot-configs";
import VisualizerPlot from "./VisualizerPlot";
import type { VisualizerParams } from "./VisualizerParams";

export default function VisualizerPage() {

    const [startDateTime, setStartDateTime] = useState(getDefaultDate(true));
    const [endDateTime, setEndDateTime] = useState(getDefaultDate(false));
    const [plottedParams, setPlottedParams] = useState<VisualizerParams | null>(null)
    const [readingsBundleData, setReadingsBundleData] = useState<ReadingsBundleApiResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFloLoading, setIsFloLoading] = useState(false);
    const [plotError, setPlotError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const {
        channels,
        isShowingOptions,
        setIsShowingOptions,
        showPoints,
        setShowPoints,
        setIncludesChannel,
        resetControls,
    } = useVisualizerControls();

    const { installationGNode, pathRoot } = useRouteInfo();
    const session = useContext(SessionContext);
    if (!session) {
        return null;
    }

    const plotSelectedChannels = [...channels].sort().concat(showPoints ? ['show-points'] : []);

    const visualizerCardRef = useRef<HTMLDivElement>(null);

    async function runPlotQuery(startDt: Date, endDt: Date) {
        setPlotError(null);

        if (!installationGNode) {
            setPlotError('Select an installation first.');
            return;
        }

        const startDate = wallDateTimeToUtc(startDt);
        const endDate = wallDateTimeToUtc(endDt);

        if (startDate == null || endDate == null) {
            return;
        }

        if (!canViewDataFromDate(session, [installationGNode], endDate)) {
            window.alert('Access restricted: the end date must be more than 10 days in the past. Please choose an earlier end date and try again.');
            return;
        }

        const selectedChannels = [...channels]
            .sort()
            .filter((id) => !CLIENT_ONLY_VISUALIZER_CHANNEL_IDS.has(id));
        if (showPoints) {
            selectedChannels.push('show-points');
        }

        setIsLoading(true);
        setPlotError(null);
        setReadingsBundleData(null);
        try {
            const apiResult = await GridWorksApi.get<ReadingsBundleApiResponse>(
                `/api/v2/installations/${installationGNode}/synced.readings.bundle`,
                {
                    params: {
                        start: startDate.toISO(),
                        end: endDate.toISO(),
                        channels: selectedChannels.join(','),
                        time_step: 60,
                    }
                }
            );
            setPlottedParams({
                startDate: startDate,
                endDate: endDate,
                installationGNode
            })
            setReadingsBundleData(apiResult.data);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setPlotError(message);
        } finally {
            setIsLoading(false);
        }
    }

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
        setReadingsBundleData(null);
        setPlotError(null);
        resetControls();
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

        if (!installationGNode) {
            setPlotError('Select an installation first.');
            return;
        }

        const endDate = wallDateTimeToUtc(endDateTime);
        if (!canViewDataFromDate(session, [installationGNode], endDate)) {
            window.alert('Access restricted: the end date must be more than 10 days in the past. Please choose an earlier end date and try again.');
            return;
        }

        setIsFloLoading(true);
        try {
            await GridWorksApi.get(
                `/api/v2/installations/${installationGNode}/flo.download`,
                {
                    timeout: 60000, // FLO can take quite a while to process
                    responseType: 'blob',
                    params: {
                        time: endDate.toISO(),
                    }
                }
            );
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

    useVisualizerAutoRefresh({
        autoRefresh,
        isBusy: isLoading || isFloLoading,
        pathRoot,
        setDateWindow: (start, end) => {
            setStartDateTime(start);
            setEndDateTime(end);
        },
        onTick: (start, end) => {
            void runPlotQuery(start, end);
        },
    });

    useEffect(() => {
        setReadingsBundleData(null);
        setPlotError(null);
    }, [installationGNode]);

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
                <div className="mb-4">
                    <label className="form-label">Selected House</label>
                    <div className="selected-house-picker">
                        <SingleInstallationPicker />
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

            <VisualizerOptionsPanel
                isShowingOptions={isShowingOptions}
                showPoints={showPoints}
                setShowPoints={setShowPoints}
                channels={channels}
                setIncludesChannel={setIncludesChannel}
            />

            {readingsBundleData && plottedParams &&
                <div className="plot-container border-top">
                    <div className="visualizer-server-plots-root">

                        {PLOT_CONFIGS.map((c, i) => (
                            <VisualizerPlot key={i} 
                                plotConfig={c} 
                                installationGNode={plottedParams.installationGNode}
                                startDate={plottedParams.startDate}
                                endDate={plottedParams.endDate}
                                selectedChannels={plotSelectedChannels} 
                                readingsBundleData={readingsBundleData} 
                                isDarkMode={getIsDarkMode()} 
                                showPoints={showPoints} />
                        ))}
                    </div>
                </div>
            }

        </div>
    );
}
