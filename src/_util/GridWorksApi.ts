import axios from 'axios';

function gridWorksApiBaseUrl(): string {
  if (import.meta.env.DEV) {
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
  timeout: 5000
});

export default api;
