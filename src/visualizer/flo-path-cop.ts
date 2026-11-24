import type { AnyFloRecommendation } from "../sema/types/AnyFloRecommendation";
import type { AnyFloParams } from "../sema/types/AnyFloParams";
import { thermoclineLayer } from "./flo-path-view";

const COLDEST_TANK_TEMP_F = 70;

function fahrenheitToKelvin(tempF: number): number {
    return ((tempF - 32) * 5) / 9 + 273.15;
}

function kelvinToFahrenheit(tempKelvin: number): number {
    return ((tempKelvin - 273.15) * 9) / 5 + 32;
}

function storeVolumeGallons(params: AnyFloParams): number {
    return params.GallonsPerTank * params.TanksModeled;
}

function computeEnergyKwh(
    topTempF: number,
    middleTempF: number,
    bottomTempF: number,
    thermocline1: number,
    thermocline2: number,
    volumeGallons: number,
    numLayers: number,
): number {
    const mLayerKg = (volumeGallons * 3.785) / numLayers;
    const kwhTop = thermocline1 * mLayerKg * (4.187 / 3600) * fahrenheitToKelvin(topTempF);
    const kwhMiddle = (thermocline2 - thermocline1) * mLayerKg * (4.187 / 3600) * fahrenheitToKelvin(middleTempF);
    const kwhBottom = (numLayers - thermocline2) * mLayerKg * (4.187 / 3600) * fahrenheitToKelvin(bottomTempF);
    return kwhTop + kwhMiddle + kwhBottom;
}

function bruceTuning(params: AnyFloParams): { numLayers: number; hpConstantLiftF: number } | null {
    if (params.Tuning.TypeName !== "flo.tuning.bruce") return null;
    return { numLayers: params.Tuning.NumLayers, hpConstantLiftF: params.Tuning.HpConstantLiftF };
}

function initialStoreEnergyKwh(params: AnyFloParams): number | null {
    const tuning = bruceTuning(params);
    if (tuning === null) return null;
    const sensors = params.TanksModeled * params.TempSensorsPerTank;
    const t1 = thermoclineLayer(params.InitialThermocline1, sensors, tuning.numLayers);
    const t2 = thermoclineLayer(params.InitialThermocline2, sensors, tuning.numLayers);
    return computeEnergyKwh(
        params.InitialTopTempF,
        params.InitialMiddleTempF,
        params.InitialBottomTempF,
        t1,
        t2,
        storeVolumeGallons(params),
        tuning.numLayers,
    );
}

function storeEnergyBoundsKwh(
    params: AnyFloParams,
    recommendation: AnyFloRecommendation,
    pairIndex: number,
): { minKwh: number; maxKwh: number } | null {
    const tuning = bruceTuning(params);
    if (tuning === null) return null;
    const store = recommendation.Version === "000" ? undefined : recommendation.StoreStateList?.[pairIndex];
    if (store) {
        return { minKwh: store.EmptyStoreWh / 1000, maxKwh: store.FullStoreWh / 1000 };
    }
    const volume = storeVolumeGallons(params);
    const n = tuning.numLayers;
    return {
        minKwh: computeEnergyKwh(COLDEST_TANK_TEMP_F, COLDEST_TANK_TEMP_F, COLDEST_TANK_TEMP_F, n, n, volume, n),
        maxKwh: computeEnergyKwh(params.MaxTankTempF, params.MaxTankTempF, params.MaxTankTempF, n, n, volume, n),
    };
}

/** COP = CopIntercept + lift coefficient * max(0, lwt − oat), the lift
 *  model bruce optimizes with. 005 names the coefficient
 *  CopLwtMinusOatCoeff; earlier versions hold the same number in
 *  CopLwtCoeff. */
export function heatPumpCop(params: AnyFloParams, oatF: number, lwtF: number): number {
    const liftCoeff = params.Version === "005" ? params.CopLwtMinusOatCoeff : params.CopLwtCoeff;
    return params.CopIntercept + liftCoeff * Math.max(0, lwtF - oatF);
}

