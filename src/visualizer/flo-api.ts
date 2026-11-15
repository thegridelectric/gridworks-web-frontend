import { isAxiosError } from "axios";
import type { DateTime } from "luxon";
import GridWorksApi from "../_util/GridWorksApi";
import { AnyFloRecommendation } from "../sema/types/AnyFloRecommendation";
import { AnyFloParams } from "../sema/types/AnyFloParams";

/** The recommendation the FLO service published for the house's market
 *  slot that `time` falls in, at the version the journal holds, or null
 *  when no FLO ran for that slot. */
export async function fetchRecommendation(params: {
    installationGNode: string;
    time: DateTime;
}): Promise<AnyFloRecommendation | null> {
    const word = await fetchSlotWord(params, "flo.recommendation");
    return word === null ? null : AnyFloRecommendation.parse(word);
}

/** The request the house's LTN sent the FLO for the market slot `time`
 *  falls in, or null when the journal holds none for that slot. */
export async function fetchParams(params: {
    installationGNode: string;
    time: DateTime;
}): Promise<AnyFloParams | null> {
    const word = await fetchSlotWord(params, "flo.params");
    return word === null ? null : AnyFloParams.parse(word);
}

async function fetchSlotWord(
    params: { installationGNode: string; time: DateTime },
    typeName: "flo.recommendation" | "flo.params",
): Promise<unknown | null> {
    // A 404 is the backend's "no FLO ran in this slot" and resolves as a
    // response here, so the app's response interceptor never rewraps it.
    try {
        const res = await GridWorksApi.get<unknown>(
            `/api/v2/installations/${params.installationGNode}/${typeName}`,
            {
                params: { time: params.time.toISO() },
                validateStatus: (status) => status === 200 || status === 404,
            },
        );
        return res.status === 404 ? null : res.data;
    } catch (error: unknown) {
        const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
        const errMsg = detail || (error instanceof Error ? error.message : `Unknown error type ${typeof error}`);
        throw new Error(`FLO request failed: ${errMsg}`);
    }
}

/** Whether this backend solves re-runs: a laptop with bruce installed
 *  beside the API mounts the route, the web box never does. The probe is
 *  a GET of the POST-only path: 405 means the route is mounted, 404 that
 *  it is not, and anything else hides the panel too. */
export async function probeRerun(installationGNode: string): Promise<boolean> {
    try {
        const res = await GridWorksApi.get<unknown>(
            `/api/v2/installations/${installationGNode}/flo.rerun`,
            { validateStatus: (status) => status === 404 || status === 405 },
        );
        return res.status === 405;
    } catch {
        return false;
    }
}

/** bruce's recommendation for `params`, solved on the backend's machine:
 *  the hour's journaled request with its Tuning edited, answered at the
 *  version the backend serves so the plot draws it like the journaled
 *  word. A solve takes a few seconds at most once the tank shape's
 *  transition matrix is cached. */
export async function rerun(params: AnyFloParams): Promise<AnyFloRecommendation> {
    try {
        const res = await GridWorksApi.post<unknown>(
            `/api/v2/installations/${params.GNodeAlias}/flo.rerun`,
            params,
            { timeout: 60_000 },
        );
        return AnyFloRecommendation.parse(res.data);
    } catch (error: unknown) {
        const detail = isAxiosError(error) ? error.response?.data?.detail : undefined;
        const errMsg = detail || (error instanceof Error ? error.message : `Unknown error type ${typeof error}`);
        throw new Error(`FLO re-run failed: ${errMsg}`);
    }
}
