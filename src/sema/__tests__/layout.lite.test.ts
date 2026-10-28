import { describe, expect, it } from 'vitest';
import beech011 from './fixtures/beech-layout.lite-011.json';
import elm013 from './fixtures/elm-layout.lite-013.json';
import { AnyLayoutLite } from '../types/AnyLayoutLite';
import { DataChannelGt } from '../types/DataChannelGt';
import { DerivedChannelGt } from '../types/DerivedChannelGt';
import { LayoutLite } from '../types/LayoutLite';
import { SpaceheatNodeGt } from '../types/SpaceheatNodeGt';

function firstIssue(result: { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }) {
    const issue = result.error.issues[0];
    return { path: issue.path.join('.'), message: issue.message };
}

describe('layout.lite 013', () => {
    it('parses elm, pulled from gridworks.layouts 2026-10-28', () => {
        const parsed = LayoutLite.parse(elm013);
        expect(parsed.DataChannels.length).toBe(elm013.DataChannels.length);
        expect(parsed.DerivedChannels.length).toBe(elm013.DerivedChannels.length);
        expect(parsed.StateMachines.length).toBe(elm013.StateMachines.length);
    });

    it('round-trips elm unchanged', () => {
        const once = LayoutLite.parse(elm013);
        expect(LayoutLite.parse(JSON.parse(JSON.stringify(once)))).toEqual(elm013);
    });

    it('resolves through AnyLayoutLite as the 013 word', () => {
        const parsed = AnyLayoutLite.parse(elm013);
        expect(parsed.Version).toBe('013');
    });

    it('fails axiom 1 when a data channel is captured by a node with no actor', () => {
        const nodes = elm013.ShNodes.map((n) =>
            n.Name === elm013.DataChannels[0].CapturedByNodeName ? { ...n, ActorClass: 'NoActor', ActorHierarchyName: undefined } : n,
        );
        const result = LayoutLite.safeParse({ ...elm013, ShNodes: nodes });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(firstIssue(result).message).toMatch(/^Axiom 1 \(DcNodeConsistency\) failed/);
        }
    });

    it('fails axiom 3 when a critical zone is not a zone', () => {
        const result = LayoutLite.safeParse({ ...elm013, CriticalZoneList: ['attic'] });
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
        const result = LayoutLite.safeParse({ ...elm013, StateMachines: machines });
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

    it('rejects a 011 data channel with a telemetry name the 006 enum lacks', () => {
        const channels = [{ ...beech011.DataChannels[0], TelemetryName: 'BinaryState' }];
        expect(AnyLayoutLite.safeParse({ ...beech011, DataChannels: channels }).success).toBe(false);
    });
});
