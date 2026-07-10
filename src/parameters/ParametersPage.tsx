import { useContext, useEffect, useMemo, useState } from 'react';
import Plot from 'react-plotly.js';

import SingleInstallationPicker from '../_shared/SingleInstallationPicker';
import SessionContext, {
    installationRoleForGNode,
    type InstallationSummary,
} from '../_util/SessionContext';
import { getIsDarkMode } from '../_util/theme';
import { useRouteInfo } from '../_util/useRouteInfo';
import {
    applyCrossFieldConstraints,
    buildParametersFigures,
    clampParam,
    heatingParamsFromHouse,
    PARAM_SPECS,
} from './parametersModel';
import type { HeatingParams } from './types';
import { DEFAULT_HEATING_PARAMS } from './types';

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

function ParametersCard({ installation }: { installation: InstallationSummary | undefined }) {
    const hasHouse = Boolean(installation);
    const [params, setParams] = useState<HeatingParams>(() =>
        installation ? heatingParamsFromHouse(installation.houseParameters) : { ...DEFAULT_HEATING_PARAMS },
    );

    const themeTick = useHtmlThemeMutationTick();
    const isDark = useMemo(() => {
        void themeTick;
        return getIsDarkMode();
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
                        <SingleInstallationPicker />
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
    const { currentInstallationId } = useRouteInfo();
    const session = useContext(SessionContext);
    const installation = installationRoleForGNode(session?.installations, currentInstallationId);

    return <ParametersCard key={installation?.id ?? '__none__'} installation={installation} />;
}
