import type { DateTime } from "luxon";
import { getRequiredAuthToken } from "../auth/auth";

export interface MessagesApiRequest {
    houseAlias: string,
    startDate: DateTime,
    endDate: DateTime,
    messageTypes: string[],
}

export async function fetchMessages(params: MessagesApiRequest): Promise<any[]> {

    // TODO pass in this full ID
    const houseId = `hw1.isone.me.versant.keene.${params.houseAlias}`;
    const urlParams = new URLSearchParams();
    urlParams.append("start", params.startDate.toISO() || '');
    urlParams.append("end", params.endDate.toISO() || '');
    urlParams.append("message_types", params.messageTypes.join(','));

    const token = getRequiredAuthToken();

    try {
        const res = await fetch(`http://localhost:8000/api/v2/installations/${houseId}/messages?${urlParams}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) {
            throw new Error(`Plots request failed: ${res.status}`);
        }

        const data = await res.json() as any[];
        return data;
    } catch (error: any) {
        const errMsg = error.message || `Unknown error type ${typeof error}`
        throw new Error(`messages API request failed: ${errMsg}`);
    }


}