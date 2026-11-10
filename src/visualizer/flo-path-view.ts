import { DateTime } from "luxon";
import type { AnyFloRecommendation } from "../sema/types/AnyFloRecommendation";
import type { FloParams } from "../sema/types/FloParams";
import { formatForDisplay } from "./plot-configs";

/** One of the store's three temperature bands across the path's steps,
 *  drawn as one block per step: where the block starts on the layer axis
 *  (layers count up from the store's bottom), how many layers it spans,
 *  and its temperature in degrees F. A band a step does not have spans
 *  zero layers. */
export type BandView = {
    name: "Top" | "Middle" | "Bottom";
    base: number[];
    layers: number[];
    tempF: number[];
};

/** One of the optimizer's penalty series, stacked on the ones before it. */
export type PenaltyView = {
    name: string;
    usd: number[];
    base: number[];
};

/** What the FLO view draws for one pair's path: step starts as display
 *  times, step widths, the heat pump's kW and the store's kWh per step,
 *  and, where the recommendation states them, the store's layers, its
 *  state of charge between the empty and full energies the store word
 *  states, the optimizer's penalties, the terminal cost as a share of
 *  an empty store's, and the path's total cost. */
export type FloPathView = {
    pairIndex: number;
    priceUsdMwh: number;
    quantityKw: number;
    slotStart: string;
    stepStart: string[];
    stepWidthMs: number[];
    hpKw: number[];
    storeKwh: number[];
    storeLayers: number | null;
    bands: BandView[];
    penalties: PenaltyView[];
    terminalCostUsd: number | null;
    socPct: number[] | null;
    terminalCostPct: number | null;
    pathCostUsd: number | null;
};

/** The index of the pair the view opens on: the pair whose path has the
 *  lowest PathCostUsd, which is the path the optimizer takes at its
 *  forecast price. A recommendation that states no path costs opens on
 *  the lowest-priced pair, the one that holds when the price clears at
 *  or below every pair. */
export function defaultPairIndex(recommendation: AnyFloRecommendation): number {
    const penalties = recommendation.Version === "001" ? recommendation.PathPenaltiesList : undefined;
    if (!penalties || penalties.length === 0) return recommendation.PqPairs.length - 1;
    let cheapest = 0;
    penalties.forEach((p, i) => {
        if (p.PathCostUsd < penalties[cheapest].PathCostUsd) cheapest = i;
    });
    return cheapest;
}

export function pathView(recommendation: AnyFloRecommendation, pairIndex: number): FloPathView {
    const pair = recommendation.PqPairs[pairIndex];
    const path = recommendation.OptimalPathList[pairIndex];
    const toKw = recommendation.QuantityUnit === "AvgMW" ? 1000 : 1;
    const stepStartS: number[] = [];
    let t = path.StartUnixS;
    for (const minutes of path.StepDurationMinutes) {
        stepStartS.push(t);
        t += minutes * 60;
    }
    const store = recommendation.Version === "001" ? recommendation.StoreStateList?.[pairIndex] : undefined;
    const bands: BandView[] = [];
    if (store) {
        const n = store.StoreLayers;
        bands.push(
            { name: "Top", base: store.Thermocline1List.map((t1) => n - t1), layers: [...store.Thermocline1List], tempF: store.TopFList },
            {
                name: "Middle",
                base: store.Thermocline2List.map((t2) => n - t2),
                layers: store.Thermocline2List.map((t2, i) => t2 - store.Thermocline1List[i]),
                tempF: store.MiddleFList,
            },
            { name: "Bottom", base: store.Thermocline2List.map(() => 0), layers: store.Thermocline2List.map((t2) => n - t2), tempF: store.BottomFList },
        );
    }
    const bruce = recommendation.Version === "001" ? recommendation.PathPenaltiesList?.[pairIndex] : undefined;
    const penalties: PenaltyView[] = [];
    if (bruce) {
        const series: [string, number[]][] = [
            ["RSWT penalty", bruce.RswtPenaltyUsdList],
            ["Stability penalty", bruce.StabilityPenaltyUsdList],
            ["Short-cycle penalty", bruce.ShortCyclePenaltyUsdList],
        ];
        const base = bruce.RswtPenaltyUsdList.map(() => 0);
        for (const [name, usd] of series) {
            penalties.push({ name, usd, base: [...base] });
            usd.forEach((v, i) => { base[i] += v; });
        }
    }
    return {
        pairIndex,
        priceUsdMwh: pair.PriceX1000 / 1000,
        quantityKw: (pair.QuantityX1000 * toKw) / 1000,
        slotStart: formatForDisplay(DateTime.fromSeconds(path.StartUnixS)),
        stepStart: stepStartS.map((s) => formatForDisplay(DateTime.fromSeconds(s))),
        stepWidthMs: path.StepDurationMinutes.map((m) => m * 60_000),
        hpKw: path.HpAvgWList.map((w) => w / 1000),
        storeKwh: path.StoreWhList.map((wh) => wh / 1000),
        storeLayers: store ? store.StoreLayers : null,
        bands,
        penalties,
        terminalCostUsd: bruce ? bruce.TerminalCostUsd : null,
        socPct: store
            ? path.StoreWhList.map((wh) => ((wh - store.EmptyStoreWh) / (store.FullStoreWh - store.EmptyStoreWh)) * 100)
            : null,
        terminalCostPct: bruce && bruce.TerminalCostEmptyStoreUsd > 0
            ? (100 * bruce.TerminalCostUsd) / bruce.TerminalCostEmptyStoreUsd
            : null,
        pathCostUsd: bruce ? bruce.PathCostUsd : null,
    };
}

