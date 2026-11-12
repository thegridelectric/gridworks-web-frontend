/** Same threshold as yellow bands on the FLO summary power panel. */
export const ELEC_PRICE_HIGHLIGHT_USD_MWH = 400;

/** Plot shape fill on the power panel (and horizon bar segments). */
export const ELEC_PRICE_HIGHLIGHT_FILL = {
    light: "rgba(255, 244, 190, 0.42)",
    dark: "rgba(255, 214, 100, 0.11)",
} as const;

export function elecPriceHighlightFillColor(isDarkMode: boolean): string {
    return isDarkMode ? ELEC_PRICE_HIGHLIGHT_FILL.dark : ELEC_PRICE_HIGHLIGHT_FILL.light;
}

/** One flag per horizon bar segment (step index `i` = interval starting at `times[i]`). */
export function floHighElecPriceStepMask(
    times: string[],
    elecPriceUsdMwh: number[],
    segmentCount: number,
): boolean[] {
    const mask = Array.from({ length: segmentCount }, () => false);
    const stepCount = Math.min(times.length - 1, elecPriceUsdMwh.length);
    for (let i = 0; i < stepCount && i < segmentCount; i++) {
        if (elecPriceUsdMwh[i] > ELEC_PRICE_HIGHLIGHT_USD_MWH) {
            mask[i] = true;
        }
    }
    return mask;
}
