import { z } from 'zod';
import { SpaceheatTelemetryName } from '../SpaceheatTelemetryName';

/** Sema: https://schemas.electricity.works/enums/spaceheat.telemetry.name/006 */
export const SpaceheatTelemetryName006 = SpaceheatTelemetryName.exclude(['BinaryState']);
export type SpaceheatTelemetryName006 = z.infer<typeof SpaceheatTelemetryName006>;
