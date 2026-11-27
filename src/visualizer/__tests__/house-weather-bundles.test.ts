import { afterEach, describe, expect, it, vi } from 'vitest';

const SIM_HOUSE = 'd1.isone.me.versant.keene.beech';
const FLEET_HOUSE = 'hw1.isone.me.versant.keene.beech';

async function lookupWith(fromEnv: string | undefined) {
    vi.resetModules();
    if (fromEnv !== undefined) {
        vi.stubEnv('VITE_HOUSE_WEATHER_BUNDLES', fromEnv);
    }
    return (await import('../house-weather-bundles')).houseWeatherBundle;
}

describe('houseWeatherBundle', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('knows the fleet and no other house when the deployment names none', async () => {
        for (const fromEnv of [undefined, '']) {
            const houseWeatherBundle = await lookupWith(fromEnv);
            expect(houseWeatherBundle(FLEET_HOUSE)).toBe('us.me.millinocket.moose');
            expect(houseWeatherBundle(SIM_HOUSE)).toBeNull();
        }
    });

    it('knows a house the deployment names, beside the fleet', async () => {
        const houseWeatherBundle = await lookupWith(
            JSON.stringify({ [SIM_HOUSE]: 'us.me.millinocket.raccoon' }),
        );
        expect(houseWeatherBundle(SIM_HOUSE)).toBe('us.me.millinocket.raccoon');
        expect(houseWeatherBundle(FLEET_HOUSE)).toBe('us.me.millinocket.moose');
    });

    it('refuses what is not an object of alias to bundle name', async () => {
        for (const fromEnv of ['[]', 'null', '"moose"', `{"${SIM_HOUSE}": 3}`, 'not json']) {
            await expect(lookupWith(fromEnv)).rejects.toThrow();
        }
    });
});
