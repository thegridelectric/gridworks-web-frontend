import { jwtDecode } from "jwt-decode";
import GridWorksApi from '../_util/GridWorksApi';

const AUTH_TOKEN_KEY = 'token';

export interface LoginResponseBody {
    access_token: string;
    token_type: string;
}

export async function login(username: string, password: string): Promise<void> {

    clearAuth();

    try {
        const sessionResponse = await GridWorksApi.post<LoginResponseBody>('/api/v2/sessions', new URLSearchParams({
            username: username.trim(),
            password,
        }));

        if (!sessionResponse.data.access_token) {
            throw new Error('Login response did not include access_token');
        }

        localStorage.setItem(AUTH_TOKEN_KEY, sessionResponse.data.access_token);
    }
    catch {
        throw new Error('Invalid username or password');
    }
}

export function clearAuth(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function parseUsernameFromAuthToken(authToken: string): string {
    const parsed = jwtDecode(authToken);
    return parsed.sub!;
}

export function getRequiredAuthToken(): string {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Expected auth token for protected route');
    }
    return token;
}
