import type { FloOptimalPath } from './FloOptimalPath';
import type { PriceQuantityUnitless } from './PriceQuantityUnitless';

/** The axioms flo.recommendation states at every version, on the fields
 *  every version has. */
export type RecommendationShape = {
    PqPairs: PriceQuantityUnitless[];
    QuantityUnit: 'AvgMW' | 'AvgkW';
    OptimalPathList: FloOptimalPath[];
};

export function checkAxiom1(r: RecommendationShape): boolean {
    return r.PqPairs.length >= 1;
}

export function checkAxiom2(r: RecommendationShape): boolean {
    return r.OptimalPathList.length === r.PqPairs.length;
}

export function checkAxiom3(r: RecommendationShape): boolean {
    const toW = r.QuantityUnit === 'AvgMW' ? 1000 : 1;
    return r.PqPairs.every((pair, i) => r.OptimalPathList[i].HpAvgWList[0] === pair.QuantityX1000 * toW);
}

export function checkAxiom4(r: RecommendationShape): boolean {
    return r.PqPairs.every(
        (pair, i) =>
            i === 0 || (pair.PriceX1000 < r.PqPairs[i - 1].PriceX1000 && pair.QuantityX1000 >= r.PqPairs[i - 1].QuantityX1000),
    );
}

export function checkAxiom5(r: RecommendationShape): boolean {
    return r.OptimalPathList.every((path) => path.StartUnixS === r.OptimalPathList[0].StartUnixS);
}

/** One annotation word per path, each with the path's step count. */
export function annotatesEveryPath(
    annotations: { [key: string]: unknown }[] | undefined,
    paths: FloOptimalPath[],
    stepLists: string[],
): boolean {
    if (annotations === undefined) return true;
    if (annotations.length !== paths.length) return false;
    return annotations.every((a, i) =>
        stepLists.every((key) => (a[key] as unknown[]).length === paths[i].HpAvgWList.length),
    );
}

export const RECOMMENDATION_AXIOMS = [
    [checkAxiom1, 'Axiom 1 (AtLeastOnePair) failed: PqPairs is empty', 'PqPairs'],
    [checkAxiom2, 'Axiom 2 (PathPerPair) failed: OptimalPathList and PqPairs differ in length', 'OptimalPathList'],
    [checkAxiom3, 'Axiom 3 (FirstStepIsTheBid) failed: a path does not start at its pair\'s quantity', 'OptimalPathList'],
    [checkAxiom4, 'Axiom 4 (PairsDescend) failed: prices do not strictly descend or quantities descend', 'PqPairs'],
    [checkAxiom5, 'Axiom 5 (PathsStartTogether) failed: the paths do not share a StartUnixS', 'OptimalPathList'],
] as const;
