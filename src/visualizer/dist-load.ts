import { DateTime } from "luxon";
import GridWorksApi from "../_util/GridWorksApi";
import { SyncedReadingsBundle } from "../sema/types/SyncedReadingsBundle";
import { toDisplayValue } from "../sema/units";

/**
 * Placeholder for the house energy ratio (sum of heat-pump kWh over sum of
 * distribution kWh on the training window). Replace with the fitted ratio.
 */
export const DIST_ENERGY_RHO = 1.3;

const DIST_CHANNELS = ["dist-swt", "dist-rwt", "dist-flow"] as const;
/** Bucket the distribution channels the same way the visualizer reads them. */
const DIST_SAMPLE_SECONDS = 60;

/**
 * Instantaneous distribution power, the per-second term averaged into hourly
 * dist_kwh in gridworks-house-parameters `get_data.py`:
 * `500 * dist_flow_gpm * (dist_swt_c - dist_rwt_c) * 9/5 / 3410`.
 * Temperatures here are °F, which cancels the 9/5 against the °C delta.
 */
export function distKw(flowGpm: number, swtF: number, rwtF: number): number {
    return (500 * flowGpm * (swtF - rwtF)) / 3410;
}

export type DistSample = {
    timeS: number;
    flowGpm: number;
    swtF: number;
    rwtF: number;
};

/** Mean dist kW in each step, times ρ. A step with no samples is null. */
export function actualLoadKw(
    samples: DistSample[],
    stepStartS: number[],
    stepDurationMinutes: number[],
    rho: number = DIST_ENERGY_RHO,
): (number | null)[] {
    return stepStartS.map((startS, i) => {
        const endS = startS + stepDurationMinutes[i] * 60;
        let sum = 0;
        let n = 0;
        for (const sample of samples) {
            if (sample.timeS < startS || sample.timeS >= endS) continue;
            const kw = distKw(sample.flowGpm, sample.swtF, sample.rwtF);
            if (!Number.isFinite(kw)) continue;
            sum += kw;
            n += 1;
        }
        return n === 0 ? null : (sum / n) * rho;
    });
}

function channelValues(
    bundle: SyncedReadingsBundle,
    name: string,
): { unit: string; values: (number | null)[] } | null {
    const channel = bundle.ChannelReadingsList.find((item) => item.ChannelName === name);
    if (!channel) return null;
    return { unit: channel.Unit, values: channel.ValueList };
}

/** One sample per timestamp where flow, SWT, and RWT are all present. */
export function distSamples(bundle: SyncedReadingsBundle): DistSample[] {
    const flow = channelValues(bundle, "dist-flow");
    const swt = channelValues(bundle, "dist-swt");
    const rwt = channelValues(bundle, "dist-rwt");
    if (!flow || !swt || !rwt) return [];
    const samples: DistSample[] = [];
    const n = Math.min(
        bundle.TimestampList.length,
        flow.values.length,
        swt.values.length,
        rwt.values.length,
    );
    for (let i = 0; i < n; i += 1) {
        const rawFlow = flow.values[i];
        const rawSwt = swt.values[i];
        const rawRwt = rwt.values[i];
        if (rawFlow === null || rawSwt === null || rawRwt === null) continue;
        const flowGpm = toDisplayValue(flow.unit, rawFlow);
        const swtF = toDisplayValue(swt.unit, rawSwt);
        const rwtF = toDisplayValue(rwt.unit, rawRwt);
        const timeS = Date.parse(bundle.TimestampList[i]) / 1000;
        if (
            flowGpm === undefined
            || swtF === undefined
            || rwtF === undefined
            || !Number.isFinite(timeS)
        ) {
            continue;
        }
        samples.push({ timeS, flowGpm, swtF, rwtF });
    }
    return samples;
}

/**
 * Scaled distribution load on the FLO step grid, or null when the horizon
 * has not started or the readings request fails. Hours with no samples stay
 * null so the plot shows the forecast alone there.
 */
export async function fetchActualLoadKw(params: {
    installationGNode: string;
    stepStartS: number[];
    stepDurationMinutes: number[];
}): Promise<(number | null)[] | null> {
    const { installationGNode, stepStartS, stepDurationMinutes } = params;
    if (stepStartS.length === 0 || stepStartS.length !== stepDurationMinutes.length) {
        return null;
    }
    const startS = stepStartS[0];
    const horizonEndS = stepStartS[stepStartS.length - 1]
        + stepDurationMinutes[stepDurationMinutes.length - 1] * 60;
    const endS = Math.min(horizonEndS, DateTime.utc().toSeconds());
    if (endS <= startS) return null;
    try {
        const res = await GridWorksApi.get<unknown>(
            `/api/v2/installations/${installationGNode}/synced.readings.bundle`,
            {
                params: {
                    start: DateTime.fromSeconds(startS, { zone: "utc" }).toISO(),
                    end: DateTime.fromSeconds(endS, { zone: "utc" }).toISO(),
                    channels: DIST_CHANNELS.join(","),
                    time_step: DIST_SAMPLE_SECONDS,
                },
            },
        );
        const bundle = SyncedReadingsBundle.parse(res.data);
        const load = actualLoadKw(distSamples(bundle), stepStartS, stepDurationMinutes);
        return load.some((value) => value !== null) ? load : null;
    } catch {
        return null;
    }
}
