/** Sema property formats the browser's words use, as zod string and integer
 *  schemas. Each pattern is the one in the sema registry's format
 *  definition. */
import { z } from 'zod';

/** Sema: https://schemas.electricity.works/formats/left.right.dot */
export const LeftRightDot = z.string().regex(/^[a-z][a-z0-9]*(\.[a-z0-9]+)*$/, 'Fails LeftRightDot format');

/** Sema: https://schemas.electricity.works/formats/spaceheat.name */
export const SpaceheatName = z
    .string()
    .max(64)
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, 'Fails SpaceheatName format');

/** Sema: https://schemas.electricity.works/formats/handle.name */
export const HandleName = z
    .string()
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*)*$/, 'Fails HandleName format');

/** Sema: https://schemas.electricity.works/formats/uuid4.str */
export const Uuid4Str = z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, 'Fails UUID4Str format');

/** Sema: https://schemas.electricity.works/formats/utc.milliseconds */
export const UtcMilliseconds = z.number().int().min(946684800000).max(32503680000000);
