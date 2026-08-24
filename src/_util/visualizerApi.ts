export function getVisualizerApiBaseUrl(): string {
    const fromEnv = import.meta.env.VITE_VISUALIZER_API_URL;
    if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
        return fromEnv.replace(/\/$/, '');
    }
    return 'https://web-backend.electricity.works';
}

const DASHBOARD_WS_ORIGIN = 'wss://web-backend.electricity.works';

export function getDashboardWebSocketUrl(shortAlias: string): string {
    return `${DASHBOARD_WS_ORIGIN}/realtime/${shortAlias}`;
}
