import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import './VisualizerPage.css';
import SingleInstallationPicker from "../_shared/SingleInstallationPicker";
import SessionContext, { canViewDataFromDate } from "../_util/SessionContext";
import {
    formatDate,
    formatTime,
    getDefaultDate,
    NEW_YORK_TIME_ZONE,
    wallDateTimeToUtc,
} from "../_util/newYorkTime";
import { getIsDarkMode } from "../_util/theme";
import { useRouteInfo } from "../_util/useRouteInfo";
import GridWorksApi from '../_util/GridWorksApi';
import type { SyncedReadingsBundle } from "../sema";
import { VisualizerOptionsPanel } from "./VisualizerControls";
import { CLIENT_ONLY_VISUALIZER_CHANNEL_IDS } from "./visualizerChannels";
import { useVisualizerControls } from "./useVisualizerControls";
import { useVisualizerAutoRefresh } from "./useVisualizerAutoRefresh";
import { PLOT_CONFIGS } from "./plot-configs";
import VisualizerPlot from "./VisualizerPlot";
import FloPlot, { type FloPlotData } from "./FloPlot";
import {
    emptyFloHorizonBarSelections,
    FloHorizonBars,
    floHorizonSelectedPositions,
    formatFloPenForcedHoursList,
    type FloHorizonBarSelections,
} from "./FloHorizonBars";
import { floHighElecPriceStepMask } from "./floElecPriceHighlight";
import {
    floHorizonStepCount,
    floSummaryXAxisMetricsEqual,
    type FloSummaryXAxisMetrics,
} from "./floPlotXAxisMetrics";
import FloBidPlot, { type FloBidPlotData } from "./FloBidPlot";
import { FloPenaltyTuning } from "./FloPenaltyTuning";
import {
    floPenaltyTuningDraft,
    floPenaltyTuningFromDraft,
    type FloPenaltyTuningDraft,
    type FloPenaltyTuningValues,
} from "./floPenaltyTuningValues";
import type { VisualizerParams } from "./VisualizerParams";

interface FloDownload {
    summary: FloPlotData;
    bid: FloBidPlotData;
    tuning: FloPenaltyTuningValues;
}

