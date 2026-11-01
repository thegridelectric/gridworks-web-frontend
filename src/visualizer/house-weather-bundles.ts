/** The weather bundle each house's scada reads its forecast from.
 *
 *  Hand-kept while the fleet is in staging. The fact is the scada's
 *  `gw.operational.params` field `WeatherBundleName`; once the params
 *  are journaled the backend resolves a house to its bundle from the
 *  newest params and this table goes. Keyed by the installation's GNode
 *  alias, the key the visualizer page has. */
const HOUSE_WEATHER_BUNDLES: Record<string, string> = {
    'hw1.isone.me.versant.keene.beech': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.elm': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.fir': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.maple': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.oak': 'us.me.millinocket.moose',
    'hw1.isone.me.versant.keene.spruce': 'us.me.millinocket.moose',
};

/** The bundle name for a house, or null for a house the table does not know. */
export function houseWeatherBundle(installationGNode: string): string | null {
    return HOUSE_WEATHER_BUNDLES[installationGNode] ?? null;
}
