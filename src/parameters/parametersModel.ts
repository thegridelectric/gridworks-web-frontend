import type { Data, Layout } from 'plotly.js';

import type { HeatingParams, HouseParameters } from './types';
import { DEFAULT_HEATING_PARAMS } from './types';

export const PARAM_SPECS: {
    key: keyof HeatingParams;
    label: string;
    min: number;
    max: number;
    step: number;
}[] = [
    { key: 'alpha', label: 'ALPHA', min: 0, max: 20, step: 0.1 },
    { key: 'beta', label: 'BETA', min: -1, max: 0, step: 0.01 },
    { key: 'gamma', label: 'GAMMA', min: 0, max: 0.015, step: 0.0001 },
    { key: 'intermediate_power', label: 'INTERMEDIATE_POWER', min: 0, max: 20, step: 0.1 },
    { key: 'intermediate_rswt', label: 'INTERMEDIATE_RSWT', min: 90, max: 250, step: 1 },
    { key: 'dd_power', label: 'DD_POWER', min: 0, max: 20, step: 0.1 },
    { key: 'dd_rswt', label: 'DD_RSWT', min: 90, max: 250, step: 1 },
    { key: 'dd_delta_t', label: 'DD_DELTA_T', min: 0, max: 50, step: 0.1 },
];

const specByKey = Object.fromEntries(PARAM_SPECS.map((s) => [s.key, s])) as Record<
    keyof HeatingParams,
    (typeof PARAM_SPECS)[number]
>;

export function clampParam(key: keyof HeatingParams, value: number): number {
    const { min, max } = specByKey[key];
    return Math.max(min, Math.min(max, value));
}

/** Load state from API house_parameters; ALPHA and DD_POWER stay synced like the backoffice. */
export function heatingParamsFromHouse(hp?: HouseParameters | null): HeatingParams {
    const d = { ...DEFAULT_HEATING_PARAMS };
    if (!hp) {
        return d;
    }
    const power =
        hp.dd_power_kw !== undefined
            ? hp.dd_power_kw
            : hp.alpha !== undefined
              ? hp.alpha
              : d.alpha;
    return {
        alpha: power,
        beta: hp.beta ?? d.beta,
        gamma: hp.gamma ?? d.gamma,
        intermediate_power: hp.intermediate_power_kw ?? d.intermediate_power,
        intermediate_rswt: hp.intermediate_rswt ?? d.intermediate_rswt,
        dd_power: power,
        dd_rswt: hp.dd_rswt ?? d.dd_rswt,
        dd_delta_t: hp.dd_delta_t ?? d.dd_delta_t,
    };
}

export interface FullHeatingParams extends HeatingParams {
    no_power_rswt: number;
}

export function toFullParams(p: HeatingParams): FullHeatingParams {
    const no_power_rswt = -p.alpha / p.beta;
    return { ...p, no_power_rswt };
}

function calculateCoefficients(params: FullHeatingParams) {
    const x0 = params.no_power_rswt;
    const xi = params.intermediate_rswt;
    const xd = params.dd_rswt;
    const yi = params.intermediate_power;
    const yd = params.dd_power;

    const c =
        ((xi * xd) / (xi - xd)) *
        ((yd * x0) / (xd * (x0 - xd)) - (yi * x0) / (xi * (x0 - xi)));
    const b = (yi * x0) / (xi * (x0 - xi)) - ((x0 + xi) / (x0 * xi)) * c;
    const a = -b / x0 - c / (x0 * x0);

    return { a, b, c };
}

function requiredHeatingPower(oat: number, ws: number, params: HeatingParams) {
    const r = params.alpha + params.beta * oat + params.gamma * ws * (65 - oat);
    return r > 0 ? r : 0;
}

function deliveredHeatingPower(swt: number, coeffs: { a: number; b: number; c: number }) {
    const d = coeffs.a * swt * swt + coeffs.b * swt + coeffs.c;
    return d > 0 ? d : 0;
}

