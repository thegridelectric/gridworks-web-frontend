import { z } from 'zod';

/** Sema: https://schemas.electricity.works/types/flo.path.penalties.bruce/001 */
export const FloPathPenaltiesBruce = z
    .strictObject({
        RswtPenaltyUsdList: z.array(z.number()),
        UnmetLoadPenaltyUsdList: z.array(z.number()),
        StabilityPenaltyUsdList: z.array(z.number()),
        ShortCyclePenaltyUsdList: z.array(z.number()),
        TerminalCostUsd: z.number(),
        TerminalCostEmptyStoreUsd: z.number(),
        PathCostUsd: z.number(),
        TypeName: z.literal('flo.path.penalties.bruce'),
        Version: z.literal('001'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (PenaltyListLengths) failed: the penalty lists differ in length',
        path: ['RswtPenaltyUsdList'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (TerminalCostBound) failed: TerminalCostUsd is above TerminalCostEmptyStoreUsd',
        path: ['TerminalCostUsd'],
    });
export type FloPathPenaltiesBruce = z.infer<typeof FloPathPenaltiesBruce>;

type Shape = {
    RswtPenaltyUsdList: number[];
    UnmetLoadPenaltyUsdList: number[];
    StabilityPenaltyUsdList: number[];
    ShortCyclePenaltyUsdList: number[];
    TerminalCostUsd: number;
    TerminalCostEmptyStoreUsd: number;
};

function checkAxiom1(p: Shape): boolean {
    const n = p.RswtPenaltyUsdList.length;
    return (
        p.UnmetLoadPenaltyUsdList.length === n
        && p.StabilityPenaltyUsdList.length === n
        && p.ShortCyclePenaltyUsdList.length === n
    );
}

function checkAxiom2(p: Shape): boolean {
    return p.TerminalCostUsd <= p.TerminalCostEmptyStoreUsd;
}
