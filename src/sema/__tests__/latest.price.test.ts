import { describe, expect, it } from 'vitest';
import example from './fixtures/registry-example-latest.price-001.json';
import { LatestPrice, slotStartS } from '../types/LatestPrice';

function firstMessage(result: { success: false; error: { issues: { message: string }[] } }): string {
    return result.error.issues[0].message;
}

describe('latest.price 001', () => {
    it('parses the registry example unchanged and reads its slot start', () => {
        const parsed = LatestPrice.parse(example);
        expect(parsed).toEqual(example);
        expect(slotStartS(parsed)).toBe(1794412800);
    });

    it('fails axiom 1 when the components are empty or do not sum to the price', () => {
        const empty = LatestPrice.safeParse({ ...example, Components: [], TariffAlias: undefined });
        expect(empty.success).toBe(false);
        if (!empty.success) expect(firstMessage(empty)).toMatch(/^Axiom 1 \(ComponentsSumToPrice, clause a\)/);
        const off = LatestPrice.safeParse({ ...example, PriceX1000: example.PriceX1000 + 1 });
        expect(off.success).toBe(false);
        if (!off.success) expect(firstMessage(off)).toMatch(/^Axiom 1 \(ComponentsSumToPrice, clause b\)/);
    });

    it('fails axiom 2 when a named component repeats, and lets Unknown repeat', () => {
        const [energy, congestion, ...rest] = example.Components;
        const twice = LatestPrice.safeParse({ ...example, Components: [energy, { ...congestion, Name: 'WholesaleEnergy' }, ...rest] });
        expect(twice.success).toBe(false);
        if (!twice.success) expect(firstMessage(twice)).toMatch(/^Axiom 2/);
        const unknowns = { ...example, Components: [{ ...energy, Name: 'Unknown' }, { ...congestion, Name: 'Unknown' }, ...rest] };
        expect(LatestPrice.parse(unknowns)).toEqual(unknowns);
    });

    it('fails axiom 3 when the tariff and the Delivery part do not come together', () => {
        const noTariff = LatestPrice.safeParse({ ...example, TariffAlias: undefined });
        expect(noTariff.success).toBe(false);
        if (!noTariff.success) expect(firstMessage(noTariff)).toMatch(/^Axiom 3/);
        const noDelivery = LatestPrice.safeParse({
            ...example,
            Components: [{ Name: 'WholesaleEnergy', PriceX1000: example.PriceX1000, TypeName: 'price.component', Version: '000' }],
        });
        expect(noDelivery.success).toBe(false);
        if (!noDelivery.success) expect(firstMessage(noDelivery)).toMatch(/^Axiom 3/);
    });

    it('decodes a part name a later enum version added to Unknown', () => {
        const parsed = LatestPrice.parse({
            ...example,
            Components: [{ ...example.Components[0], Name: 'SomethingNew', PriceX1000: example.PriceX1000 }],
            TariffAlias: undefined,
        });
        expect(parsed.Components[0].Name).toBe('Unknown');
    });
});