function requiredSWT(hp: number, coeffs: { a: number; b: number; c: number }): number | null {
    const c2 = coeffs.c - hp;
    const discriminant = coeffs.b * coeffs.b - 4 * coeffs.a * c2;
    if (discriminant < 0) {
        return null;
    }
    return (-coeffs.b + Math.sqrt(discriminant)) / (2 * coeffs.a);
}

export function validateAlphaDdPower(p: HeatingParams): void {
    if (Math.abs(p.alpha - p.dd_power) > 0.001) {
        throw new Error('ALPHA and DD_POWER must be equal');
    }
}

/** Apply cross-field limits after a single field edit (same rules as backoffice). */
export function applyCrossFieldConstraints(
    prev: HeatingParams,
    key: keyof HeatingParams,
    value: number,
): HeatingParams {
    let next: HeatingParams = { ...prev, [key]: value };

    if (key === 'intermediate_power' && next.intermediate_power > next.dd_power) {
        next = { ...next, intermediate_power: next.dd_power };
    } else if (key === 'intermediate_rswt' && next.intermediate_rswt > next.dd_rswt) {
        next = { ...next, intermediate_rswt: next.dd_rswt };
    } else if (key === 'dd_power' && next.intermediate_power > next.dd_power) {
        next = { ...next, intermediate_power: next.dd_power };
    } else if (key === 'dd_rswt' && next.intermediate_rswt > next.dd_rswt) {
        next = { ...next, intermediate_rswt: next.dd_rswt };
    }

    if (key === 'alpha') {
        next = { ...next, dd_power: next.alpha };
    } else if (key === 'dd_power') {
        next = { ...next, alpha: next.dd_power };
    }

    return next;
}

