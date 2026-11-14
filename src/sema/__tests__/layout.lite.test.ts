import { describe, expect, it } from 'vitest';
import beech011 from './fixtures/beech-layout.lite-011.json';
import elm013 from './fixtures/elm-layout.lite-013.json';
import { AnyLayoutLite } from '../types/AnyLayoutLite';
import { DataChannelGt } from '../types/DataChannelGt';
import { DerivedChannelGt } from '../types/DerivedChannelGt';
import { LayoutLite } from '../types/LayoutLite';
import { LayoutLite013 } from '../types/old_versions/LayoutLite013';
import { SpaceheatNodeGt } from '../types/SpaceheatNodeGt';

function firstIssue(result: { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }) {
    const issue = result.error.issues[0];
    return { path: issue.path.join('.'), message: issue.message };
}

/** The registry's layout.lite 014 example Tariff, on elm's 013 layout. */
const elm014 = {
    ...elm013,
    Tariff: {
        Alias: 'versant.a1.home.eco.bonus',
        DisplayName: 'Home Eco Rate with Bonus Meter',
        TimezoneStr: 'America/New_York',
        OnPeakWindows: [
            { Start: '07:00', End: '12:00', Days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], TypeName: 'gw.tou.window', Version: '000' },
            { Start: '16:00', End: '20:00', Days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], TypeName: 'gw.tou.window', Version: '000' },
        ],
        TypeName: 'gw.tou.tariff',
        Version: '000',
    },
    Version: '014',
};

describe('layout.lite 014', () => {
    it('parses elm with the registry example tariff and round-trips it', () => {
        const parsed = LayoutLite.parse(elm014);
        expect(parsed.Tariff.OnPeakWindows.length).toBe(2);
        expect(LayoutLite.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(elm014);
    });

    it('requires the tariff', () => {
        expect(LayoutLite.safeParse({ ...elm013, Version: '014' }).success).toBe(false);
    });

    it('resolves through AnyLayoutLite as the 014 word', () => {
        expect(AnyLayoutLite.parse(elm014).Version).toBe('014');
    });

    it('fails axiom 3 when a critical zone is not a zone', () => {
        const result = LayoutLite.safeParse({ ...elm014, CriticalZoneList: ['attic'] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstIssue(result).message).toMatch(/^Axiom 3 \(CriticalZoneSubset\) failed/);
        }
    });
});

describe('layout.lite 013', () => {
    it('parses elm, pulled from gridworks.layouts 2026-10-28', () => {
        const parsed = LayoutLite013.parse(elm013);
        expect(parsed.DataChannels.length).toBe(elm013.DataChannels.length);
        expect(parsed.DerivedChannels.length).toBe(elm013.DerivedChannels.length);
        expect(parsed.StateMachines.length).toBe(elm013.StateMachines.length);
    });

    it('round-trips elm unchanged', () => {
        const once = LayoutLite013.parse(elm013);
        expect(LayoutLite013.parse(JSON.parse(JSON.stringify(once)))).toEqual(elm013);
    });

    it('resolves through AnyLayoutLite as the 013 word', () => {
        const parsed = AnyLayoutLite.parse(elm013);
        expect(parsed.Version).toBe('013');
    });

    it('fails axiom 1 when a data channel is captured by a node with no actor', () => {
        const nodes = elm013.ShNodes.map((n) =>
            n.Name === elm013.DataChannels[0].CapturedByNodeName ? { ...n, ActorClass: 'NoActor', ActorHierarchyName: undefined } : n,
        );
        const result = LayoutLite013.safeParse({ ...elm013, ShNodes: nodes });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstIssue(result).message).toMatch(/^Axiom 1 \(DcNodeConsistency\) failed/);
        }
    });

    it('fails axiom 3 when a critical zone is not a zone', () => {
        const result = LayoutLite013.safeParse({ ...elm013, CriticalZoneList: ['attic'] });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstIssue(result)).toEqual({
                path: 'CriticalZoneList',
                message: expect.stringMatching(/^Axiom 3 \(CriticalZoneSubset\) failed/),
            });
        }
    });

    it('fails axiom 5 when two state machines share a node', () => {
        const machines = [...elm013.StateMachines, elm013.StateMachines[0]];
        const result = LayoutLite013.safeParse({ ...elm013, StateMachines: machines });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstIssue(result).message).toMatch(/^Axiom 5 \(StateMachineNodeConsistency\) failed/);
        }
    });
});

