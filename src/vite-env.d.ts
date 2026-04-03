/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_VISUALIZER_API_URL?: string;
    /** When set, session requests go here; otherwise production uses the static Pages origin (404 → fallback). */
    readonly VITE_GRIDWORKS_API_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
