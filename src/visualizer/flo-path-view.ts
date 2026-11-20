import { DateTime } from "luxon";
import { z } from "zod";
import type { AnyFloRecommendation } from "../sema/types/AnyFloRecommendation";
import { type AnyFloParams, priceUsdMwhList } from "../sema/types/AnyFloParams";
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

/** The unmet-load series as the `UnmetLoadPenaltyUsdList` key of a
 *  `flo.path.penalties.bruce` 002 Experimental. Hand-coded: no word
 *  declares this key; a `flo.path.penalties.bruce` version that declares
 *  the list retires it. */
const UnmetLoadPenaltyUsdList = z.array(z.number());

type BrucePenalties = NonNullable<Extract<AnyFloRecommendation, { Version: "001" | "002" | "003" }>["PathPenaltiesList"]>[number];

/** The unmet-load penalty per step: the declared list at 001, the
 *  Experimental series at 002. Null at 000, and when a 002 word's
 *  Experimental holds no such series of the path's step count. */
function unmetLoadPenaltyUsdList(bruce: BrucePenalties): number[] | null {
    if (bruce.Version === "001") return bruce.UnmetLoadPenaltyUsdList;
    if (bruce.Version !== "002") return null;
    const series = UnmetLoadPenaltyUsdList.safeParse(bruce.Experimental.UnmetLoadPenaltyUsdList);
    return series.success && series.data.length === bruce.RswtPenaltyUsdList.length ? series.data : null;
}

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
    /** Where the last step ends, as a display time. */
    horizonEnd: string;
    barWidthMs: number[];
    /** Middle of each step, where the penalty bars are centered. */
    penaltyTime: string[];
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
    const penalties = recommendation.Version === "000" ? undefined : recommendation.PathPenaltiesList;
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
    const store = recommendation.Version === "000" ? undefined : recommendation.StoreStateList?.[pairIndex];
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
    const bruce = recommendation.Version === "000" ? undefined : recommendation.PathPenaltiesList?.[pairIndex];
    const penalties: PenaltyView[] = [];
    if (bruce) {
        const series: [string, number[]][] = [["RSWT penalty", bruce.RswtPenaltyUsdList]];
        const unmetLoad = unmetLoadPenaltyUsdList(bruce);
        if (unmetLoad !== null) {
            series.push(["Unmet load penalty", unmetLoad]);
        }
        series.push(
            ["Stability penalty", bruce.StabilityPenaltyUsdList],
            ["Short-cycle penalty", bruce.ShortCyclePenaltyUsdList],
        );
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
        horizonEnd: formatForDisplay(DateTime.fromSeconds(t)),
        barWidthMs: path.StepDurationMinutes.map((m) => m * 0.9 * 60_000),
        penaltyTime: stepStartS.map((s, i) => formatForDisplay(DateTime.fromSeconds(s + path.StepDurationMinutes[i] * 30))),
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
 *  step grid: the forecast load in kW and the electricity price the
 *  optimizer saw, in USD per MWh. */
export type FloParamsView = {
    stepStart: string[];
    /** The same step starts in UTC seconds. */
    stepStartS: number[];
    /** Where the last step ends, as a display time. */
    horizonEnd: string;
    priceUsdMwh: number[];
    loadKw: number[];
    rswtF: number[];
};

/** Repeat the last value out to the horizon end, so a post-step line covers the final hour. */
export function stepThrough(
    times: string[],
    end: string,
    values: (number | null)[],
): { x: string[]; y: (number | null)[] } {
    if (values.length === 0) return { x: times, y: values };
    return { x: [...times, end], y: [...values, values[values.length - 1]] };
}

export function paramsView(params: AnyFloParams): FloParamsView {
    const stepStartS: number[] = [];
    let t = params.StartUnixS;
    for (const minutes of params.StepDurationMinutes) {
        stepStartS.push(t);
        t += minutes * 60;
    }
    return {
        stepStart: stepStartS.map((s) => formatForDisplay(DateTime.fromSeconds(s))),
        stepStartS,
        horizonEnd: formatForDisplay(DateTime.fromSeconds(t)),
        priceUsdMwh: priceUsdMwhList(params),
        loadKw: params.LoadKwhList.map((kwh, i) => kwh / (params.StepDurationMinutes[i] / 60)),
        rswtF: [...params.RswtFList],
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

/** The same red, at the 0.7 alpha bruce's visualizer paints the tank with. */
export function temperatureFill(tempF: number): string {
    return temperatureColor(tempF).replace(/^rgb\((.*)\)$/, "rgba($1,0.7)");
}

/** Label color on a tank block: green once the layer meets that step's required
 *  supply temperature, gray below 100 F, white otherwise. */
export function storeLabelColor(tempF: number, rswtF: number | undefined): string {
    if (rswtF !== undefined && rswtF <= tempF) return "green";
    if (tempF < 100) return "gray";
    return "white";
}

/** One tank band as bruce's visualizer hands it to the plot: fill, the
 *  temperature printed inside, and whether that step's block is tall enough
 *  to print it. */
export type StoreBar = {
    y: number[];
    base: number[];
    color: string[];
    text: string[];
    textColor: string[];
    temp: number[];
};

export function thermoclineLayer(sensorPosition: number, sensors: number, numLayers: number): number {
    return Math.max(1, Math.round((sensorPosition * numLayers) / sensors));
}

function prependInitialStore(view: FloPathView, params: AnyFloParams): FloPathView {
    const n = view.storeLayers;
    if (n === null) return view;
    const sensors = params.TanksModeled * params.TempSensorsPerTank;
    const t1 = thermoclineLayer(params.InitialThermocline1, sensors, n);
    const t2 = thermoclineLayer(params.InitialThermocline2, sensors, n);
    const head: Record<BandView["name"], { base: number; layers: number; tempF: number }> = {
        Top: { base: n - t1, layers: t1, tempF: params.InitialTopTempF },
        Middle: { base: n - t2, layers: t2 - t1, tempF: params.InitialMiddleTempF },
        Bottom: { base: 0, layers: n - t2, tempF: params.InitialBottomTempF },
    };
    return {
        ...view,
        bands: view.bands.map((band) => {
            const first = head[band.name];
            return {
                ...band,
                base: [first.base, ...band.base],
                layers: [first.layers, ...band.layers],
                tempF: [first.tempF, ...band.tempF],
            };
        }),
    };
}

export function storeSampleTimes(view: FloPathView, includeInitial: boolean): string[] {
    if (view.stepStart.length === 0) return [];
    const ends = [...view.stepStart.slice(1), view.horizonEnd];
    return includeInitial ? [view.stepStart[0], ...ends] : ends;
}

export function storeSampleWidths(view: FloPathView, includeInitial: boolean): number[] {
    const widths = view.barWidthMs;
    const n = widths.length;
    if (n === 0) return [];
    const last = widths[n - 1];
    if (includeInitial) return [...widths, last];
    return widths.map((_, i) => widths[Math.min(i + 1, n - 1)]);
}

export function storeEndTimes(view: FloPathView): string[] {
    return storeSampleTimes(view, false);
}

export type StorePlot = {
    time: string[];
    barWidthMs: number[];
    bars: StoreBar[];
};

export function storePlot(view: FloPathView, params: AnyFloParams | null): StorePlot {
    const includeInitial = params !== null && view.storeLayers !== null && view.bands.length > 0 && view.stepStart.length > 0;
    const painted = storeBars(includeInitial ? prependInitialStore(view, params) : view, params?.RswtFList ?? null);
    return {
        time: storeSampleTimes(view, includeInitial),
        barWidthMs: storeSampleWidths(view, includeInitial),
        bars: painted,
    };
}

/** Bottom, middle, then top. As in bruce's own plot, a bottom band with no
 *  layers and a middle band one layer tall print no label. */
export function storeBars(view: FloPathView, rswtF: number[] | null): StoreBar[] {
    const band = (name: BandView["name"]) => view.bands.find((b) => b.name === name);
    const bottom = band("Bottom");
    const middle = band("Middle");
    const top = band("Top");
    const n = view.storeLayers;
    if (!bottom || !middle || !top || n === null) return [];
    const paint = (source: BandView, show: (height: number) => boolean): StoreBar => ({
        y: source.layers,
        base: source.base,
        color: source.tempF.map((t) => temperatureFill(t)),
        text: source.tempF.map((t, i) => (show(source.layers[i]) ? String(Math.trunc(t)) : "")),
        textColor: source.tempF.map((t, i) => storeLabelColor(t, rswtF !== null && i < rswtF.length ? rswtF[i] : undefined)),
        temp: source.tempF,
    });
    return [
        paint(bottom, (height) => height !== 0),
        paint(middle, (height) => height > 1),
        paint(top, () => true),
    ];
}

/** One stacked penalty series, already given its color and its base. */
export type PenaltyBar = {
    name: string;
    color: string;
    y: number[];
    base: number[];
};

const PENALTY_FILL = {
    rswt: "rgba(255,127,14,0.7)",
    unmet: "rgba(214,39,40,0.7)",
    stability: "rgba(148,103,189,0.7)",
    shortCycle: "rgba(23,190,207,0.7)",
    terminal: "rgba(44,160,44,0.7)",
} as const;

/** Which penalty series the tuning drew. A request with no bruce tuning
 *  draws every series the recommendation states. */
export type PenaltySeriesEnabled = {
    rswt: boolean;
    unmet: boolean;
    stability: boolean;
    shortCycle: boolean;
    terminal: boolean;
};

/** The penalty panel as bruce's visualizer stacks it: each enabled series
 *  on the one below, the terminal cost on the last step only, and a y range
 *  30% above the tallest stack. */
export function penaltyBars(
    view: FloPathView,
    enabled: PenaltySeriesEnabled,
): { series: PenaltyBar[]; yRange: [number, number] | null } {
    const byName = new Map(view.penalties.map((p) => [p.name, p.usd]));
    const zeros = view.stepStart.map(() => 0);
    const last = zeros.length - 1;
    const chosen: { name: string; color: string; y: number[] }[] = [];
    if (enabled.rswt && byName.has("RSWT penalty")) {
        chosen.push({ name: "RSWT penalty", color: PENALTY_FILL.rswt, y: byName.get("RSWT penalty")! });
    }
    if (enabled.unmet && byName.has("Unmet load penalty")) {
        chosen.push({ name: "Unmet load penalty", color: PENALTY_FILL.unmet, y: byName.get("Unmet load penalty")! });
    }
    if (enabled.stability && byName.has("Stability penalty")) {
        chosen.push({ name: "Stability penalty", color: PENALTY_FILL.stability, y: byName.get("Stability penalty")! });
    }
    if (enabled.shortCycle && byName.has("Short-cycle penalty")) {
        chosen.push({ name: "Short-cycle penalty", color: PENALTY_FILL.shortCycle, y: byName.get("Short-cycle penalty")! });
    }
    if (enabled.terminal && view.terminalCostUsd !== null && last >= 0) {
        const y = [...zeros];
        y[last] = view.terminalCostUsd;
        const pct = view.terminalCostPct === null ? null : view.terminalCostPct.toFixed(0);
        chosen.push({
            name: pct === null ? "Terminal cost" : `Terminal cost (${pct}% of max)`,
            color: PENALTY_FILL.terminal,
            y,
        });
    }
    const stack = [...zeros];
    const series = chosen.map((item) => {
        const bar = { name: item.name, color: item.color, y: item.y, base: [...stack] };
        item.y.forEach((v, i) => { stack[i] += v; });
        return bar;
    });
    const maxStack = stack.reduce((m, v) => Math.max(m, v), 0);
    const maxSeries = series.reduce((m, s) => Math.max(m, ...s.y), 0);
    const maxPenalty = Math.max(maxStack, maxSeries);
    return { series, yRange: maxPenalty > 0 ? [0, maxPenalty * 1.3] : null };
}

export type FloBidSupply = {
    priceMwh: number;
    intersection: [number, number];
};

export type FloBidView = {
    pairs: { quantityKwh: number[]; priceMwh: number[] };
    step: { quantityKwh: number[]; priceMwh: number[] };
    forecast: FloBidSupply;
    real: FloBidSupply | null;
    xRange: [number, number];
    xTickQuantitiesKwh: number[];
    yRange: [number, number];
    yTicks: number[];
};

export function bidView(
    recommendation: AnyFloRecommendation,
    params: AnyFloParams,
    realPriceMwh: number | null,
): FloBidView | null {
    if (recommendation.PqPairs.length === 0) {
        return null;
    }
    const stepHours = params.StepDurationMinutes[0] / 60;
    const toKw = recommendation.QuantityUnit === "AvgMW" ? 1000 : 1;
    const pairs = [...recommendation.PqPairs].sort((a, b) => b.PriceX1000 - a.PriceX1000);
    const pricesMwh = pairs.map((p) => p.PriceX1000 / 1000);
    const quantities = pairs.map((p) => (p.QuantityX1000 / 1000) * toKw * stepHours);
    const forecastPriceMwh = priceUsdMwhList(params)[0];
    const bidMinPriceMwh = params.PriceMinUsdMwh;
    const hpMaxQuantityKwh = params.HpMaxKwEl * stepHours;
    const maxQuantityKwh = hpMaxQuantityKwh * 1.1;

    function quantityAtPriceMwh(priceMwh: number): number {
        if (priceMwh > pricesMwh[0]) return quantities[0];
        for (let i = 0; i < pairs.length; i++) {
            const floor = i + 1 < pairs.length ? pricesMwh[i + 1] : bidMinPriceMwh;
            const inRange = i + 1 < pairs.length
                ? floor < priceMwh && priceMwh <= pricesMwh[i]
                : floor <= priceMwh && priceMwh <= pricesMwh[i];
            if (inRange) return quantities[i];
        }
        return quantities[quantities.length - 1];
    }

    const stepQ: number[] = [];
    const stepP: number[] = [];
    for (let i = 0; i < pairs.length; i++) {
        const pBottom = i + 1 < pricesMwh.length ? pricesMwh[i + 1] : bidMinPriceMwh;
        if (i === 0) {
            stepP.push(pricesMwh[i]);
            stepQ.push(quantities[i]);
        }
        stepP.push(pBottom);
        stepQ.push(quantities[i]);
        if (i + 1 < pairs.length) {
            stepP.push(pBottom);
            stepQ.push(quantities[i + 1]);
        }
    }

    const ceiling = pricesMwh[0];
    const floor = bidMinPriceMwh;
    const supplies = realPriceMwh === null ? [forecastPriceMwh] : [forecastPriceMwh, realPriceMwh];
    const belowCeiling = [...pricesMwh.slice(1), ...supplies].filter((p) => p < ceiling - 0.01);
    const aboveFloor = [pricesMwh[pricesMwh.length - 1], ...supplies].filter((p) => p > floor + 0.01);
    const topFeature = belowCeiling.length > 0 ? Math.max(...belowCeiling) : null;
    const bottomFeature = aboveFloor.length > 0 ? Math.min(...aboveFloor) : null;
    const span = Math.max((topFeature ?? ceiling) - (bottomFeature ?? floor), 1);
    const margin = Math.max(0.45 * span, 60);
    const pad = 0.04 * span;
    const yTop = topFeature !== null && ceiling > topFeature + margin ? topFeature + margin : ceiling + pad;
    const yBottom = bottomFeature !== null && floor < bottomFeature - margin ? bottomFeature - margin : floor - pad;
    const yTicks = [...pricesMwh];
    if (yTicks.every((p) => Math.abs(p - bidMinPriceMwh) > 0.01)) yTicks.push(bidMinPriceMwh);

    const xTicks = [...quantities];
    if (!xTicks.some((q) => Math.abs(q - hpMaxQuantityKwh) < 0.001)) xTicks.push(hpMaxQuantityKwh);

    const supply = (priceMwh: number): FloBidSupply => ({
        priceMwh,
        intersection: [quantityAtPriceMwh(priceMwh), priceMwh],
    });
    return {
        pairs: { quantityKwh: quantities, priceMwh: pricesMwh },
        step: { quantityKwh: stepQ, priceMwh: stepP },
        forecast: supply(forecastPriceMwh),
        real: realPriceMwh === null ? null : supply(realPriceMwh),
        xRange: [Math.min(...quantities) - 1, maxQuantityKwh],
        xTickQuantitiesKwh: xTicks.sort((a, b) => a - b),
        yRange: [yBottom, yTop],
        yTicks: yTicks.filter((p) => yBottom <= p && p <= yTop).sort((a, b) => b - a),
    };
}
