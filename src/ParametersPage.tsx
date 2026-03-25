import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import Plot from 'react-plotly.js';

import InstallationPicker from './_shared/InstallationPicker';
import SessionContext, {
    installationForRouteId,
    type BasicInstallationInfo,
} from './_util/SessionContext';
import { parsePathname } from './_util/urlUtility';
import {
    applyCrossFieldConstraints,
    buildParametersFigures,
    clampParam,
    heatingParamsFromHouse,
    PARAM_SPECS,
} from './parameters/parametersModel';
import type { HeatingParams } from './parameters/types';
import { DEFAULT_HEATING_PARAMS } from './parameters/types';
import { getDarkModeForVisualizer } from './visualizer/visualizerDarkMode';

import './ParametersPage.css';

function useHtmlThemeMutationTick() {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const el = document.documentElement;
        const obs = new MutationObserver(() => setTick((t) => t + 1));
        obs.observe(el, { attributes: true, attributeFilter: ['data-bs-theme', 'data-theme'] });
        return () => obs.disconnect();
    }, []);
    return tick;
}

function ParametersCard({ installation }: { installation: BasicInstallationInfo | undefined }) {
    const hasHouse = Boolean(installation);
    const [params, setParams] = useState<HeatingParams>(() =>
        installation ? heatingParamsFromHouse(installation.houseParameters) : { ...DEFAULT_HEATING_PARAMS },
    );

    const themeTick = useHtmlThemeMutationTick();
    const isDark = useMemo(() => {
        void themeTick;
        return getDarkModeForVisualizer();
    }, [themeTick]);

    const { figures, plotError } = useMemo(() => {
        try {
            return {
                figures: buildParametersFigures(params, isDark),
                plotError: null as string | null,
            };
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return { figures: null, plotError: message };
        }
    }, [params, isDark]);

    function onParamChange(key: keyof HeatingParams, raw: string) {
        const num = parseFloat(raw);
        if (Number.isNaN(num)) {
            return;
        }
        const clamped = clampParam(key, num);
        setParams((prev) => applyCrossFieldConstraints(prev, key, clamped));
    }

    function onReset() {
        if (!installation) {
            return;
        }
        setParams(heatingParamsFromHouse(installation.houseParameters));
    }

    const noPowerRswt = -params.alpha / params.beta;

    return (
        <div className="card visualizer-card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title">Parameters</h5>
                <div className="status-badges">
                    <button
                        className="filter-toggle"
                        type="button"
                        onClick={onReset}
                        disabled={!hasHouse}
                    >
                        <span>Reset</span>
                    </button>
                </div>
            </div>
            <div className="p-4">
                <div className="mb-4">
                    <label className="form-label">Selected House</label>
                    <div className="selected-house-picker">
                        <InstallationPicker />
                    </div>
                </div>

                {plotError && (
                    <div
                        className="alert alert-danger"
                        role="alert"
                        style={{ marginBottom: '1.25rem' }}
                    >
                        Error: {plotError}
                    </div>
                )}

                {!hasHouse && (
                    <div
                        className="text-center text-secondary py-5"
                        style={{ fontSize: '0.875rem' }}
                    >
                        Select an installation to view and edit parameters
                    </div>
                )}

                {hasHouse && figures && (
                    <>
                        <div className="parameters-plot-wrap mb-4">
                            <Plot
                                data={figures.plot1.data}
                                layout={figures.plot1.layout}
                                config={{ responsive: true, displayModeBar: false }}
                                style={{ width: '100%', height: '100%' }}
                                useResizeHandler
                            />
                        </div>
                        <div className="parameters-plot-wrap mb-4">
                            <Plot
                                data={figures.plot2.data}
                                layout={figures.plot2.layout}
                                config={{ responsive: true, displayModeBar: false }}
                                style={{ width: '100%', height: '100%' }}
                                useResizeHandler
                            />
                        </div>
                    </>
                )}

                {hasHouse && (
                    <div className="parameters-controls d-flex">
                        {PARAM_SPECS.map((spec) => (
                            <div key={spec.key} className="parameters-control-group">
                                <label htmlFor={`param-${spec.key}`}>{spec.label}</label>
                                <input
                                    id={`param-${spec.key}-slider`}
                                    type="range"
                                    min={spec.min}
                                    max={spec.max}
                                    step={spec.step}
                                    value={params[spec.key]}
                                    onChange={(e) => onParamChange(spec.key, e.target.value)}
                                    aria-label={`${spec.label} slider`}
                                />
                                <input
                                    id={`param-${spec.key}`}
                                    type="number"
                                    className="form-control form-control-sm"
                                    step={spec.step}
                                    value={params[spec.key]}
                                    onChange={(e) => onParamChange(spec.key, e.target.value)}
                                />
                            </div>
                        ))}
                        {!plotError && (
                            <div className="text-secondary small mt-2">
                                NO_POWER_RSWT (derived): {noPowerRswt.toFixed(2)} °F
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ParametersPage() {
    const location = useLocation();
    const { currentInstallationId } = parsePathname(location.pathname);
    const session = useContext(SessionContext);
    const installation = installationForRouteId(session?.installations, currentInstallationId);

    return <ParametersCard key={installation?.id ?? '__none__'} installation={installation} />;
}
