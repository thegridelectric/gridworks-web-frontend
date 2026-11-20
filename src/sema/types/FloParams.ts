import { z } from 'zod';
import { LeftRightDot, PositiveInt, UtcMilliseconds, UtcSeconds, Uuid4Str } from '../formats';
import { SeasonalStorageMode } from '../enums/SeasonalStorageMode';
import { FloOptimalPath } from './FloOptimalPath';
import { FloTuningAlice } from './FloTuningAlice';
import { FloTuningBruce } from './FloTuningBruce';
import { SHARED_PARAMS_AXIOMS, sameLength } from './floParamsAxioms';

/** Sema: https://schemas.electricity.works/types/flo.params/004 */
export const FloParams = SHARED_PARAMS_AXIOMS.reduce(
    (schema, [check, message, path]) => schema.refine(check, { message, path: [path] }),
    z
        .strictObject({
            GNodeAlias: LeftRightDot,
            CreatedMs: UtcMilliseconds,
            StartUnixS: UtcSeconds,
            StepDurationMinutes: z.array(PositiveInt),
            PriceUsdMwhList: z.array(z.number()),
            OatFList: z.array(z.number()),
            LoadKwhList: z.array(z.number()),
            RswtFList: z.array(z.number()),
            WeatherForecastId: Uuid4Str,
            PriceForecastId: Uuid4Str,
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
            Version: z.literal('004'),
        })
        .refine((p) => sameLength(p.StepDurationMinutes, [p.PriceUsdMwhList, p.OatFList, p.LoadKwhList, p.RswtFList]), {
            message: 'Axiom 1 (StepListLengths) failed: the five step lists are empty or differ in length',
            path: ['StepDurationMinutes'],
        }),
);
export type FloParams = z.infer<typeof FloParams>;
