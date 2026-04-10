import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USERNAME_KEY = 'username';
/** Persisted from POST /login only — GET /me does not include roles. */
const AUTH_ROLES_KEY = 'auth_roles';

export type AuthRolesMap = Record<string, string>;

/** Only these role keys are accepted; any other keys from the API are ignored. */
const ALLOWED_ROLE_NAMES = new Set(['admin', 'viewer', 'owner']);

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
        if (!role || !ALLOWED_ROLE_NAMES.has(role)) {
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
 * Account has only viewer roles (no owner, no admin). Used when no installation
 * context is available for date lookback (fallback: apply viewer restriction).
 */
export function isViewerUser(): boolean {
    return hasRole('viewer') && !hasRole('owner') && !hasRole('admin');
}

export function normalizeInstallationAlias(alias: string): string {
    return alias.trim().toLowerCase();
}

/**
 * Effective access for a house alias from the role → installation map.
 * If both `owner` and `viewer` map to the same alias, owner wins.
 */
export function getAccessLevelForInstallationAlias(alias: string): 'admin' | 'owner' | 'viewer' | null {
    const n = normalizeInstallationAlias(alias);
    if (!n) {
        return null;
    }
    if (isAdminUser()) {
        return 'admin';
    }
    const roles = getAuthRoles();
    let matchedOwner = false;
    let matchedViewer = false;
    for (const [role, inst] of Object.entries(roles)) {
        if (role === 'admin') {
            continue;
        }
        if (normalizeInstallationAlias(inst) !== n) {
            continue;
        }
        if (role === 'owner') {
            matchedOwner = true;
        }
        if (role === 'viewer') {
            matchedViewer = true;
        }
    }
    if (matchedOwner) {
        return 'owner';
    }
    if (matchedViewer) {
        return 'viewer';
    }
    return null;
}

/** Real-time dashboard: owner or admin for that installation. */
export function hasRealTimeAccessForInstallationAlias(alias: string): boolean {
    const level = getAccessLevelForInstallationAlias(alias);
    return level === 'admin' || level === 'owner';
}

/** Apply 10-day end-date rule for queries scoped to this installation. */
export function isViewerDateRestrictionForInstallationAlias(alias: string): boolean {
    return getAccessLevelForInstallationAlias(alias) === 'viewer';
}

/** True if the user can open real-time for at least one installation (admin or any owner-scoped house). */
export function hasAnyRealTimeEligibleRole(): boolean {
    if (isAdminUser()) {
        return true;
    }
    const roles = getAuthRoles();
    return Boolean(roles.owner && roles.owner.trim() !== '');
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
