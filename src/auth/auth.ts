import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USERNAME_KEY = 'username';
/** Persisted from POST /login only — GET /me does not include roles. */
const AUTH_ROLES_KEY = 'auth_roles';

export type AuthRolesMap = Record<string, string>;

/** Successful POST /login JSON (Gridworks visualizer API). */
export interface LoginResponseBody {
    username: string;
    roles: AuthRolesMap;
    access_token: string;
    token_type: string;
}

function parseRoles(value: unknown): AuthRolesMap | null {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const out: AuthRolesMap = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof k !== 'string' || typeof v !== 'string') {
            continue;
        }
        const role = k.trim().toLowerCase();
        const installation = v.trim();
        if (!role) {
            continue;
        }
        out[role] = installation;
    }
    if (Object.keys(out).length === 0) {
        return null;
    }
    return out;
}

export async function login(username: string, password: string): Promise<void> {
    const base = getVisualizerApiBaseUrl();
    const loginUrl = `${base}/login`;
    const res = await fetch(loginUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            username: username.trim(),
            password,
        }),
    });

    if (!res.ok) {
        throw new Error('Invalid username or password');
    }

    const data = JSON.parse(await res.text()) as Partial<LoginResponseBody>;
    if (!data.access_token) {
        throw new Error('Login response did not include access_token');
    }
    const roles = parseRoles(data.roles);
    if (!roles) {
        clearAuth();
        throw new Error('Your account is not permitted to sign in.');
    }

    const resolvedUsername =
        typeof data.username === 'string' && data.username.trim() !== ''
            ? data.username.trim()
            : username.trim();

    localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    localStorage.setItem(AUTH_USERNAME_KEY, resolvedUsername);
    localStorage.setItem(AUTH_ROLES_KEY, JSON.stringify(roles));
}

export function clearAuth(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USERNAME_KEY);
    localStorage.removeItem(AUTH_ROLES_KEY);
}

export function getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getRequiredAuthToken(): string {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Expected auth token for protected route');
    }
    return token;
}

export function getAuthUsername(): string | null {
    return localStorage.getItem(AUTH_USERNAME_KEY);
}

export function getDisplayUserName(): string {
    return getAuthUsername() || 'Visualizer user';
}

/** Roles from login only (persisted). Keys are role names, values are installation strings. */
export function getAuthRoles(): AuthRolesMap {
    const raw = localStorage.getItem(AUTH_ROLES_KEY);
    if (!raw) {
        return {};
    }
    try {
        const parsed = JSON.parse(raw) as unknown;
        const roles = parseRoles(parsed);
        return roles ?? {};
    } catch {
        return {};
    }
}

function hasRole(roleName: string): boolean {
    const key = roleName.trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(getAuthRoles(), key);
}

export function isAdminUser(): boolean {
    return hasRole('admin');
}

/**
 * Viewer-only: has viewer role but not owner or admin.
 * Used for 10-day visualizer restriction and hiding real-time (owner/admin see more).
 */
export function isViewerUser(): boolean {
    return hasRole('viewer') && !hasRole('owner') && !hasRole('admin');
}

/** Installation aliases the user may access (all non-admin role values). Admins ignore this list. */
export function getAuthUserInstallations(): string[] {
    const roles = getAuthRoles();
    const set = new Set<string>();
    for (const [role, inst] of Object.entries(roles)) {
        if (role === 'admin') {
            continue;
        }
        const a = inst.trim().toLowerCase();
        if (a) {
            set.add(a);
        }
    }
    return Array.from(set);
}
