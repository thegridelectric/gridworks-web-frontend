import type { Config, Data, Layout } from 'plotly.js';

export interface VisualizerPlotSpec {
    plotKind?: string;
    data?: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    [key: string]: unknown;
}

export interface VisualizerPlotsApiResponse {
    success: boolean;
    message?: string;
    plots?: Record<string, VisualizerPlotSpec | null | undefined>;
}
