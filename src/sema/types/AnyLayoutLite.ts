import { z } from 'zod';
import { LayoutLite } from './LayoutLite';
import { LayoutLite011Reader, LayoutLite012Reader } from './old_versions/LayoutLiteReaders';

/** The `layout.lite` versions the browser reads: 013 as the whole word,
 *  011 and 012 through their readers. */
export const AnyLayoutLite = z.union([LayoutLite, LayoutLite012Reader, LayoutLite011Reader]);
export type AnyLayoutLite = z.infer<typeof AnyLayoutLite>;
