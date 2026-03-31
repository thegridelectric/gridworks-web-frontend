import { getVisualizerApiBaseUrl } from '../visualizer/fetchVisualizerPlots';

const AUTH_TOKEN_KEY = 'token';
const AUTH_USERNAME_KEY = 'username';

export async function login(username: string, password: string): Promise<void> {
    const base = getVisualizerApiBaseUrl();
    const res = await fetch(`${base}/login`, {
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

    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
        throw new Error('Login response did not include access_token');
    }

    localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    localStorage.setItem(AUTH_USERNAME_KEY, username.trim());
}

export function clearAuth(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USERNAME_KEY);
}

export function getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getAuthUsername(): string | null {
    return localStorage.getItem(AUTH_USERNAME_KEY);
}

export function getDisplayUserName(): string {
    return getAuthUsername() || 'Visualizer user';
}

export function isAdminUser(): boolean {
    const username = getAuthUsername() || '';
    return username.trim().toLowerCase() === 'admin';
}
