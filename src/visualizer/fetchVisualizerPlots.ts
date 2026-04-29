import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';
import type { ReadingsBundleApiResponse } from './visualizerApiTypes';

export async function fetchVisualizerPlots(params: {
    houseAlias: string;
    startDateIso: string;
    endDateIso: string;
    selectedChannels: string[];
    darkmode: boolean;
    token: string;
}): Promise<ReadingsBundleApiResponse> {
    // TODO use this
    const base = getVisualizerApiBaseUrl();

    // TODO pass in this ID
    const houseId = `hw1.isone.me.versant.keene.${params.houseAlias}`;

    // TODO get this from the hardware layout
    const selectedChannels = [
        ...params.selectedChannels,
        'zone1-down-set',
        'zone1-down-temp',
        'zone2-up-set',
        'zone2-up-temp',
        'buffer-depth1',
        'buffer-depth2',
        'buffer-depth3',
    ]

    const urlParams = new URLSearchParams();
    urlParams.append("start", params.startDateIso);
    urlParams.append("end", params.endDateIso);
    urlParams.append("channels", selectedChannels.join(','));

    try {
        const res = await fetch(`http://localhost:8000/api/v2/installations/${houseId}/synced.readings.bundle?${urlParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${params.token}`,
            },
        });
        if (!res.ok) {
            throw new Error(`Plots request failed: ${res.status}`);
        }

        const data = await res.json() as ReadingsBundleApiResponse;
        return data;
    } catch (error: any) {
        const errMsg = error.message || `Unknown error type ${typeof error}`
        throw new Error(`Plots request failed: ${errMsg}`);
    }
}
