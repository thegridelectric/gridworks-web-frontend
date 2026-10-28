import { z } from 'zod';
import { LeftRightDot, UtcMilliseconds, Uuid4Str } from '../formats';
import { DataChannelGt } from './DataChannelGt';
import { DerivedChannelGt } from './DerivedChannelGt';
import { GwStateMachine } from './GwStateMachine';
import { SpaceheatNodeGt } from './SpaceheatNodeGt';

/** Sema: https://schemas.electricity.works/types/layout.lite/013 */
export const LayoutLite = z
    .strictObject({
        FromGNodeAlias: LeftRightDot,
        CreatedMs: UtcMilliseconds,
        MessageId: Uuid4Str,
        HardwareLayoutTypeName: LeftRightDot,
        ZoneList: z.array(z.string()),
        CriticalZoneList: z.array(z.string()),
        ShNodes: z.array(SpaceheatNodeGt),
        DataChannels: z.array(DataChannelGt),
        DerivedChannels: z.array(DerivedChannelGt),
        StateMachines: z.array(GwStateMachine),
        TypeName: z.literal('layout.lite'),
        Version: z.literal('013'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (DcNodeConsistency) failed: a data channel names a node that is missing or has no active actor',
        path: ['DataChannels'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (NodeHandleHierarchyConsistency) failed: a dotted handle has no immediate boss node',
        path: ['ShNodes'],
    })
    .refine(checkAxiom3, {
        message: 'Axiom 3 (CriticalZoneSubset) failed: CriticalZoneList is not a subset of ZoneList',
        path: ['CriticalZoneList'],
    })
    .refine(checkAxiom4, {
        message: 'Axiom 4 (DerivedNodeConsistency) failed: a derived channel names a creator that is missing or has no active actor',
        path: ['DerivedChannels'],
    })
    .refine(checkAxiom5, {
        message: 'Axiom 5 (StateMachineNodeConsistency) failed: a state machine names a missing node or a node declared twice',
        path: ['StateMachines'],
    });
export type LayoutLite = z.infer<typeof LayoutLite>;

type Shape = {
    ZoneList: string[];
    CriticalZoneList: string[];
    ShNodes: { Name: string; Handle?: string; ActorClass: string }[];
    DataChannels: { AboutNodeName: string; CapturedByNodeName: string }[];
    DerivedChannels: { CreatedByNodeName: string }[];
    StateMachines: { NodeName: string }[];
};

function nodesByName(l: Shape): Map<string, Shape['ShNodes'][number]> {
    return new Map(l.ShNodes.map((n) => [n.Name, n]));
}

function checkAxiom1(l: Shape): boolean {
    const nodes = nodesByName(l);
    return l.DataChannels.every((c) => {
        const captured = nodes.get(c.CapturedByNodeName);
        return nodes.has(c.AboutNodeName) && captured !== undefined && captured.ActorClass !== 'NoActor';
    });
}

function checkAxiom2(l: Shape): boolean {
    const names = new Set(l.ShNodes.map((n) => n.Name));
    return l.ShNodes.every((n) => {
        if (n.Handle === undefined || !n.Handle.includes('.')) {
            return true;
        }
        const segments = n.Handle.split('.');
        return names.has(segments[segments.length - 2]);
    });
}

function checkAxiom3(l: Shape): boolean {
    const zones = new Set(l.ZoneList);
    return l.CriticalZoneList.every((z) => zones.has(z));
}

function checkAxiom4(l: Shape): boolean {
    const nodes = nodesByName(l);
    return l.DerivedChannels.every((c) => {
        const creator = nodes.get(c.CreatedByNodeName);
        return creator !== undefined && creator.ActorClass !== 'NoActor';
    });
}

function checkAxiom5(l: Shape): boolean {
    const names = new Set(l.ShNodes.map((n) => n.Name));
    const seen = new Set<string>();
    for (const m of l.StateMachines) {
        if (!names.has(m.NodeName) || seen.has(m.NodeName)) {
            return false;
        }
        seen.add(m.NodeName);
    }
    return true;
}
