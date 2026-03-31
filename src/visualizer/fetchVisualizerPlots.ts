import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';
import type { VisualizerPlotsApiResponse } from './visualizerApiTypes';

export async function fetchVisualizerPlots(params: {
    houseAlias: string;
    startMs: number;
    endMs: number;
    selectedChannels: string[];
    darkmode: boolean;
    token: string;
}): Promise<VisualizerPlotsApiResponse> {
    const base = getVisualizerApiBaseUrl();
    const res = await fetch(`${base}/plots`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${params.token}`,
        },
        body: JSON.stringify({
            house_alias: params.houseAlias,
            password: '',
            start_ms: params.startMs,
            end_ms: params.endMs,
            selected_channels: params.selectedChannels,
            confirm_with_user: false,
            darkmode: params.darkmode,
        }),
    });

    const text = await res.text();
    let data: VisualizerPlotsApiResponse;
    try {
        data = JSON.parse(text) as VisualizerPlotsApiResponse;
    } catch {
        throw new Error(text || 'Visualizer API returned a non-JSON response');
    }

    if (!res.ok) {
        throw new Error(data?.message || res.statusText || 'Plots request failed');
    }

    return data;
}
