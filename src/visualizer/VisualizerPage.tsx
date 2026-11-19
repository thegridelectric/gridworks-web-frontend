import { useCallback, useContext, useEffect, useRef, useState } from "react";
import './VisualizerPage.css';
import SingleInstallationPicker from "../_shared/SingleInstallationPicker";
import SessionContext, { canViewDataFromDate, installationRoleForGNode } from "../_util/SessionContext";
import {
    NEW_YORK_TIME_ZONE,
    formatDate,
    formatTime,
    getDefaultDate,
    wallDateTimeToUtc,
} from "../_util/newYorkTime";
import { getIsDarkMode } from "../_util/theme";
import { useRouteInfo } from "../_util/useRouteInfo";
import GridWorksApi from '../_util/GridWorksApi';
import { SyncedReadingsBundle } from "../sema/types/SyncedReadingsBundle";
import type { AnyFloRecommendation } from "../sema/types/AnyFloRecommendation";
import type { AnyFloParams } from "../sema/types/AnyFloParams";
import { VisualizerOptionsPanel } from "./VisualizerControls";
import { CLIENT_ONLY_VISUALIZER_CHANNEL_IDS } from "./visualizerChannels";
import { useVisualizerControls } from "./useVisualizerControls";
import { useVisualizerAutoRefresh } from "./useVisualizerAutoRefresh";
import { PLOT_CONFIGS } from "./plot-configs";
import VisualizerPlot from "./VisualizerPlot";
import FloPlot, { floSummaryXAxisMetricsEqual, type FloSummaryXAxisMetrics } from "./FloPlot";
import { onPeakStepMask, tariffForHouse, type TouTariff } from "./tou-tariff";
import FloBidPlot from "./FloBidPlot";
import FloParamsForecastPlot from "./FloParamsForecastPlot";
import {
    FloHorizonBars,
    emptyFloHorizonBarSelections,
    floHorizonSelectedPositions,
    floHorizonSelectedSteps,
    formatFloPenForcedStepsList,
    type FloHorizonBarSelections,
} from "./FloHorizonBars";
import {
    FloPenaltyTuning,
    floPenaltyTuningDraft,
    floPenaltyTuningFromDraft,
    type FloPenaltyTuningDraft,
} from "./FloPenaltyTuning";
import { fetchParams, fetchRecommendation, probeRerun, rerun } from "./flo-api";
import { fetchActualLoadKw } from "./dist-load";
import { bidView, defaultPairIndex, paramsView } from "./flo-path-view";
import { floRerunRequest, penaltyTuning, type PenaltyTuning } from "./flo-rerun-tuning";
import { fetchSlotClearedPrice } from "./pricing-api";
import type { VisualizerParams } from "./VisualizerParams";

