import { isAxiosError } from "axios";
import type { DateTime } from "luxon";
import GridWorksApi from "../_util/GridWorksApi";
import { AnyFloRecommendation } from "../sema/types/AnyFloRecommendation";
import { FloParams } from "../sema/types/FloParams";

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
}): Promise<FloParams | null> {
    const word = await fetchSlotWord(params, "flo.params");
    return word === null ? null : FloParams.parse(word);
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
