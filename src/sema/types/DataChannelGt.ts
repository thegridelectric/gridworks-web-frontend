import { z } from 'zod';
import { Gw1Quantity } from '../enums/Gw1Quantity';
import { SpaceheatTelemetryName } from '../enums/SpaceheatTelemetryName';
import { LeftRightDot, SpaceheatName, UtcSeconds, Uuid4Str } from '../formats';
import { projectTelemetryName } from './SpaceheatTelemetryQuantityProjection';

/** Sema: https://schemas.electricity.works/types/data.channel.gt/004 */
export const DataChannelGt = z
    .strictObject({
        Name: SpaceheatName,
        DisplayName: z.string(),
        AboutNodeName: SpaceheatName,
        CapturedByNodeName: SpaceheatName,
        TelemetryName: SpaceheatTelemetryName,
        Quantity: Gw1Quantity,
        TerminalAssetAlias: LeftRightDot,
        StartS: UtcSeconds.optional(),
        Id: Uuid4Str,
        TypeName: z.literal('data.channel.gt'),
        Version: z.literal('004'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (TelemetryQuantityConsistency) failed: Quantity is inconsistent with TelemetryName',
        path: ['Quantity'],
    });
export type DataChannelGt = z.infer<typeof DataChannelGt>;

function checkAxiom1(c: { TelemetryName: SpaceheatTelemetryName; Quantity: Gw1Quantity }): boolean {
    return projectTelemetryName(c.TelemetryName) === c.Quantity;
}