/** What the FLO view draws from the slot's request, on the request's
 *  step grid: the forecast load in kW, the electricity price the
 *  optimizer saw (LMP plus distribution, USD per MWh), and that price per
 *  MWh of heat at each step's COP.
 *
 *  The thermal price applies the COP rule flo.params spells out (the
 *  coefficients, the floor and the outside air). */
export type FloParamsView = {
    stepStart: string[];
    priceUsdMwh: number[];
    loadKw: number[];
    thermalPriceUsdMwh: number[];
    /** The electricity price over the horizon's mean COP: the price on
     *  the thermal axis, for comparison with the thermal price. */
    priceNormalizedUsdMwh: number[];
};

/** The heat pump's COP at an outside air temperature, as bruce models it. */
export function cop(params: FloParams, oatF: number): number {
    return oatF < params.CopMinOatF ? params.CopMin : params.CopIntercept + params.CopOatCoeff * oatF;
}

export function paramsView(params: FloParams): FloParamsView {
    const stepStartS: number[] = [];
    let t = params.StartUnixS;
    for (const minutes of params.StepDurationMinutes) {
        stepStartS.push(t);
        t += minutes * 60;
    }
    const priceUsdMwh = params.LmpUsdMwhList.map((lmp, i) => lmp + params.DistUsdMwhList[i]);
    const cops = params.OatFList.map((oat) => cop(params, oat));
    const copBar = cops.reduce((a, b) => a + b, 0) / cops.length;
    return {
        stepStart: stepStartS.map((s) => formatForDisplay(DateTime.fromSeconds(s))),
        priceUsdMwh,
        loadKw: params.LoadKwhList.map((kwh, i) => kwh / (params.StepDurationMinutes[i] / 60)),
        thermalPriceUsdMwh: priceUsdMwh.map((p, i) => p / cops[i]),
        priceNormalizedUsdMwh: priceUsdMwh.map((p) => p / copBar),
    };
}

/** The slot start as the plot's title, in the display zone. */
export function slotTitle(recommendation: AnyFloRecommendation): string {
    return DateTime.fromSeconds(recommendation.OptimalPathList[0].StartUnixS)
        .setZone("America/New_York")
        .toFormat("LLL dd, yyyy HH:mm ZZZZ");
}

/** The plot's title: the slot start and, where the recommendation states
 *  it, the optimizer's total cost of the path drawn. */
export function plotTitle(recommendation: AnyFloRecommendation, view: FloPathView): string {
    const slot = slotTitle(recommendation);
    return view.pathCostUsd === null ? slot : `${slot} ($${view.pathCostUsd.toFixed(2)})`;
}

/** Matplotlib's Reds, the scale bruce's visualizer colors the store with,
 *  over 60 to 180 F; the stops are the colormap's at 0, 0.25, 0.5, 0.75, 1. */
const REDS: [number, number, number][] = [[255, 245, 240], [252, 174, 145], [251, 106, 74], [203, 24, 29], [103, 0, 13]];
export const STORE_SCALE_MIN_F = 60;
export const STORE_SCALE_MAX_F = 180;

export function temperatureColor(tempF: number): string {
    const x = Math.min(1, Math.max(0, (tempF - STORE_SCALE_MIN_F) / (STORE_SCALE_MAX_F - STORE_SCALE_MIN_F)));
    const pos = x * (REDS.length - 1);
    const k = Math.min(REDS.length - 2, Math.floor(pos));
    const f = pos - k;
    const rgb = REDS[k].map((c, i) => Math.round(c + (REDS[k + 1][i] - c) * f));
    return `rgb(${rgb.join(",")})`;
}

/** Dark text on the light end of the scale, light text on the dark end. */
export function temperatureTextColor(tempF: number): string {
    return tempF >= (STORE_SCALE_MIN_F + STORE_SCALE_MAX_F) / 2 ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.7)";
}
