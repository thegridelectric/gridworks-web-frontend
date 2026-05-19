import type { BasicInstallationInfo } from '../_util/SessionContext';
import type { HouseParameters } from '../parameters/types';
import { clearAuth } from './auth';
import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';

interface FallbackHouse {
    unique_id: string | number;
    g_node_alias: string;
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
    hardware_layout?: string;
    alert_status?: { status?: string; message?: string };
    primary_contact?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
    };
    secondary_contact?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
    };
    house_parameters?: HouseParameters;
}

function toInstallation(h: FallbackHouse): BasicInstallationInfo {
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
        gNodeAlias: h.g_node_alias,
        displayName: alias || 'N/A',
        houseAlias: alias || undefined,
        locationLabel,
        address: h.address,
        primaryContact: h.primary_contact
            ? {
                firstName: h.primary_contact.first_name,
                lastName: h.primary_contact.last_name,
                email: h.primary_contact.email,
                phone: h.primary_contact.phone,
            }
            : undefined,
        secondaryContact: h.secondary_contact
            ? {
                firstName: h.secondary_contact.first_name,
                lastName: h.secondary_contact.last_name,
                email: h.secondary_contact.email,
                phone: h.secondary_contact.phone,
            }
            : undefined,
        commit: h.scada_git_commit || undefined,
        hardwareLayout: h.hardware_layout || undefined,
        alertStatus,
        alertMessage: h.alert_status?.message || undefined,
        houseParameters: h.house_parameters,
    };
}

export async function fetchFallbackInstallations(token: string): Promise<BasicInstallationInfo[]> {
    const base = getVisualizerApiBaseUrl();
    const res = await fetch(`${base}/homes`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
        clearAuth();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        throw new Error(`Homes request failed (${res.status})`);
    }
    const houses = await res.json() as FallbackHouse[];
    return houses.map(toInstallation);
}
