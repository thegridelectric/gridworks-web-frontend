import { describe, expect, it } from 'vitest';
import { zoomAfterRelayout } from '../plot-zoom';

describe('zoomAfterRelayout', () => {
    it('is zoomed after a drag sets the x range', () => {
        expect(zoomAfterRelayout({ 'xaxis.range[0]': '2026-11-18 07:00', 'xaxis.range[1]': '2026-11-18 12:00' })).toBe(true);
    });

    it('is zoomed after a drag on a second axis', () => {
        expect(zoomAfterRelayout({ 'xaxis2.range[0]': 1, 'xaxis2.range[1]': 2 })).toBe(true);
    });

    it('is back at the full range after a double-click', () => {
        expect(zoomAfterRelayout({ 'xaxis.autorange': true, 'yaxis.autorange': true })).toBe(false);
    });

    it('says nothing about a relayout that is not a zoom', () => {
        expect(zoomAfterRelayout({ width: 900 })).toBe(null);
    });
});
