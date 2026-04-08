import { getVisualizerApiBaseUrl } from '../_util/visualizerApi';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USERNAME_KEY = 'username';
const AUTH_USER_TYPE_KEY = 'user_type';
const AUTH_USER_INSTALLATIONS_KEY = 'user_installations';

const ALLOWED_USER_TYPES = new Set(['admin', 'viewer', 'owner'] as const);
type UserType = 'admin' | 'viewer' | 'owner';

function parseUserType(value: unknown): UserType | null {
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim().toLowerCase();
    return ALLOWED_USER_TYPES.has(normalized as UserType) ? (normalized as UserType) : null;
}

function parseUserInstallations(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const normalized = value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.length > 0);
    return Array.from(new Set(normalized));
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

    const rawBody = await res.text();
    console.log('[auth] Login request URL:', loginUrl);
    console.log('[auth] Login response status:', res.status);
    console.log('[auth] Login response raw body:', rawBody);

    const data = JSON.parse(rawBody) as {
        access_token?: string;
        user_type?: unknown;
        username?: unknown;
        user_installations?: unknown;
        token_type?: unknown;
    };
    console.log('[auth] Login response payload:', data);
    console.log('[auth] Login response keys:', Object.keys(data));
    if (!data.access_token) {
        throw new Error('Login response did not include access_token');
    }
    const userType = parseUserType(data.user_type);
    if (!userType) {
        clearAuth();
        throw new Error('Your account is not permitted to sign in.');
    }
    const userInstallations = parseUserInstallations(data.user_installations);

    localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    localStorage.setItem(AUTH_USERNAME_KEY, username.trim());
    localStorage.setItem(AUTH_USER_TYPE_KEY, userType);
    localStorage.setItem(AUTH_USER_INSTALLATIONS_KEY, JSON.stringify(userInstallations));
}

export function clearAuth(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USERNAME_KEY);
    localStorage.removeItem(AUTH_USER_TYPE_KEY);
    localStorage.removeItem(AUTH_USER_INSTALLATIONS_KEY);
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

export function getAuthUserType(): UserType | null {
    return parseUserType(localStorage.getItem(AUTH_USER_TYPE_KEY));
}

export function getAuthUserInstallations(): string[] {
    const raw = localStorage.getItem(AUTH_USER_INSTALLATIONS_KEY);
    if (!raw) {
        return [];
    }
    try {
        return parseUserInstallations(JSON.parse(raw));
    } catch {
        return [];
    }
}

export function isAdminUser(): boolean {
    return getAuthUserType() === 'admin';
}

export function isViewerUser(): boolean {
    return getAuthUserType() === 'viewer';
}
