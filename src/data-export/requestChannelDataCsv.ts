import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';

export type ChannelDataCsvResult =
    | { type: 'file'; blob: Blob; filename: string }
    | { type: 'confirm'; message: string }
    | { type: 'error'; message: string };

export async function requestChannelDataCsv(params: {
    token: string;
    houseAlias: string;
    startMs: number;
    endMs: number;
    selectedChannels: string[];
    timestep: string;
    confirmWithUser: boolean;
}): Promise<ChannelDataCsvResult> {
    const base = getVisualizerApiBaseUrl();
    const res = await fetch(`${base}/csv`, {
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
            timestep: params.timestep,
            confirm_with_user: params.confirmWithUser,
        }),
    });

    if (res.status === 401) {
        return { type: 'error', message: 'Unauthorized — sign in again.' };
    }
    if (!res.ok) {
        return { type: 'error', message: `CSV request failed (${res.status})` };
    }

    const ct = res.headers.get('Content-Type') || '';
    if (ct.includes('application/json')) {
        const data = (await res.json()) as {
            success?: boolean;
            message?: string;
            confirm_with_user?: boolean;
        };
        if (data.success === false) {
            if (data.confirm_with_user && data.message) {
                return { type: 'confirm', message: data.message };
            }
            return { type: 'error', message: data.message || 'CSV export failed' };
        }
        return { type: 'error', message: 'Unexpected response from server' };
    }

    const startDate = new Date(params.startMs);
    const formattedStart = startDate.toISOString().slice(0, 16).replace('T', '-');
    const endDate = new Date(params.endMs);
    const formattedEnd = endDate.toISOString().slice(0, 16).replace('T', '-');
    const filename = `${params.houseAlias}_${params.timestep}s_${formattedStart}-${formattedEnd}.csv`;
    const blob = await res.blob();
    return { type: 'file', blob, filename };
}
