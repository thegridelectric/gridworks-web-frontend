import { z } from 'zod';
import { SpaceheatTelemetryName006 } from '../../enums/old_versions/SpaceheatTelemetryName006';
import { LeftRightDot, SpaceheatName, UtcSeconds, Uuid4Str } from '../../formats';

/** Sema: https://schemas.electricity.works/types/data.channel.gt/001 */
export const DataChannelGt001 = z
    .strictObject({
        Name: SpaceheatName,
        DisplayName: z.string(),
        AboutNodeName: SpaceheatName,
        CapturedByNodeName: SpaceheatName,
        TelemetryName: SpaceheatTelemetryName006,
        TerminalAssetAlias: LeftRightDot,
        InPowerMetering: z.boolean().optional(),
        StartS: UtcSeconds.optional(),
        Id: Uuid4Str,
        TypeName: z.literal('data.channel.gt'),
        Version: z.literal('001'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (PowerMeteringConstraint) failed: TelemetryName must be PowerW when InPowerMetering is true',
        path: ['TelemetryName'],
    });
export type DataChannelGt001 = z.infer<typeof DataChannelGt001>;

function checkAxiom1(c: { InPowerMetering?: boolean; TelemetryName: string }): boolean {
    return !c.InPowerMetering || c.TelemetryName === 'PowerW';
}