export function buildParametersFigures(
    params: HeatingParams,
    isDarkMode: boolean,
): { plot1: { data: Data[]; layout: Partial<Layout> }; plot2: { data: Data[]; layout: Partial<Layout> } } {
    const full = toFullParams(params);
    validateAlphaDdPower(params);

    const coeffs = calculateCoefficients(full);

    const oats: number[] = [];
    for (let i = 70; i >= -10; i -= 1) {
        oats.push(i);
    }

    const kw_0: number[] = [];
    const rswt_0: (number | null)[] = [];
    for (const oat of oats) {
        const kw = requiredHeatingPower(oat, 0, params);
        kw_0.push(kw);
        const rswt = requiredSWT(kw, coeffs);
        rswt_0.push(rswt !== null ? rswt : null);
    }

    const kw_10: number[] = [];
    const rswt_10: (number | null)[] = [];
    for (const oat of oats) {
        const kw = requiredHeatingPower(oat, 10, params);
        kw_10.push(kw);
        const rswt = requiredSWT(kw, coeffs);
        rswt_10.push(rswt !== null ? rswt : null);
    }

    const powerColor = isDarkMode ? 'rgb(100, 149, 237)' : 'rgb(31, 119, 180)';
    const rswtColor = isDarkMode ? 'rgb(255, 165, 0)' : 'rgb(255, 127, 14)';
    const deltaTColor = isDarkMode ? 'rgb(76, 175, 80)' : 'rgb(46, 125, 50)';
    const bgColor = isDarkMode ? '#1b1b1c' : '#ffffff';
    const textColor = isDarkMode ? '#d4d4d4' : '#212529';
    const gridColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    const traces: Data[] = [
        {
            x: oats,
            y: kw_0,
            name: 'RHP, no wind',
            type: 'scatter',
            mode: 'lines',
            line: { color: powerColor, width: 2 },
            yaxis: 'y',
            opacity: 0.7,
            hovertemplate: '%{y:.1f} kW<extra></extra>',
        },
        {
            x: oats,
            y: kw_10,
            name: 'RHP, 10 mph wind',
            type: 'scatter',
            mode: 'lines',
            line: { color: powerColor, width: 2, dash: 'dash' },
            yaxis: 'y',
            opacity: 0.7,
            hovertemplate: '%{y:.1f} kW<extra></extra>',
        },
        {
            x: oats,
            y: rswt_0,
            name: 'RSWT, no wind',
            type: 'scatter',
            mode: 'lines',
            line: { color: rswtColor, width: 2 },
            yaxis: 'y2',
            opacity: 0.7,
            hovertemplate: '%{y:.1f}°F<extra></extra>',
        },
        {
            x: oats,
            y: rswt_10,
            name: 'RSWT, 10 mph wind',
            type: 'scatter',
            mode: 'lines',
            line: { color: rswtColor, width: 2, dash: 'dash' },
            yaxis: 'y2',
            opacity: 0.7,
            hovertemplate: '%{y:.1f}°F<extra></extra>',
        },
    ];

    const layout: Partial<Layout> = {
        xaxis: {
            title: { text: 'OAT [F]', font: { color: textColor } },
            gridcolor: gridColor,
            showgrid: false,
            zeroline: false,
            showline: true,
            mirror: true,
            hoverformat: '.0f',
            tickfont: { color: textColor },
        },
        yaxis: {
            title: { text: 'Required heating power [kW]', font: { color: powerColor } },
            side: 'left',
            showgrid: false,
            gridcolor: gridColor,
            showline: true,
            zeroline: false,
            linecolor: powerColor,
            tickcolor: powerColor,
            tickfont: { color: powerColor },
        },
        yaxis2: {
            title: { text: 'RSWT [F]', font: { color: rswtColor } },
            side: 'right',
            overlaying: 'y',
            showgrid: true,
            gridcolor: gridColor,
            showline: true,
            zeroline: false,
            linecolor: rswtColor,
            tickcolor: rswtColor,
            tickfont: { color: rswtColor },
        },
        legend: {
            x: 0.98,
            y: 0.98,
            xanchor: 'right',
            yanchor: 'top',
            bgcolor: isDarkMode ? 'rgba(27, 27, 28, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            font: { color: textColor },
        },
        plot_bgcolor: bgColor,
        paper_bgcolor: bgColor,
        hovermode: 'x unified',
        margin: { l: 50, r: 50, t: 20, b: 50 },
    };

    const swtValues: number[] = [];
    const deltaTValues: number[] = [];
    const ddPow = params.dd_power;
    for (let swt = 90; swt <= 190; swt += 1) {
        swtValues.push(swt);
        const deliveredPower = deliveredHeatingPower(swt, coeffs);
        const deltaT =
            ddPow > 0 ? (params.dd_delta_t / ddPow) * deliveredPower : 0;
        deltaTValues.push(deltaT > 0 ? deltaT : 0);
    }

    const trace2: Data = {
        x: swtValues,
        y: deltaTValues,
        type: 'scatter',
        mode: 'lines',
        line: { color: deltaTColor, width: 2 },
        hovertemplate: 'SWT: %{x:.0f}°F<br>Delta T: %{y:.1f}°F<extra></extra>',
    };

    const layout2: Partial<Layout> = {
        xaxis: {
            title: { text: 'SWT [F]', font: { color: textColor, weight: 'bold' } },
            gridcolor: gridColor,
            showgrid: false,
            zeroline: false,
            showline: true,
            mirror: true,
            hoverformat: '.0f',
            tickfont: { color: textColor },
        },
        yaxis: {
            title: { text: 'Delta T [F]', font: { color: deltaTColor, weight: 'bold' } },
            side: 'left',
            showgrid: true,
            gridcolor: gridColor,
            showline: true,
            zeroline: false,
            linecolor: deltaTColor,
            tickcolor: deltaTColor,
            tickfont: { color: deltaTColor },
        },
        legend: {
            x: 0.98,
            y: 0.98,
            xanchor: 'right',
            yanchor: 'top',
            bgcolor: isDarkMode ? 'rgba(27, 27, 28, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            font: { color: textColor },
        },
        plot_bgcolor: bgColor,
        paper_bgcolor: bgColor,
        hovermode: 'x unified',
        margin: { l: 50, r: 50, t: 20, b: 50 },
    };

    return { plot1: { data: traces, layout }, plot2: { data: [trace2], layout: layout2 } };
}
