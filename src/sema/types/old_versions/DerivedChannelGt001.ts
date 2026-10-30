import { z } from 'zod';
import { EmissionMethod } from '../../enums/EmissionMethod';
import { Unit000 } from '../../enums/old_versions/Unit000';
import { LeftRightDot, PositiveInt, SpaceheatName, Uuid4Str } from '../../formats';
import { checkAxiom1 } from '../DerivedChannelGt';

/** Sema: https://schemas.electricity.works/types/derived.channel.gt/001 */
export const DerivedChannelGt001 = z
    .strictObject({
        Id: Uuid4Str,
        Name: SpaceheatName,
        CreatedByNodeName: SpaceheatName,
        Strategy: SpaceheatName,
        InputChannelNames: z.array(SpaceheatName),
        OutputUnit: Unit000.optional(),
        EmissionMethod: EmissionMethod,
        AsyncEmitDelta: PositiveInt.optional(),
        EmitPeriodS: PositiveInt.optional(),
        Parameters: z.record(z.string(), z.unknown()).optional(),
        DisplayName: z.string(),
        TerminalAssetAlias: LeftRightDot,
        TypeName: z.literal('derived.channel.gt'),
        Version: z.literal('001'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (EmissionSemanticsConsistency) failed: EmitPeriodS and AsyncEmitDelta do not match EmissionMethod',
        path: ['EmissionMethod'],
    });
export type DerivedChannelGt001 = z.infer<typeof DerivedChannelGt001>;