export default function VisualizerPage() {

    const [startDateTime, setStartDateTime] = useState(getDefaultDate(true));
    const [endDateTime, setEndDateTime] = useState(getDefaultDate(false));
    const [plottedParams, setPlottedParams] = useState<VisualizerParams | null>(null)
    const [readingsBundleData, setReadingsBundleData] = useState<SyncedReadingsBundle | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFloLoading, setIsFloLoading] = useState(false);
    const [floHourShift, setFloHourShift] = useState<-1 | 1 | null>(null);
    const [floRecommendation, setFloRecommendation] = useState<AnyFloRecommendation | null>(null);
    const [floParams, setFloParams] = useState<AnyFloParams | null>(null);
    const [floActualLoadKw, setFloActualLoadKw] = useState<(number | null)[] | null>(null);
    const [floRealPriceMwh, setFloRealPriceMwh] = useState<number | null>(null);
    const [floPairIndex, setFloPairIndex] = useState(0);
    const [floNotice, setFloNotice] = useState<string | null>(null);
    const [plotError, setPlotError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [tariff, setTariff] = useState<TouTariff | null>(null);
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
    const [rerunAvailable, setRerunAvailable] = useState(false);
    const [isRerunning, setIsRerunning] = useState(false);
    const [floRerunRecommendation, setFloRerunRecommendation] = useState<AnyFloRecommendation | null>(null);
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

    const visualizerCardRef = useRef<HTMLDivElement>(null);
    const startDateInputRef = useRef<HTMLInputElement>(null);
    const startTimeInputRef = useRef<HTMLInputElement>(null);
    const endDateInputRef = useRef<HTMLInputElement>(null);
    const endTimeInputRef = useRef<HTMLInputElement>(null);
    const floQueryGeneration = useRef(0);
    // A plot the viewer dragged into a zoom; a ref, so a drag renders nothing.
    const isZoomedRef = useRef(false);
    const { installationGNode, pathRoot } = useRouteInfo();
    const session = useContext(SessionContext);
    const summary = installationRoleForGNode(session?.installations, installationGNode);
    useVisualizerAutoRefresh({
        autoRefresh,
        isBusy: isLoading || isFloLoading,
        isZoomedRef,
        pathRoot,
        setEndDateTime: setEndDateWindow,
        onTick: (end) => {
            void runPlotQuery(startDateTime, end);
        },
    });

    useEffect(() => {
        setReadingsBundleData(null);
        setPlotError(null);
    }, [installationGNode]);

    // The house's tariff: its on-peak hours band the FLO plot and its
    // delivery premium comes off the FLO plot's price.
    useEffect(() => {
        let stale = false;
        setTariff(null);
        if (!installationGNode) {
            return;
        }
        tariffForHouse(summary)
            .then((t) => { if (!stale) setTariff(t); })
            .catch(() => { if (!stale) setTariff(null); });
        return () => { stale = true; };
    }, [installationGNode, summary]);

    // The pen is the re-run editor, and the route is mounted only when
    // BACKEND_FLO_RERUN=in-process. The probe is a GET of that POST-only
    // path, so the pencil stays hidden wherever the route is absent.
    useEffect(() => {
        setRerunAvailable(false);
        setFloRerunRecommendation(null);
        if (!installationGNode) {
            return;
        }
        let current = true;
        void probeRerun(installationGNode).then((available) => {
            if (current) {
                setRerunAvailable(available);
            }
        });
        return () => {
            current = false;
        };
    }, [installationGNode]);

    const floHourButtonsVisible = floRecommendation !== null || floNotice !== null;

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
            if (isLoading || isFloLoading || isRerunning || isTypingTarget(event.target)) {
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
    });

    if (!session) {
        return null;
    }

    const plotSelectedChannels = [...channels].sort().concat(showPoints ? ['show-points'] : []);

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

    function clearReadingsDisplay() {
        setReadingsBundleData(null);
        setPlottedParams(null);
    }

    function clearFloDisplay() {
        setFloRecommendation(null);
        setFloParams(null);
        setFloRealPriceMwh(null);
        setFloNotice(null);
        setFloPairIndex(0);
        setFloRerunRecommendation(null);
        setFloPenRerunSummary(null);
        setFloHorizonBarSelections({ top: [], bottom: [] });
        setFloTuningDraft({});
        setIsFloPenMode(false);
        setFloSummaryXAxisMetrics(null);
    }

    function clearVisualizerContent() {
        clearReadingsDisplay();
        clearFloDisplay();
        setPlotError(null);
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

        const generation = ++floQueryGeneration.current;
        setIsLoading(true);
        setPlotError(null);
        try {
            const apiResult = await GridWorksApi.get<unknown>(
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
            if (generation !== floQueryGeneration.current) {
                return;
            }
            const readings = SyncedReadingsBundle.parse(apiResult.data);
            clearVisualizerContent();
            // New data draws every plot at the full window; a zoom from
            // before it is gone with the old plots.
            isZoomedRef.current = false;
            setPlottedParams({
                startDate: startDate,
                endDate: endDate,
                installationGNode
            })
            setReadingsBundleData(readings);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setPlotError(message);
        } finally {
            if (generation === floQueryGeneration.current) {
                setIsLoading(false);
            }
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
        floQueryGeneration.current += 1;
        clearVisualizerContent();
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

        const generation = ++floQueryGeneration.current;
        setEndDateWindow(endDt);
        setFloHourShift(hourShift);
        setIsFloLoading(true);
        const slotStart = endDate.setZone(NEW_YORK_TIME_ZONE).startOf('hour');
        try {
            const [recommendation, params, realPriceMwh] = await Promise.all([
                fetchRecommendation({ installationGNode, time: endDate }),
                fetchParams({ installationGNode, time: endDate }),
                // The bid plot draws the actual supply line only once the slot has cleared.
                fetchSlotClearedPrice({ installationGNode, slotStart }).catch(() => null),
            ]);
            if (generation !== floQueryGeneration.current) {
                return;
            }
            clearVisualizerContent();
            if (recommendation === null) {
                setFloRecommendation(null);
                setFloNotice(`No FLO was run for the slot starting ${slotStart.toFormat('yyyy-LL-dd HH:mm')} ET`);
            } else {
                const pairIndex = defaultPairIndex(recommendation);
                setFloNotice(null);
                setFloPairIndex(pairIndex);
                setFloRecommendation(recommendation);
                setFloParams(params);
                setFloRealPriceMwh(realPriceMwh);
                setFloHorizonBarSelections(emptyFloHorizonBarSelections(
                    recommendation.OptimalPathList[pairIndex].StepDurationMinutes.length,
                ));
                setFloTuningDraft(floPenaltyTuningDraft((params && penaltyTuning(params)) ?? {}));
                setFloPenRerunSummary(null);
                setFloRerunRecommendation(null);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setPlotError(message);
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
        if (isLoading || isFloLoading || isRerunning) {
            return;
        }
        setIsFloPenMode(false);
        void runFloQuery(shiftEndWall(endDateTime, hours), hours < 0 ? -1 : 1);
    }

    async function onFloPenRerunClick() {
        const base = floParams === null ? null : penaltyTuning(floParams);
        const values = floPenaltyTuningFromDraft(floTuningDraft);
        if (!floParams || base === null || values === null || isLoading || isFloLoading || isRerunning) {
            return;
        }
        const forcedOn = floHorizonSelectedPositions(floHorizonBarSelections.top);
        const forcedOff = floHorizonSelectedPositions(floHorizonBarSelections.bottom);
        const generation = floQueryGeneration.current;
        setPlotError(null);
        setIsRerunning(true);
        try {
            const answer = await rerun(floRerunRequest(
                floParams,
                { ...base, ...values } as PenaltyTuning,
                floHorizonSelectedSteps(floHorizonBarSelections.top),
                floHorizonSelectedSteps(floHorizonBarSelections.bottom),
            ));
            if (generation !== floQueryGeneration.current) {
                return;
            }
            setFloRerunRecommendation(answer);
            setFloPenRerunSummary({ forcedOn, forcedOff });
        } catch (error) {
            setPlotError(error instanceof Error ? error.message : "Unknown error");
        } finally {
            setIsRerunning(false);
        }
    }

    useEffect(() => {
        if (!installationGNode || floParams === null) {
            setFloActualLoadKw(null);
            return;
        }
        let cancelled = false;
        void fetchActualLoadKw({
            installationGNode,
            stepStartS: paramsView(floParams).stepStartS,
            stepDurationMinutes: floParams.StepDurationMinutes,
        }).then((load) => {
            if (!cancelled) setFloActualLoadKw(load);
        });
        return () => {
            cancelled = true;
        };
    }, [installationGNode, floParams]);

    const floRequestView = floParams === null ? null : paramsView(floParams);
    const floOnPeakSteps = floRequestView === null || tariff === null
        ? []
        : onPeakStepMask(tariff, floRequestView.stepStartS);
    const shownFloRecommendation = floRerunRecommendation ?? floRecommendation;
    const shownFloPairIndex = floRerunRecommendation === null
        ? floPairIndex
        : defaultPairIndex(floRerunRecommendation);
    const floBid = shownFloRecommendation && floParams
        ? bidView(shownFloRecommendation, floParams, floRealPriceMwh)
        : null;

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

    return (
        <div ref={visualizerCardRef} className={`card visualizer-card${isFullscreen ? ' fullscreen' : ''}`}>
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title">Visualizer</h5>
                <div className="status-badges">
                    {(isLoading || isFloLoading || isRerunning) && <div className="loader" aria-label="Loading visualizer data" />}
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

            {(floRecommendation || floNotice) &&
                <div className={`plot-container${isShowingOptions ? '' : ' plot-container--border-top'}`}>
                    <div className="d-flex flex-column align-items-center gap-2 pt-3">
                        <div className="d-flex justify-content-center align-items-center gap-2">
                        <button
                            className={`btn btn-sm btn-outline-secondary flo-hour-btn${floHourShift === -1 ? ' is-loading' : ''}`}
                            type="button"
                            aria-label="One hour earlier"
                            aria-busy={floHourShift === -1}
                            disabled={isLoading || isFloLoading || isRerunning}
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
                            disabled={isLoading || isFloLoading || isRerunning}
                            onClick={() => onFloHourShift(1)}
                        >
                            {floHourShift === 1
                                ? <div className="loader" aria-hidden />
                                : <i className="bi bi-chevron-right" aria-hidden />}
                        </button>
                        {rerunAvailable &&
                            <button
                                className={`btn btn-sm btn-outline-secondary flo-hour-btn${isFloPenMode ? ' is-selected' : ''}`}
                                type="button"
                                aria-label="Edit"
                                aria-pressed={isFloPenMode}
                                disabled={isLoading || isFloLoading || !floRecommendation}
                                onClick={() => setIsFloPenMode((on) => !on)}
                            >
                                <i className="bi bi-pencil" aria-hidden />
                            </button>
                        }
                        </div>
                        {rerunAvailable && isFloPenMode && floRecommendation &&
                            <div className="flo-pen-controls">
                                <p className="flo-pen-instructions text-muted small mb-0">
                                    Re-run the same FLO but forcing the heat pump to be on or off in some of the
                                    hours. Select the hours to force on (off) in the top (bottom) bar below.
                                </p>
                                <FloHorizonBars
                                    metrics={floSummaryXAxisMetrics}
                                    onPeakSteps={floOnPeakSteps}
                                    isDarkMode={getIsDarkMode()}
                                    barSelectedSteps={floHorizonBarSelections}
                                    onBarSelectedStepsChange={setFloHorizonBarSelections}
                                />
                                <FloPenaltyTuning
                                    draft={floTuningDraft}
                                    onDraftChange={setFloTuningDraft}
                                    disabled={isLoading || isFloLoading || isRerunning}
                                />
                                <button
                                    className="btn btn-sm btn-outline-secondary flo-pen-rerun-btn"
                                    type="button"
                                    disabled={
                                        floParams === null
                                        || penaltyTuning(floParams) === null
                                        || isLoading
                                        || isFloLoading
                                        || isRerunning
                                        || floPenaltyTuningFromDraft(floTuningDraft) === null
                                    }
                                    onClick={() => void onFloPenRerunClick()}
                                >
                                    {isRerunning ? "Re-running…" : "Re-run"}
                                </button>
                                {floPenRerunSummary &&
                                    <div className="flo-pen-rerun-summary text-muted small">
                                        <p className="mb-0">
                                            Steps forced on:{" "}
                                            {formatFloPenForcedStepsList(floPenRerunSummary.forcedOn)}
                                        </p>
                                        <p className="mb-0">
                                            Steps forced off:{" "}
                                            {formatFloPenForcedStepsList(floPenRerunSummary.forcedOff)}
                                        </p>
                                    </div>
                                }
                            </div>
                        }
                    </div>
                    {floNotice &&
                        <div className="alert alert-secondary mt-3 mb-0 mx-3" role="status">{floNotice}</div>
                    }
                    {shownFloRecommendation &&
                        <div className="visualizer-server-plots-root">
                            <FloPlot
                                recommendation={shownFloRecommendation}
                                params={floParams}
                                tariff={tariff}
                                pairIndex={shownFloPairIndex}
                                isDarkMode={getIsDarkMode()}
                                onXAxisMetrics={onFloSummaryXAxisMetrics}
                            />
                            {floBid && <FloBidPlot bid={floBid} isDarkMode={getIsDarkMode()} />}
                            {floRequestView && (
                                <>
                                    <FloParamsForecastPlot
                                        kind="load"
                                        request={floRequestView}
                                        isDarkMode={getIsDarkMode()}
                                        actualKw={floActualLoadKw}
                                    />
                                    <FloParamsForecastPlot
                                        kind="rswt"
                                        request={floRequestView}
                                        isDarkMode={getIsDarkMode()}
                                    />
                                </>
                            )}
                        </div>
                    }
                </div>
            }

            {readingsBundleData && plottedParams &&
                <div className={`plot-container${isShowingOptions ? '' : ' plot-container--border-top'}`}>
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
                                showPoints={showPoints}
                                onZoomChange={(zoomed) => { isZoomedRef.current = zoomed; }} />
                        ))}
                    </div>
                </div>
            }

        </div>
    );
}
