import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';

export type MorningReportMessagesPayload = {
    Details?: string[];
    'Time created'?: string[];
    'From node'?: string[];
    'Log level'?: string[];
    Summary?: string[];
    SummaryTable?: Record<string, string>;
    success?: boolean;
    message?: string;
    reload?: boolean;
};

export async function fetchMorningReportMessages(params: {
    token: string;
    houseAlias: string;
    selectedMessageTypes: string[];
    startMs: number;
    endMs: number;
    darkmode: boolean;
}): Promise<MorningReportMessagesPayload> {
    const base = getVisualizerApiBaseUrl();
    const res = await fetch(`${base}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${params.token}`,
        },
        body: JSON.stringify({
            house_alias: params.houseAlias,
            password: '',
            selected_channels: [],
            selected_message_types: params.selectedMessageTypes,
            start_ms: params.startMs,
            end_ms: params.endMs,
            darkmode: params.darkmode,
        }),
    });

    const data = (await res.json()) as MorningReportMessagesPayload & {
        success?: boolean;
        message?: string;
    };

    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error(data.message || `Messages request failed (${res.status})`);
    }
    if (data.success === false) {
        throw new Error(data.message || 'Messages request failed');
    }

    return data;
}
