import { z } from 'zod';
import { LeftRightDot, PositiveInt, UtcMilliseconds, UtcSeconds, Uuid4Str } from '../formats';
import { SeasonalStorageMode } from '../enums/SeasonalStorageMode';
import { FloOptimalPath } from './FloOptimalPath';
import { FloTuningAlice } from './FloTuningAlice';
import { FloTuningBruce } from './FloTuningBruce';

/** Sema: https://schemas.electricity.works/types/flo.params/001 */
export const FloParams = z
    .strictObject({
        GNodeAlias: LeftRightDot,
        CreatedMs: UtcMilliseconds,
        StartUnixS: UtcSeconds,
        StepDurationMinutes: z.array(PositiveInt),
        LmpUsdMwhList: z.array(z.number()),
        DistUsdMwhList: z.array(z.number()),
        OatFList: z.array(z.number()),
        LoadKwhList: z.array(z.number()),
        RswtFList: z.array(z.number()),
        WeatherForecastId: Uuid4Str,
        SeasonalStorageMode: SeasonalStorageMode,
        TanksModeled: PositiveInt,
        GallonsPerTank: PositiveInt,
        TempSensorsPerTank: PositiveInt,
        MaxTankTempF: z.number(),
        InitialTopTempF: z.number(),
        InitialMiddleTempF: z.number(),
        InitialBottomTempF: z.number(),
        InitialThermocline1: PositiveInt,
        InitialThermocline2: PositiveInt,
        HpCurrentlyOn: z.boolean(),
        HpMaxKwEl: z.number(),
        HpTurnOnMinutes: PositiveInt,
        CopIntercept: z.number(),
        CopOatCoeff: z.number(),
        CopLwtCoeff: z.number(),
        CopMin: z.number(),
        CopMinOatF: z.number(),
        PriceMaxUsdMwh: z.number(),
        PriceMinUsdMwh: z.number(),
        PreviousOptimalPath: FloOptimalPath.optional(),
        PreviousEstimateElecUsdMwhNow: z.number().optional(),
        Tuning: z.discriminatedUnion('TypeName', [FloTuningAlice, FloTuningBruce]),
        TypeName: z.literal('flo.params'),
        Version: z.literal('001'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (StepListLengths) failed: the six step lists are empty or differ in length',
        path: ['StepDurationMinutes'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (ThermoclinesWithinTheStore) failed: a thermocline is out of order or below the store',
        path: ['InitialThermocline1'],
    })
    .refine(checkAxiom3, {
        message: 'Axiom 3 (BufferIsOneTank) failed: BufferOnly models more than one tank',
        path: ['TanksModeled'],
    })
    .refine(checkAxiom4, {
        message: 'Axiom 4 (PriceBounds) failed: PriceMinUsdMwh is not below PriceMaxUsdMwh',
        path: ['PriceMinUsdMwh'],
    })
    .refine(checkAxiom5, {
        message: 'Axiom 5 (PreviousRunTogether) failed: PreviousOptimalPath and PreviousEstimateElecUsdMwhNow are not both present or both absent',
        path: ['PreviousOptimalPath'],
    });
export type FloParams = z.infer<typeof FloParams>;

type Shape = {
    StepDurationMinutes: number[];
    LmpUsdMwhList: number[];
    DistUsdMwhList: number[];
    OatFList: number[];
    LoadKwhList: number[];
    RswtFList: number[];
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

function checkAxiom1(p: Shape): boolean {
    const n = p.StepDurationMinutes.length;
    return n > 0 && [p.LmpUsdMwhList, p.DistUsdMwhList, p.OatFList, p.LoadKwhList, p.RswtFList].every((l) => l.length === n);
}

function checkAxiom2(p: Shape): boolean {
    return p.InitialThermocline1 <= p.InitialThermocline2 && p.InitialThermocline2 <= p.TempSensorsPerTank * p.TanksModeled;
}

function checkAxiom3(p: Shape): boolean {
    return p.SeasonalStorageMode !== 'BufferOnly' || p.TanksModeled === 1;
}

function checkAxiom4(p: Shape): boolean {
    return p.PriceMinUsdMwh < p.PriceMaxUsdMwh;
}

function checkAxiom5(p: Shape): boolean {
    return (p.PreviousOptimalPath === undefined) === (p.PreviousEstimateElecUsdMwhNow === undefined);
}
