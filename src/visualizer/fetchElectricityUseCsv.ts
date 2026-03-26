import { getVisualizerApiBaseUrl } from './fetchVisualizerPlots';

function filenameFromContentDisposition(header: string | null): string {
    if (!header) {
        return 'electricity-use.csv';
    }
    const star = /filename\*=UTF-8''([^;\n]+)/i.exec(header);
    if (star) {
        try {
            return decodeURIComponent(star[1].trim());
        } catch {
            return 'electricity-use.csv';
        }
    }
    const plain = /filename="([^"]+)"/i.exec(header) || /filename=([^;\n]+)/i.exec(header);
    if (plain) {
        return plain[1].trim().replace(/^["']|["']$/g, '');
    }
    return 'electricity-use.csv';
}

export async function downloadElectricityUseCsv(params: {
    token: string;
    selectedShortAliases: string[];
    startMs: number;
    endMs: number;
}): Promise<{ blob: Blob; filename: string }> {
    const base = getVisualizerApiBaseUrl();
    const res = await fetch(`${base}/electricity-use-csv`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${params.token}`,
        },
        body: JSON.stringify({
            selected_short_aliases: params.selectedShortAliases,
            start_ms: params.startMs,
            end_ms: params.endMs,
        }),
    });

    if (res.status === 401) {
        throw new Error('Unauthorized — sign in again.');
    }
    if (!res.ok) {
        throw new Error(`Hourly CSV request failed (${res.status})`);
    }

    const filename = filenameFromContentDisposition(res.headers.get('Content-Disposition'));
    const blob = await res.blob();
    return { blob, filename };
}
