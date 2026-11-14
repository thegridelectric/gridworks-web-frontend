/** The axioms layout.lite states at every version the browser reads
 *  whole, on the fields every such version has. */
export type LayoutShape = {
    ZoneList: string[];
    CriticalZoneList: string[];
    ShNodes: { Name: string; Handle?: string; ActorClass: string }[];
    DataChannels: { AboutNodeName: string; CapturedByNodeName: string }[];
    DerivedChannels: { CreatedByNodeName: string }[];
    StateMachines: { NodeName: string }[];
};

export function nodesByName(l: LayoutShape): Map<string, LayoutShape['ShNodes'][number]> {
    return new Map(l.ShNodes.map((n) => [n.Name, n]));
}

export function checkAxiom1(l: LayoutShape): boolean {
    const nodes = nodesByName(l);
    return l.DataChannels.every((c) => {
        const captured = nodes.get(c.CapturedByNodeName);
        return nodes.has(c.AboutNodeName) && captured !== undefined && captured.ActorClass !== 'NoActor';
    });
}

export function checkAxiom2(l: LayoutShape): boolean {
    const names = new Set(l.ShNodes.map((n) => n.Name));
    return l.ShNodes.every((n) => {
        if (n.Handle === undefined || !n.Handle.includes('.')) {
            return true;
        }
        const segments = n.Handle.split('.');
        return names.has(segments[segments.length - 2]);
    });
}

export function checkAxiom3(l: LayoutShape): boolean {
    const zones = new Set(l.ZoneList);
    return l.CriticalZoneList.every((z) => zones.has(z));
}

export function checkAxiom4(l: LayoutShape): boolean {
    const nodes = nodesByName(l);
    return l.DerivedChannels.every((c) => {
        const creator = nodes.get(c.CreatedByNodeName);
        return creator !== undefined && creator.ActorClass !== 'NoActor';
    });
}

export function checkAxiom5(l: LayoutShape): boolean {
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

export const LAYOUT_AXIOMS = [
    [checkAxiom1, 'Axiom 1 (DcNodeConsistency) failed: a data channel names a node that is missing or has no active actor', 'DataChannels'],
    [checkAxiom2, 'Axiom 2 (NodeHandleHierarchyConsistency) failed: a dotted handle has no immediate boss node', 'ShNodes'],
    [checkAxiom3, 'Axiom 3 (CriticalZoneSubset) failed: CriticalZoneList is not a subset of ZoneList', 'CriticalZoneList'],
    [checkAxiom4, 'Axiom 4 (DerivedNodeConsistency) failed: a derived channel names a creator that is missing or has no active actor', 'DerivedChannels'],
    [checkAxiom5, 'Axiom 5 (StateMachineNodeConsistency) failed: a state machine names a missing node or a node declared twice', 'StateMachines'],
] as const;
