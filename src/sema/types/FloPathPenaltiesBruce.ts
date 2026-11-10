import { z } from 'zod';

/** Sema: https://schemas.electricity.works/types/flo.path.penalties.bruce/000 */
export const FloPathPenaltiesBruce = z
    .strictObject({
        RswtPenaltyUsdList: z.array(z.number()),
        StabilityPenaltyUsdList: z.array(z.number()),
        ShortCyclePenaltyUsdList: z.array(z.number()),
        TerminalCostUsd: z.number(),
        TerminalCostEmptyStoreUsd: z.number(),
        PathCostUsd: z.number(),
        TypeName: z.literal('flo.path.penalties.bruce'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (PenaltyListLengths) failed: the three penalty lists differ in length',
        path: ['RswtPenaltyUsdList'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (TerminalCostBound) failed: TerminalCostUsd is above TerminalCostEmptyStoreUsd',
        path: ['TerminalCostUsd'],
    });
export type FloPathPenaltiesBruce = z.infer<typeof FloPathPenaltiesBruce>;

type Shape = {
    RswtPenaltyUsdList: number[];
    StabilityPenaltyUsdList: number[];
    ShortCyclePenaltyUsdList: number[];
    TerminalCostUsd: number;
    TerminalCostEmptyStoreUsd: number;
};

function checkAxiom1(p: Shape): boolean {
    const n = p.RswtPenaltyUsdList.length;
    return p.StabilityPenaltyUsdList.length === n && p.ShortCyclePenaltyUsdList.length === n;
}

function checkAxiom2(p: Shape): boolean {
    return p.TerminalCostUsd <= p.TerminalCostEmptyStoreUsd;
}
