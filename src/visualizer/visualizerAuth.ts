import { getVisualizerApiBaseUrl } from './fetchVisualizerPlots';

export async function loginToVisualizer(username: string, password: string): Promise<void> {
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

    localStorage.setItem('token', data.access_token);
    localStorage.setItem('username', username.trim());
}

export function clearVisualizerAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
}

export function getVisualizerAuthToken(): string | null {
    return localStorage.getItem('token');
}
