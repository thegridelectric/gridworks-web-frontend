export function visualizerPlotsBuild(
    plotKind: string,
    payload: object,
    selectedChannels: string[],
    isDarkMode: boolean,
    toNyLocalIso: (value: unknown) => unknown
): { traces: unknown[]; layout: object } | null;

export const BUILDERS: Record<string, unknown>;
