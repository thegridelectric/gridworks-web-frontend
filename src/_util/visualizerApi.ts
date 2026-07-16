export function getVisualizerApiBaseUrl(): string {
    const fromEnv = import.meta.env.VITE_VISUALIZER_API_URL;
    if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
        return fromEnv.replace(/\/$/, '');
    }
    return 'https://web-backend.electricity.works';
}

export function getDashboardWebSocketBaseUrl(): string {
    // if (import.meta.env.DEV) {
    //     return 'http://localhost:5173';
    // }
    const fromEnv = import.meta.env.VITE_GRIDWORKS_WS_BASE_URL;
    if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
        return fromEnv.replace(/\/$/, '');
    }
    const pathBase = import.meta.env.BASE_URL.replace(/\/$/, '');
    return `${window.location.origin}${pathBase}`;

}
