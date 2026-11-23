import axios from 'axios';

function gridWorksApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    // The dev server proxies /api. Use the host that served the page so a
    // browser opened on another machine does not call its own localhost.
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'http://localhost:5173';
  }
  const fromEnv = import.meta.env.VITE_GRIDWORKS_API_BASE_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return fromEnv.replace(/\/$/, '');
  }
  const pathBase = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${window.location.origin}${pathBase}`;
}

const api = axios.create({
  baseURL: gridWorksApiBaseUrl(),
  timeout: 10_000
});

export default api;
