import { z } from 'zod';
import { SeasonalStorageMode } from '../enums/SeasonalStorageMode';
import { ServiceMode } from '../enums/ServiceMode';
import { DispatchRefusalReason } from '../enums/DispatchRefusalReason';
import { StandbyPosture } from '../enums/StandbyPosture';
import { TopState } from '../enums/TopState';
import { TaValidationState } from '../enums/TaValidationState';
import { LeftRightDot, UtcMilliseconds } from '../formats';

/** Sema: https://schemas.electricity.works/types/gw.house.operating.status/000 */
export const HouseOperatingStatus = z
    .strictObject({
        ScadaAlias: LeftRightDot,
        ValidationState: TaValidationState,
        Standby: z.boolean(),
        StandbyPosture: StandbyPosture,
        SeasonalStorageMode: SeasonalStorageMode,
        ServiceMode: ServiceMode,
        AcceptsDispatch: z.boolean(),
        DispatchRefusalReason: DispatchRefusalReason.optional(),
        TopState: TopState,
        ScadaBlind: z.boolean(),
        LtnDispatching: z.boolean(),
        CreatedMs: UtcMilliseconds,
        TypeName: z.literal('gw.house.operating.status'),
        Version: z.literal('000'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (RefusalReasonPresence) failed: DispatchRefusalReason is present iff AcceptsDispatch is false',
        path: ['DispatchRefusalReason'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (StandbyRefusesDispatch) failed: Standby requires AcceptsDispatch false with reason OperatorHold',
        path: ['Standby'],
    });
export type HouseOperatingStatus = z.infer<typeof HouseOperatingStatus>;

type Shape = { Standby: boolean; AcceptsDispatch: boolean; DispatchRefusalReason?: string };

function checkAxiom1(s: Shape): boolean {
    return (s.DispatchRefusalReason !== undefined) === !s.AcceptsDispatch;
}

function checkAxiom2(s: Shape): boolean {
    return !s.Standby || (!s.AcceptsDispatch && s.DispatchRefusalReason === 'OperatorHold');
}