export default function VisualizerPage() {

    const [startDateTime, setStartDateTime] = useState(getDefaultDate(true));
    const [endDateTime, setEndDateTime] = useState(getDefaultDate(false));
    const [plottedParams, setPlottedParams] = useState<VisualizerParams | null>(null)
    const [readingsBundleData, setReadingsBundleData] = useState<SyncedReadingsBundle | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFloLoading, setIsFloLoading] = useState(false);
    const [floHourShift, setFloHourShift] = useState<-1 | 1 | null>(null);
    const [floPlot, setFloPlot] = useState<FloDownload | null>(null);
    const [floPlotEndDateTime, setFloPlotEndDateTime] = useState<Date | null>(null);
    const [isFloRerunning, setIsFloRerunning] = useState(false);
    const [floNotice, setFloNotice] = useState<string | null>(null);
    const [floPrefetchHours, setFloPrefetchHours] = useState('24');
    const [isFloPrefetching, setIsFloPrefetching] = useState(false);
    const [plotError, setPlotError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isFloPenMode, setIsFloPenMode] = useState(false);
    const [floHorizonBarSelections, setFloHorizonBarSelections] = useState<FloHorizonBarSelections>({
        top: [],
        bottom: [],
    });
    const [floTuningDraft, setFloTuningDraft] = useState<FloPenaltyTuningDraft>({});
    const [floPenRerunSummary, setFloPenRerunSummary] = useState<{
        forcedOn: number[];
        forcedOff: number[];
    } | null>(null);
    const [floSummaryXAxisMetrics, setFloSummaryXAxisMetrics] = useState<FloSummaryXAxisMetrics | null>(null);
    const onFloSummaryXAxisMetrics = useCallback((next: FloSummaryXAxisMetrics | null) => {
        setFloSummaryXAxisMetrics((prev) => (floSummaryXAxisMetricsEqual(prev, next) ? prev : next));
    }, []);
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
    const startDateInputRef = useRef<HTMLInputElement>(null);
    const startTimeInputRef = useRef<HTMLInputElement>(null);
    const endDateInputRef = useRef<HTMLInputElement>(null);
    const endTimeInputRef = useRef<HTMLInputElement>(null);

    function writeDateWindowToInputs(start: Date, end: Date) {
        if (startDateInputRef.current) {
            startDateInputRef.current.value = formatDate(start);
        }
        if (startTimeInputRef.current) {
            startTimeInputRef.current.value = formatTime(start);
        }
        if (endDateInputRef.current) {
            endDateInputRef.current.value = formatDate(end);
        }
        if (endTimeInputRef.current) {
            endTimeInputRef.current.value = formatTime(end);
        }
    }

    function setDateWindow(start: Date, end: Date) {
        setStartDateTime(start);
        setEndDateTime(end);
        writeDateWindowToInputs(start, end);
    }

    function setEndDateWindow(end: Date) {
        setEndDateTime(end);
        if (endDateInputRef.current) {
            endDateInputRef.current.value = formatDate(end);
        }
        if (endTimeInputRef.current) {
            endTimeInputRef.current.value = formatTime(end);
        }
    }

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
        try {
            const apiResult = await GridWorksApi.get<SyncedReadingsBundle>(
                `/api/v2/installations/${installationGNode}/synced.readings.bundle`,
                {
                    params: {
                        start: startDate.toISO(),
                        end: endDate.toISO(),
                        channels: selectedChannels.join(','),
                        time_step: Math.ceil(endDate.diff(startDate).as('seconds') / 1000),
                    }
                }
            );
            setPlottedParams({
                startDate: startDate,
                endDate: endDate,
                installationGNode
            })
            setReadingsBundleData(apiResult.data);
            setFloPlot(null);
            setFloNotice(null);
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
        setDateWindow(start, end);
        await runPlotQuery(start, end);
    }

    function onClearClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();
        setReadingsBundleData(null);
        setFloPlot(null);
        setFloNotice(null);
        setPlotError(null);
        resetControls();
        setDateWindow(getDefaultDate(true), getDefaultDate(false));
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

    function shiftEndWall(endDt: Date, hours: number): Date {
        const ny = wallDateTimeToUtc(endDt).plus({ hours }).setZone(NEW_YORK_TIME_ZONE);
        return new Date(ny.year, ny.month - 1, ny.day, ny.hour, ny.minute, 0, 0);
    }

    async function runFloQuery(endDt: Date, hourShift: -1 | 1 | null = null) {
        setPlotError(null);

        if (!installationGNode) {
            setPlotError('Select an installation first.');
            return;
        }

        const endDate = wallDateTimeToUtc(endDt);
        if (!canViewDataFromDate(session, [installationGNode], endDate)) {
            window.alert('Access restricted: the end date must be more than 10 days in the past. Please choose an earlier end date and try again.');
            return;
        }

        setEndDateWindow(endDt);
        setFloHourShift(hourShift);
        setIsFloLoading(true);
        try {
            const response = await GridWorksApi.get<FloDownload>(
                `/api/v2/installations/${installationGNode}/flo.download`,
                {
                    timeout: 150000, // the solver is allowed 2.5 minutes
                    params: {
                        time: endDate.toISO(),
                    }
                }
            );
            setReadingsBundleData(null);
            setPlottedParams(null);
            setFloNotice(null);
            setFloPlot(response.data);
            setFloPlotEndDateTime(endDt);
            setFloHorizonBarSelections(emptyFloHorizonBarSelections(floHorizonStepCount(response.data.summary)));
            setFloTuningDraft(floPenaltyTuningDraft(response.data.tuning ?? {}));
            setFloPenRerunSummary(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message === 'No FLO was run in this hour') {
                setReadingsBundleData(null);
                setPlottedParams(null);
                setFloPlot(null);
                setFloNotice(message);
            } else {
                setPlotError(message);
            }
        } finally {
            setIsFloLoading(false);
            setFloHourShift(null);
        }
    }

    async function onFloClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();
        await runFloQuery(endDateTime);
    }

    function onFloHourShift(hours: number) {
        if (isLoading || isFloLoading || isFloPrefetching) {
            return;
        }
        setIsFloPenMode(false);
        void runFloQuery(shiftEndWall(endDateTime, hours), hours < 0 ? -1 : 1);
    }

    async function onFloPrefetchClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();
        if (isLoading || isFloLoading || isFloPrefetching) {
            return;
        }

        if (!installationGNode) {
            setPlotError('Select an installation first.');
            return;
        }

        const hours = Math.min(48, Math.max(1, parseInt(floPrefetchHours, 10) || 1));
        setFloPrefetchHours(String(hours));

        const endDate = wallDateTimeToUtc(endDateTime);
        if (!canViewDataFromDate(session, [installationGNode], endDate)) {
            window.alert('Access restricted: the end date must be more than 10 days in the past. Please choose an earlier end date and try again.');
            return;
        }

        setPlotError(null);
        setIsFloPrefetching(true);
        try {
            await GridWorksApi.post<{ ready: number }>(
                `/api/v2/installations/${installationGNode}/flo.prefetch`,
                null,
                {
                    timeout: hours * 150_000 + 60_000,
                    params: {
                        time: endDate.toISO(),
                        hours,
                    },
                },
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setPlotError(message);
        } finally {
            setIsFloPrefetching(false);
        }
    }

    const floHighElecPriceSteps = useMemo(() => {
        if (!floPlot) {
            return [];
        }
        const summary = floPlot.summary;
        return floHighElecPriceStepMask(
            summary.power.time,
            summary.power.priceUsdMwh,
            floHorizonStepCount(summary),
        );
    }, [floPlot]);

    async function onFloPenRerunClick() {
        if (isLoading || isFloLoading || isFloPrefetching || !installationGNode || !floPlot || !floPlotEndDateTime) {
            return;
        }
        const tuning = floPenaltyTuningFromDraft(floTuningDraft);
        if (!tuning) {
            return;
        }
        const forcedOn = floHorizonSelectedPositions(floHorizonBarSelections.top);
        const forcedOff = floHorizonSelectedPositions(floHorizonBarSelections.bottom);
        setPlotError(null);
        setIsFloLoading(true);
        setIsFloRerunning(true);
        try {
            const response = await GridWorksApi.post<FloDownload>(
                `/api/v2/installations/${installationGNode}/flo.rerun`,
                {
                    time: wallDateTimeToUtc(floPlotEndDateTime).toISO(),
                    // The API takes 0-based horizon steps; the bars use 1-based hours.
                    hp_forced_on_steps: forcedOn.map((hour) => hour - 1),
                    hp_forced_off_steps: forcedOff.map((hour) => hour - 1),
                    tuning,
                },
                {
                    timeout: 150000, // the solver is allowed 2.5 minutes
                }
            );
            setFloPlot(response.data);
            setFloPenRerunSummary(forcedOn.length > 0 || forcedOff.length > 0 ? { forcedOn, forcedOff } : null);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setPlotError(message);
        } finally {
            setIsFloLoading(false);
            setIsFloRerunning(false);
        }
    }

    const floHourButtonsVisible = floPlot !== null || floNotice !== null;

    useEffect(() => {
        if (!floHourButtonsVisible) {
            return;
        }

        function isTypingTarget(target: EventTarget | null): boolean {
            if (!(target instanceof HTMLElement)) {
                return false;
            }
            const tag = target.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
                return true;
            }
            return target.isContentEditable;
        }

        function onKeyDown(event: KeyboardEvent) {
            if (isLoading || isFloLoading || isFloPrefetching || isTypingTarget(event.target)) {
                return;
            }
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                onFloHourShift(-1);
            } else if (event.key === "ArrowRight") {
                event.preventDefault();
                onFloHourShift(1);
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [floHourButtonsVisible, isLoading, isFloLoading, isFloPrefetching, endDateTime]);

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
        setEndDateTime: setEndDateWindow,
        onTick: (end) => {
            void runPlotQuery(startDateTime, end);
        },
    });

    useEffect(() => {
        setReadingsBundleData(null);
        setFloPlot(null);
        setFloNotice(null);
        setPlotError(null);
        setFloSummaryXAxisMetrics(null);
    }, [installationGNode]);

    useEffect(() => {
        // FloPlot only publishes metrics that changed, so keep them while a plot is replaced.
        if (!floPlot) {
            setFloSummaryXAxisMetrics(null);
        }
    }, [floPlot]);

    useEffect(() => {
        if (!isFloPenMode) {
            setFloSummaryXAxisMetrics(null);
        }
    }, [isFloPenMode]);

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
                                    ref={startDateInputRef}
                                    type="date"
                                    className="form-control text-light"
                                    defaultValue={formatDate(startDateTime)}
                                    onChange={onStartDateChange}
                                />
                            </td>
                            <td>
                                <input
                                    ref={startTimeInputRef}
                                    type="time"
                                    className="form-control text-light"
                                    defaultValue={formatTime(startDateTime)}
                                    onChange={onStartTimeChange}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>End</td>
                            <td>
                                <input
                                    ref={endDateInputRef}
                                    type="date"
                                    className="form-control text-light"
                                    defaultValue={formatDate(endDateTime)}
                                    onChange={onEndDateChange}
                                />
                            </td>
                            <td>
                                <input
                                    ref={endTimeInputRef}
                                    type="time"
                                    className="form-control text-light"
                                    defaultValue={formatTime(endDateTime)}
                                    onChange={onEndTimeChange}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>

                <fieldset className="d-flex gap-2 align-items-center" disabled={isLoading || isFloLoading || isFloPrefetching} style={{ opacity: (isLoading || isFloLoading || isFloPrefetching) ? 0.5 : 1 }}>
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

            {(floPlot || floNotice) &&
                <div className="plot-container border-top">
                    <div className="d-flex flex-column align-items-center gap-2 pt-3">
                        <div className="d-flex justify-content-center align-items-center gap-2">
                        <button
                            className={`btn btn-sm btn-outline-secondary flo-hour-btn${floHourShift === -1 ? ' is-loading' : ''}`}
                            type="button"
                            aria-label="One hour earlier"
                            aria-busy={floHourShift === -1}
                            disabled={isLoading || isFloLoading || isFloPrefetching}
                            onClick={() => onFloHourShift(-1)}
                        >
                            {floHourShift === -1
                                ? <div className="loader" aria-hidden />
                                : <i className="bi bi-chevron-left" aria-hidden />}
                        </button>
                        <button
                            className={`btn btn-sm btn-outline-secondary flo-hour-btn${floHourShift === 1 ? ' is-loading' : ''}`}
                            type="button"
                            aria-label="One hour later"
                            aria-busy={floHourShift === 1}
                            disabled={isLoading || isFloLoading || isFloPrefetching}
                            onClick={() => onFloHourShift(1)}
                        >
                            {floHourShift === 1
                                ? <div className="loader" aria-hidden />
                                : <i className="bi bi-chevron-right" aria-hidden />}
                        </button>
                        <button
                            className={`btn btn-sm btn-outline-secondary flo-hour-btn${isFloPenMode ? ' is-selected' : ''}`}
                            type="button"
                            aria-label="Edit"
                            aria-pressed={isFloPenMode}
                            disabled={isLoading || isFloLoading || isFloPrefetching}
                            onClick={() => setIsFloPenMode((on) => !on)}
                        >
                            <i className="bi bi-pencil" aria-hidden />
                        </button>
                        </div>
                        {isFloPenMode &&
                            <div className="flo-pen-controls">
                                <p className="flo-pen-instructions text-muted small mb-0">
                                    Re-run the same FLO but forcing the heat pump to be on or off in some of the
                                    hours. Select the hours to force on (off) in the top (bottom) bar below.
                                </p>
                                <FloHorizonBars
                                    metrics={floSummaryXAxisMetrics}
                                    highPriceSteps={floHighElecPriceSteps}
                                    isDarkMode={getIsDarkMode()}
                                    barSelectedSteps={floHorizonBarSelections}
                                    onBarSelectedStepsChange={setFloHorizonBarSelections}
                                />
                                <FloPenaltyTuning
                                    draft={floTuningDraft}
                                    onDraftChange={setFloTuningDraft}
                                    disabled={isLoading || isFloLoading || isFloPrefetching}
                                />
                                <button
                                    className={`btn btn-sm btn-outline-secondary flo-pen-rerun-btn${isFloRerunning ? ' is-loading' : ''}`}
                                    type="button"
                                    aria-busy={isFloRerunning}
                                    disabled={
                                        isLoading || isFloLoading || isFloPrefetching || !floPlot
                                        || floPenaltyTuningFromDraft(floTuningDraft) === null
                                    }
                                    onClick={() => void onFloPenRerunClick()}
                                >
                                    {isFloRerunning
                                        ? <div className="loader" aria-hidden />
                                        : 'Re-run'}
                                </button>
                                {floPenRerunSummary &&
                                    <div className="flo-pen-rerun-summary text-muted small">
                                        <p className="mb-0">
                                            Hours forced on:{" "}
                                            {formatFloPenForcedHoursList(floPenRerunSummary.forcedOn)}
                                        </p>
                                        <p className="mb-0">
                                            Hours forced off:{" "}
                                            {formatFloPenForcedHoursList(floPenRerunSummary.forcedOff)}
                                        </p>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                    {floNotice &&
                        <div className="alert alert-secondary mt-3 mb-0 mx-3" role="status">{floNotice}</div>
                    }
                    {floPlot &&
                        <div className="visualizer-server-plots-root">
                            <FloPlot
                                plot={floPlot.summary}
                                isDarkMode={getIsDarkMode()}
                                onXAxisMetrics={isFloPenMode ? onFloSummaryXAxisMetrics : undefined}
                            />
                            <FloBidPlot bid={floPlot.bid} isDarkMode={getIsDarkMode()} />
                        </div>
                    }
                    <div className="d-flex justify-content-center align-items-center gap-2 flo-prefetch-row pb-3">
                        <span className="text-muted small">Compute last</span>
                        <input
                            type="number"
                            className="form-control form-control-sm text-light flo-prefetch-hours"
                            min={1}
                            max={48}
                            value={floPrefetchHours}
                            disabled={isLoading || isFloLoading || isFloPrefetching}
                            aria-label="Hours of FLO plots to prefetch"
                            onChange={(evt) => setFloPrefetchHours(evt.currentTarget.value)}
                        />
                        <span className="text-muted small">hours</span>
                        <button
                            className={`btn btn-sm btn-outline-secondary${isFloPrefetching ? ' is-loading' : ''}`}
                            type="button"
                            aria-busy={isFloPrefetching}
                            disabled={isLoading || isFloLoading || isFloPrefetching}
                            onClick={onFloPrefetchClick}
                        >
                            {isFloPrefetching
                                ? <div className="loader" aria-hidden />
                                : 'OK'}
                        </button>
                    </div>
                </div>
            }

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
