/** Whether a relayout leaves the plot zoomed: a drag sets an axis range,
 *  a double-click sets it back to autorange. Any other relayout says
 *  nothing about the zoom. */
export function zoomAfterRelayout(event: object): boolean | null {
    const keys = Object.keys(event);
    if (keys.some((k) => /^[xy]axis\d*\.autorange$/.test(k))) return false;
    if (keys.some((k) => /^[xy]axis\d*\.range/.test(k))) return true;
    return null;
}

