/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_VISUALIZER_API_URL?: string;
    /** When set, session requests go here; otherwise production uses the static Pages origin (404 → fallback). */
    readonly VITE_GRIDWORKS_API_BASE_URL?: string;
    /** A JSON object of installation GNode alias to weather bundle name, for houses the fleet's table does not hold. */
    readonly VITE_HOUSE_WEATHER_BUNDLES?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
