const AUTH_TOKEN_KEY = 'token';

export interface LoginResponseBody {
    access_token: string;
    token_type: string;
}


export async function login(username: string, password: string): Promise<void> {

    clearAuth();

    // const base = getVisualizerApiBaseUrl();
    const base = 'http://localhost:8000'
    const loginUrl = `${base}/api/v2/sessions`;
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

    localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
}

export function clearAuth(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

/** Verify the stored token with the API; clears auth and throws if invalid or unreachable. */
export async function validateAuthSession(): Promise<string> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Not signed in');
    }

    const base = getVisualizerApiBaseUrl();
    let res: Response;
    try {
        res = await fetch(`${base}/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch {
        clearAuth();
        throw new Error('Could not reach the API');
    }

    if (res.status === 401) {
        clearAuth();
        throw new Error('Session expired');
    }
    if (!res.ok) {
        clearAuth();
        throw new Error(`Session check failed (${res.status})`);
    }

    const data = JSON.parse(await res.text()) as { username?: string };
    const username =
        typeof data.username === 'string' && data.username.trim() !== ''
            ? data.username.trim()
            : getAuthUsername();
    if (username) {
        localStorage.setItem(AUTH_USERNAME_KEY, username);
    }
    return username ?? '';
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

// export function getAuthUsername(): string | null {
//     return localStorage.getItem(AUTH_USERNAME_KEY);
// }

// export function getDisplayUserName(): string {
//     return getAuthUsername() ?? '';
// }

// /** Roles from login only (persisted). Keys are role names, values are installation strings. */
// export function getAuthRoles(): AuthRolesMap {
//     const raw = localStorage.getItem(AUTH_ROLES_KEY);
//     if (!raw) {
//         return {};
//     }
//     try {
//         const parsed = JSON.parse(raw) as unknown;
//         const roles = parseRoles(parsed);
//         return roles ?? {};
//     } catch {
//         return {};
//     }
// }

// function hasRole(roleName: string): boolean {
//     const key = roleName.trim().toLowerCase();
//     return Object.prototype.hasOwnProperty.call(getAuthRoles(), key);
// }

// export function isAdminUser(): boolean {
//     return hasRole('admin');
// }

// /**
//  * Account has only viewer roles (no owner, no admin). Used when no installation
//  * context is available for date lookback (fallback: apply viewer restriction).
//  */
// export function isViewerUser(): boolean {
//     return hasRole('viewer') && !hasRole('owner') && !hasRole('admin');
// }

// export function normalizeInstallationAlias(alias: string): string {
//     return alias.trim().toLowerCase();
// }

// /**
//  * Effective access for a house alias from the role → installation map.
//  * If both `owner` and `viewer` map to the same alias, owner wins.
//  */
// export function getAccessLevelForInstallationAlias(alias: string): 'admin' | 'owner' | 'viewer' | null {
//     const n = normalizeInstallationAlias(alias);
//     if (!n) {
//         return null;
//     }
//     if (isAdminUser()) {
//         return 'admin';
//     }
//     const roles = getAuthRoles();
//     let matchedOwner = false;
//     let matchedViewer = false;
//     for (const [role, inst] of Object.entries(roles)) {
//         if (role === 'admin') {
//             continue;
//         }
//         if (normalizeInstallationAlias(inst) !== n) {
//             continue;
//         }
//         if (role === 'owner') {
//             matchedOwner = true;
//         }
//         if (role === 'viewer') {
//             matchedViewer = true;
//         }
//     }
//     if (matchedOwner) {
//         return 'owner';
//     }
//     if (matchedViewer) {
//         return 'viewer';
//     }
//     return null;
// }

// /** Real-time dashboard: owner or admin for that installation. */
// export function hasRealTimeAccessForInstallationAlias(alias: string): boolean {
//     const level = getAccessLevelForInstallationAlias(alias);
//     return level === 'admin' || level === 'owner';
// }

// /** Apply 10-day end-date rule for queries scoped to this installation. */
// export function isViewerDateRestrictionForInstallationAlias(alias: string): boolean {
//     return getAccessLevelForInstallationAlias(alias) === 'viewer';
// }

// /** True if the user can open real-time for at least one installation (admin or any owner-scoped house). */
// export function hasAnyRealTimeEligibleRole(): boolean {
//     if (isAdminUser()) {
//         return true;
//     }
//     const roles = getAuthRoles();
//     return Boolean(roles.owner && roles.owner.trim() !== '');
// }

// /** Installation aliases the user may access (all non-admin role values). Admins ignore this list. */
// export function getAuthUserInstallations(): string[] {
//     const roles = getAuthRoles();
//     const set = new Set<string>();
//     for (const [role, inst] of Object.entries(roles)) {
//         if (role === 'admin') {
//             continue;
//         }
//         const a = inst.trim().toLowerCase();
//         if (a) {
//             set.add(a);
//         }
//     }
//     return Array.from(set);
// }
