import { z } from 'zod';
import { LeftRightDot, UtcMilliseconds, Uuid4Str } from '../formats';
import { SingleMachineState } from './SingleMachineState';
import { SingleReading } from './SingleReading';

/** Sema: https://schemas.electricity.works/types/snapshot.spaceheat/003 */
export const SnapshotSpaceheat = z.strictObject({
    FromGNodeAlias: LeftRightDot,
    FromGNodeInstanceId: Uuid4Str,
    SnapshotTimeUnixMs: UtcMilliseconds,
    LatestReadingList: z.array(SingleReading),
    LatestStateList: z.array(SingleMachineState),
    TypeName: z.literal('snapshot.spaceheat'),
    Version: z.literal('003'),
});
export type SnapshotSpaceheat = z.infer<typeof SnapshotSpaceheat>;
