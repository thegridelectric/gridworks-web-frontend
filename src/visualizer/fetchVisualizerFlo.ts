import { getVisualizerApiBaseUrl } from './fetchVisualizerPlots';

function floDownloadFilename(houseAlias: string, endUnixMs: number): string {
    const newYorkDate = new Date(endUnixMs)
        .toLocaleString('en-US', {
            timeZone: 'America/New_York',
            hour12: false,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
        })
        .replace(/,/g, '')
        .replace(/\s/g, '_')
        .toLowerCase();
    return `flo_${houseAlias}_${newYorkDate}.xlsx`;
}

export async function downloadVisualizerFlo(params: {
    houseAlias: string;
    timeMs: number;
    token: string;
}): Promise<void> {
    const base = getVisualizerApiBaseUrl();
    const res = await fetch(`${base}/flo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${params.token}`,
        },
        body: JSON.stringify({
            house_alias: params.houseAlias,
            password: '',
            time_ms: params.timeMs,
        }),
    });

    if (!res.ok) {
        throw new Error(`FLO request failed (${res.status})`);
    }

    const blob = await res.blob();
    if (blob.size <= 4) {
        return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = floDownloadFilename(params.houseAlias, params.timeMs);
    a.click();
    URL.revokeObjectURL(url);
}
