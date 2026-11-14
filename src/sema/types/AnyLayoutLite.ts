import { z } from 'zod';
import { LayoutLite } from './LayoutLite';
import { LayoutLite013 } from './old_versions/LayoutLite013';
import { LayoutLite011Reader, LayoutLite012Reader } from './old_versions/LayoutLiteReaders';

/** The `layout.lite` versions the browser reads: 014 and 013 as whole
 *  words, 011 and 012 through their readers. */
export const AnyLayoutLite = z.union([LayoutLite, LayoutLite013, LayoutLite012Reader, LayoutLite011Reader]);
export type AnyLayoutLite = z.infer<typeof AnyLayoutLite>;
