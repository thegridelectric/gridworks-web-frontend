import { getVisualizerApiBaseUrl } from './fetchVisualizerPlots';

export type ElectricityUseResult =
    | { kind: 'zip'; blob: Blob }
    | { kind: 'json_error'; message: string };

export async function fetchElectricityUse(params: {
    token: string;
    selectedShortAliases: string[];
    startMs: number;
    endMs: number;
    darkmode: boolean;
}): Promise<ElectricityUseResult> {
    const base = getVisualizerApiBaseUrl();
    const res = await fetch(`${base}/electricity-use`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${params.token}`,
        },
        body: JSON.stringify({
            selected_short_aliases: params.selectedShortAliases,
            darkmode: params.darkmode,
            start_ms: params.startMs,
            end_ms: params.endMs,
        }),
    });

    const ct = res.headers.get('Content-Type') || '';

    if (ct.includes('application/json')) {
        const data = (await res.json()) as { success?: boolean; message?: string };
        if (res.status === 401) {
            return { kind: 'json_error', message: 'Unauthorized — sign in again.' };
        }
        if (data.success === false) {
            return { kind: 'json_error', message: data.message || 'Electricity use request failed' };
        }
        return { kind: 'json_error', message: data.message || 'Unexpected response from server' };
    }

    if (res.status === 401) {
        return { kind: 'json_error', message: 'Unauthorized — sign in again.' };
    }
    if (!res.ok) {
        return { kind: 'json_error', message: `Electricity use request failed (${res.status})` };
    }

    return { kind: 'zip', blob: await res.blob() };
}
