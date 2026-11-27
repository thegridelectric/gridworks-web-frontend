/** The weather bundle each house's scada reads its forecast from.
 *
 *  Hand-kept while the fleet is in staging. The fact is the scada's
 *  `gw.operational.params` field `WeatherBundleName`; once the params
 *  are journaled the backend resolves a house to its bundle from the
 *  newest params and this table goes. Keyed by the installation's GNode
 *  alias, the key the visualizer page has. */
const FLEET_WEATHER_BUNDLES: Record<string, string> = {
    'hw1.isone.me.versant.keene.beech': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.elm': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.fir': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.maple': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.oak': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.spruce': 'us.me.millinocket.moose',
};

/** The houses a deployment names for itself in `VITE_HOUSE_WEATHER_BUNDLES`:
 *  a JSON object of installation GNode alias to bundle name, for houses
 *  the fleet's table does not hold. Unset or empty names none. */
function deploymentWeatherBundles(fromEnv: string | undefined): Record<string, string> {
    if (!fromEnv) {
        return {};
    }
    const parsed: unknown = JSON.parse(fromEnv);
    if (
        parsed === null
        || typeof parsed !== 'object'
        || Array.isArray(parsed)
        || !Object.values(parsed).every((bundleName) => typeof bundleName === 'string')
    ) {
        throw new Error(
            'VITE_HOUSE_WEATHER_BUNDLES must be a JSON object of installation GNode alias to bundle name',
        );
    }
    return parsed as Record<string, string>;
}

const HOUSE_WEATHER_BUNDLES: Record<string, string> = {
    ...FLEET_WEATHER_BUNDLES,
    ...deploymentWeatherBundles(import.meta.env.VITE_HOUSE_WEATHER_BUNDLES),
};

/** The bundle name for a house, or null for a house neither the fleet's
 *  table nor the deployment knows. */
export function houseWeatherBundle(installationGNode: string): string | null {
    return HOUSE_WEATHER_BUNDLES[installationGNode] ?? null;
}
