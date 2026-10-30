import { z } from 'zod';
import { ActorClass } from '../enums/ActorClass';
import { HandleName, PositiveInt, SpaceheatName, Uuid4Str } from '../formats';

/** Sema: https://schemas.electricity.works/types/spaceheat.node.gt/303 */
export const SpaceheatNodeGt = z
    .looseObject({
        Name: SpaceheatName,
        ActorHierarchyName: HandleName.optional(),
        Handle: HandleName.optional(),
        ActorClass: ActorClass,
        DisplayName: z.string().optional(),
        ComponentId: Uuid4Str.optional(),
        BoardComponentId: Uuid4Str.optional(),
        NameplatePowerW: PositiveInt.optional(),
        ShNodeId: Uuid4Str,
        TypeName: z.literal('spaceheat.node.gt'),
        Version: z.literal('303'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (ActorHierarchyConstraints) failed: ActorHierarchyName does not fit ActorClass and Name',
        path: ['ActorHierarchyName'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (HandleConstraints) failed: Handle must end with Name and have unique segments',
        path: ['Handle'],
    });
export type SpaceheatNodeGt = z.infer<typeof SpaceheatNodeGt>;

function endsWithNameUniquely(dotted: string, name: string): boolean {
    const segments = dotted.split('.');
    return segments[segments.length - 1] === name && new Set(segments).size === segments.length;
}

function checkAxiom1(n: { Name: string; ActorClass: ActorClass; ActorHierarchyName?: string }): boolean {
    if (n.ActorClass === 'NoActor') {
        return n.ActorHierarchyName === undefined;
    }
    if (n.ActorHierarchyName === undefined) {
        return n.ActorClass === 'PrimaryScada' || n.ActorClass === 'SecondaryScada';
    }
    return endsWithNameUniquely(n.ActorHierarchyName, n.Name);
}

function checkAxiom2(n: { Name: string; Handle?: string }): boolean {
    return n.Handle === undefined || endsWithNameUniquely(n.Handle, n.Name);
}