function expectedLwtF(
    startEnergyKwh: number,
    heatToStoreKwh: number,
    hpConstantLiftF: number,
    volumeGallons: number,
    minEnergyKwh: number,
    maxEnergyKwh: number,
): number {
    const capacityKwhPerK = (volumeGallons * 3.785 * 4.187) / 3600;
    const endEnergy = Math.min(
        Math.max(startEnergyKwh + heatToStoreKwh, minEnergyKwh),
        maxEnergyKwh,
    );
    const startF = kelvinToFahrenheit(startEnergyKwh / capacityKwhPerK);
    const endF = kelvinToFahrenheit(endEnergy / capacityKwhPerK);
    return (startF + endF) / 2 + hpConstantLiftF / 2;
}

/** Per-step LWT on the planned path, matching ``_path_lwt_for_cop`` in bruce's visualizer. */
export function pathLwtFList(
    params: AnyFloParams,
    recommendation: AnyFloRecommendation,
    pairIndex: number,
): number[] | null {
    const tuning = bruceTuning(params);
    const initialKwh = initialStoreEnergyKwh(params);
    const bounds = storeEnergyBoundsKwh(params, recommendation, pairIndex);
    if (tuning === null || initialKwh === null || bounds === null) return null;

    const path = recommendation.OptimalPathList[pairIndex];
    if (!path || path.StoreWhList.length === 0) return null;

    const volume = storeVolumeGallons(params);
    const horizon = params.OatFList.length;
    const lwt: number[] = [];

    const lwtForStep = (t: number): number => {
        const startWh = t === 0 ? initialKwh * 1000 : path.StoreWhList[t - 1];
        const heatToStoreKwh = (path.StoreWhList[t] - startWh) / 1000;
        return expectedLwtF(
            startWh / 1000,
            heatToStoreKwh,
            tuning.hpConstantLiftF,
            volume,
            bounds.minKwh,
            bounds.maxKwh,
        );
    };

    for (let t = 0; t < horizon; t += 1) {
        if (t < path.StoreWhList.length) {
            lwt.push(lwtForStep(t));
        } else if (lwt.length > 0) {
            lwt.push(lwt[lwt.length - 1]);
        } else {
            lwt.push(expectedLwtF(initialKwh, 0, tuning.hpConstantLiftF, volume, bounds.minKwh, bounds.maxKwh));
        }
    }

    return lwt;
}

function hpOnAtStep(
    recommendation: AnyFloRecommendation,
    pairIndex: number,
    step: number,
): boolean {
    const path = recommendation.OptimalPathList[pairIndex];
    return step < path.HpAvgWList.length && path.HpAvgWList[step] > 0;
}

/** Step-average LWT (°F) used for COP; 0 where the heat pump is off (HpAvgW = 0). */
export function pathCopAvgLwtFList(
    params: AnyFloParams,
    recommendation: AnyFloRecommendation,
    pairIndex: number,
): number[] | null {
    const lwt = pathLwtFList(params, recommendation, pairIndex);
    if (lwt === null) return null;
    if (lwt.length !== params.OatFList.length) return null;
    return lwt.map((lwtF, t) => (hpOnAtStep(recommendation, pairIndex, t) ? lwtF : 0));
}

/** Step COP on the cheapest path; 0 where the heat pump is off (HpAvgW = 0). */
export function pathCopList(
    params: AnyFloParams,
    recommendation: AnyFloRecommendation,
    pairIndex: number,
): number[] | null {
    const lwt = pathLwtFList(params, recommendation, pairIndex);
    if (lwt === null) return null;
    if (lwt.length !== params.OatFList.length) return null;
    return lwt.map((lwtF, t) => {
        if (!hpOnAtStep(recommendation, pairIndex, t)) return 0;
        return heatPumpCop(params, params.OatFList[t], lwtF);
    });
}

/** True when the shortest path runs the heat pump on at least one step. */
export function pathHasHpOn(
    recommendation: AnyFloRecommendation,
    pairIndex: number,
): boolean {
    const path = recommendation.OptimalPathList[pairIndex];
    return path.HpAvgWList.some((w) => w > 0);
}