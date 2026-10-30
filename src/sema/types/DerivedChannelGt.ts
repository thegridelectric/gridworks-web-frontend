import { z } from 'zod';
import { EmissionMethod } from '../enums/EmissionMethod';
import { Quantity } from '../enums/Quantity';
import { Unit } from '../enums/Unit';
import { LeftRightDot, PositiveInt, SpaceheatName, Uuid4Str } from '../formats';
import { projectUnit } from './UnitQuantityProjection';

/** Sema: https://schemas.electricity.works/types/derived.channel.gt/003 */
export const DerivedChannelGt = z
    .strictObject({
        Id: Uuid4Str,
        Name: SpaceheatName,
        CreatedByNodeName: SpaceheatName,
        Strategy: SpaceheatName,
        InputChannelNames: z.array(SpaceheatName),
        OutputUnit: Unit,
        OutputQuantity: Quantity,
        EmissionMethod: EmissionMethod,
        AsyncEmitDelta: PositiveInt.optional(),
        EmitPeriodS: PositiveInt.optional(),
        Parameters: z.record(z.string(), z.unknown()).optional(),
        DisplayName: z.string(),
        TerminalAssetAlias: LeftRightDot,
        TypeName: z.literal('derived.channel.gt'),
        Version: z.literal('003'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (EmissionSemanticsConsistency) failed: EmitPeriodS and AsyncEmitDelta do not match EmissionMethod',
        path: ['EmissionMethod'],
    })
    .refine(checkAxiom2, {
        message: 'Axiom 2 (OutputUnitQuantityConsistency) failed: OutputQuantity is inconsistent with OutputUnit',
        path: ['OutputQuantity'],
    });
export type DerivedChannelGt = z.infer<typeof DerivedChannelGt>;

export function checkAxiom1(c: { EmissionMethod: EmissionMethod; AsyncEmitDelta?: number; EmitPeriodS?: number }): boolean {
    const period = c.EmitPeriodS !== undefined;
    const delta = c.AsyncEmitDelta !== undefined;
    switch (c.EmissionMethod) {
        case 'OnTrigger':
            return !period && !delta;
        case 'Periodic':
            return period && !delta;
        case 'AsyncAndPeriodic':
            return period && delta;
    }
}

function checkAxiom2(c: { OutputUnit: Unit; OutputQuantity: Quantity }): boolean {
    return projectUnit(c.OutputUnit) === c.OutputQuantity;
}
