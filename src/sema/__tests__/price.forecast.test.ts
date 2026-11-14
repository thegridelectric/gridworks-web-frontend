import { describe, expect, it } from 'vitest';
import { PriceForecast } from '../types/PriceForecast';

/** The registry's gw.price.forecast 000 example. */
export const forecast = {
    FromGNodeAlias: 'hw1.price',
    MarketMakerAlias: 'hw1.isone.me.versant.keene',
    ProductName: 'rt60gate5',
    ForecastUid: '0b6f4c1e-5a3d-4e9b-8f27-6c1d2e3f4a5b',
    CreatedMs: 1794420660000,
    SlotStartS: [1794423600, 1794427200, 1794430800],
    PriceUnit: 'USDPerMWh',
    PriceX1000List: [628052, 99876, 98806],
    TypeName: 'gw.price.forecast',
    Version: '000',
};

function firstMessage(result: { success: false; error: { issues: { message: string }[] } }): string {
    return result.error.issues[0].message;
}

describe('gw.price.forecast 000', () => {
    it('parses the registry example unchanged', () => {
        expect(PriceForecast.parse(forecast)).toEqual(forecast);
    });

    it('fails axiom 1 when the slots are empty, out of order or off the grid', () => {
        for (const [slots, clause] of [
            [[], 'a'],
            [[1794427200, 1794423600, 1794430800], 'b'],
            [[1794423600, 1794427200, 1794430801], 'c'],
        ] as const) {
            const result = PriceForecast.safeParse({ ...forecast, SlotStartS: slots, PriceX1000List: slots.map(() => 1) });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(firstMessage(result)).toMatch(new RegExp(`^Axiom 1 \\(SlotGrid, clause ${clause}\\) failed`));
            }
        }
    });

    it('fails axiom 2 when a slot has no price', () => {
        const result = PriceForecast.safeParse({ ...forecast, PriceX1000List: [628052, 99876] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstMessage(result)).toMatch(/^Axiom 2 \(OnePricePerSlot\) failed/);
        }
    });

    it('decodes a product a later enum version appended to unknown', () => {
        expect(PriceForecast.parse({ ...forecast, ProductName: 'rt60gate0' }).ProductName).toBe('unknown');
    });
});
