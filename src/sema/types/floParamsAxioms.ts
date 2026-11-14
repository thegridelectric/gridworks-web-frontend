/** The axioms flo.params states at every version, on the fields every
 *  version has. Axiom 1 (StepListLengths) names the price list, which each
 *  version spells its own way, so each version states it beside its
 *  schema. */
export type ParamsShape = {
    InitialThermocline1: number;
    InitialThermocline2: number;
    TempSensorsPerTank: number;
    TanksModeled: number;
    SeasonalStorageMode: 'AllTanks' | 'BufferOnly';
    PriceMinUsdMwh: number;
    PriceMaxUsdMwh: number;
    PreviousOptimalPath?: unknown;
    PreviousEstimateElecUsdMwhNow?: number;
};

export function sameLength(stepDurationMinutes: number[], lists: number[][]): boolean {
    const n = stepDurationMinutes.length;
    return n > 0 && lists.every((l) => l.length === n);
}

export function checkAxiom2(p: ParamsShape): boolean {
    return p.InitialThermocline1 <= p.InitialThermocline2 && p.InitialThermocline2 <= p.TempSensorsPerTank * p.TanksModeled;
}

export function checkAxiom3(p: ParamsShape): boolean {
    return p.SeasonalStorageMode !== 'BufferOnly' || p.TanksModeled === 1;
}

export function checkAxiom4(p: ParamsShape): boolean {
    return p.PriceMinUsdMwh < p.PriceMaxUsdMwh;
}

export function checkAxiom5(p: ParamsShape): boolean {
    return (p.PreviousOptimalPath === undefined) === (p.PreviousEstimateElecUsdMwhNow === undefined);
}

/** The refinements shared by every version, in axiom order from 2. */
export const SHARED_PARAMS_AXIOMS: [(p: ParamsShape) => boolean, string, string][] = [
    [checkAxiom2, 'Axiom 2 (ThermoclinesWithinTheStore) failed: a thermocline is out of order or below the store', 'InitialThermocline1'],
    [checkAxiom3, 'Axiom 3 (BufferIsOneTank) failed: BufferOnly models more than one tank', 'TanksModeled'],
    [checkAxiom4, 'Axiom 4 (PriceBounds) failed: PriceMinUsdMwh is not below PriceMaxUsdMwh', 'PriceMinUsdMwh'],
    [
        checkAxiom5,
        'Axiom 5 (PreviousRunTogether) failed: PreviousOptimalPath and PreviousEstimateElecUsdMwhNow are not both present or both absent',
        'PreviousOptimalPath',
    ],
];
