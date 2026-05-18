import type { DateTime } from 'luxon';
import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';
import type { ReadingsBundleApiResponse } from './visualizerApiTypes';
import { getRequiredAuthToken } from '../auth/auth';

export async function fetchVisualizerPlots(params: {
    houseAlias: string;
    startDate: DateTime;
    endDate: DateTime;
    selectedChannels: string[];
}): Promise<ReadingsBundleApiResponse> {
    // TODO use this
    const base = getVisualizerApiBaseUrl();

    // TODO pass in this ID
    const houseId = `hw1.isone.me.versant.keene.${params.houseAlias}`;

    // TODO use just the selected channels
    const selectedChannels = [
        ...params.selectedChannels,
        '^zone\\d+-.+-set$',
        '^zone\\d+-.+-temp$',
        '^zone\\d+-.+-heatcall$',
        '^buffer-depth\\d$',
        '^tank\\d-depth\\d$',
    ]

    const urlParams = new URLSearchParams();
    urlParams.append("start", params.startDate.toISO() || '');
    urlParams.append("end", params.endDate.toISO() || '');
    urlParams.append("channels", selectedChannels.join(','));

    const token = getRequiredAuthToken();
    
    try {
        const res = await fetch(`http://localhost:8000/api/v2/installations/${houseId}/synced.readings.bundle?${urlParams}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) {
            throw new Error(`Plots request failed: ${res.status}`);
        }

        const data = await res.json() as ReadingsBundleApiResponse;
        return data;
    } catch (error: any) {
        const errMsg = error.message || `Unknown error type ${typeof error}`
        throw new Error(`synced.readings.bundle API request failed: ${errMsg}`);
    }
}