describe('data.channel.gt 004', () => {
    const hpEwt = elm013.DataChannels.find((c) => c.Name === 'hp-ewt')!;

    it('declares hp-ewt in CelsiusTimes100', () => {
        expect(DataChannelGt.parse(hpEwt).TelemetryName).toBe('CelsiusTimes100');
    });

    it('fails axiom 1 when Quantity disagrees with TelemetryName', () => {
        const result = DataChannelGt.safeParse({ ...hpEwt, Quantity: 'Power' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstIssue(result)).toEqual({
                path: 'Quantity',
                message: expect.stringMatching(/^Axiom 1 \(TelemetryQuantityConsistency\) failed/),
            });
        }
    });
});

describe('derived.channel.gt 003', () => {
    const tank1 = elm013.DerivedChannels.find((c) => c.Name === 'tank1-depth1')!;

    it('declares tank1-depth1 in FahrenheitX100', () => {
        expect(DerivedChannelGt.parse(tank1).OutputUnit).toBe('FahrenheitX100');
    });

    it('fails axiom 1 when an OnTrigger channel declares a period', () => {
        const result = DerivedChannelGt.safeParse({ ...tank1, EmissionMethod: 'OnTrigger', EmitPeriodS: 60 });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstIssue(result).message).toMatch(/^Axiom 1 \(EmissionSemanticsConsistency\) failed/);
        }
    });

    it('fails axiom 2 when OutputQuantity disagrees with OutputUnit', () => {
        const result = DerivedChannelGt.safeParse({ ...tank1, OutputQuantity: 'Power' });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstIssue(result).message).toMatch(/^Axiom 2 \(OutputUnitQuantityConsistency\) failed/);
        }
    });
});

describe('spaceheat.node.gt 303', () => {
    const relay = elm013.ShNodes.find((n) => n.Handle !== undefined && n.Handle.includes('.'))!;

    it('fails axiom 2 when the handle does not end with the name', () => {
        const result = SpaceheatNodeGt.safeParse({ ...relay, Handle: `${relay.Handle}.other` });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstIssue(result).path).toBe('Handle');
        }
    });

    it('keeps a field the word does not declare, as additionalProperties allows', () => {
        const parsed = SpaceheatNodeGt.parse({ ...relay, Extra: 'kept' });
        expect((parsed as Record<string, unknown>).Extra).toBe('kept');
    });
});

describe('layout.lite 011 reader', () => {
    it('reads beech, pulled from gridworks.layouts 2026-10-28, through AnyLayoutLite', () => {
        const parsed = AnyLayoutLite.parse(beech011);
        expect(parsed.Version).toBe('011');
        expect(parsed.DataChannels.length).toBe(beech011.DataChannels.length);
    });

    it('declares beech temperatures in WaterTempCTimes1000', () => {
        const parsed = AnyLayoutLite.parse(beech011);
        const hpEwt = parsed.DataChannels.find((c) => c.Name === 'hp-ewt');
        expect(hpEwt?.TelemetryName).toBe('WaterTempCTimes1000');
    });

    it('decodes a 011 data channel with a telemetry name the 006 enum lacks to Unknown', () => {
        const channels = [{ ...beech011.DataChannels[0], TelemetryName: 'BinaryState' }];
        const parsed = AnyLayoutLite.parse({ ...beech011, DataChannels: channels });
        expect(parsed.DataChannels[0].TelemetryName).toBe('Unknown');
    });
});
