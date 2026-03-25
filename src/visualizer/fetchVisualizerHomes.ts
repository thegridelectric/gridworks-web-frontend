import type { BasicInstallationInfo } from '../_util/SessionContext';
import type { HouseParameters } from '../parameters/types';
import { getVisualizerApiBaseUrl } from './fetchVisualizerPlots';

export interface VisualizerHouse {
    /** API may return a number; URLs and <select> values are strings. */
    unique_id: string | number;
    short_alias?: string;
    address?: {
        city?: string;
        state?: string;
        street?: string;
        zip?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    };
    scada_git_commit?: string;
    alert_status?: { status?: string };
    house_parameters?: HouseParameters;
}

export async function fetchVisualizerHomes(token: string): Promise<VisualizerHouse[]> {
    const base = getVisualizerApiBaseUrl();
    const res = await fetch(`${base}/homes`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error(`Homes request failed (${res.status})`);
    }
    return res.json() as Promise<VisualizerHouse[]>;
}

export function housesToInstallations(houses: VisualizerHouse[]): BasicInstallationInfo[] {
    return houses.map((h) => {
        const city = h.address?.city;
        const state = h.address?.state;
        const locationLabel =
            city && state ? `${city}, ${state}` : city || state || '';
        const status = h.alert_status?.status;
        const alertStatus =
            status === 'ok' ? 'ok' : status === 'alert' ? 'alert' : 'unknown';
        const alias = h.short_alias?.trim();
        return {
            id: String(h.unique_id),
            displayName: alias || 'N/A',
            houseAlias: alias || undefined,
            locationLabel,
            commit: h.scada_git_commit || undefined,
            alertStatus,
            houseParameters: h.house_parameters,
        };
    });
}
