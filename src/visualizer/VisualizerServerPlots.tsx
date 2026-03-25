import { DateTime } from 'luxon';
import Plot from 'react-plotly.js';
import type { Config, Data, Layout } from 'plotly.js';

import type { VisualizerPlotSpec } from './visualizerApiTypes';
import { visualizerPlotsBuild } from './visualizer-plots.js';

const PLOT_ORDER = [
    'plot1', 'plot2', 'plot3', 'plot4', 'plot5', 'plot6',
    'plot7', 'plot8', 'plot9', 'plot10', 'plot11',
] as const;

const VISUALIZER_PLOT_HEIGHT = 400;

function toNyLocalIso(value: unknown): unknown {
    if (value === null || value === undefined || value === '') {
        return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return DateTime.fromMillis(value, { zone: 'utc' })
            .setZone('America/New_York')
            .toFormat("yyyy-LL-dd'T'HH:mm:ss");
    }
    return value;
}

function mapTraceXToNyLocalIso(trace: Data): Data {
    if (!trace || typeof trace !== 'object' || !('x' in trace) || !Array.isArray((trace as { x?: unknown }).x)) {
        return trace;
    }
    const t = trace as { x: unknown[] };
    const x = t.x.map((value) => toNyLocalIso(value));
    return { ...trace, x } as Data;
}

function mergeVisualizerLayout(layout: Partial<Layout> | undefined): Partial<Layout> {
    const m =
        layout?.margin && typeof layout.margin === 'object' && !Array.isArray(layout.margin)
            ? layout.margin
            : {};
    const prevB = Number((m as { b?: number }).b);
    const rest = { ...(layout || {}) };
    delete rest.width;
    return {
        ...rest,
        height: VISUALIZER_PLOT_HEIGHT,
        autosize: true,
        margin: {
            ...(typeof m === 'object' ? m : {}),
            b: Number.isFinite(prevB) ? Math.max(prevB, 52) : 52,
        },
    };
}

const defaultPlotConfig: Partial<Config> = { displayModeBar: false, responsive: true };

function getTracesAndLayout(
    spec: VisualizerPlotSpec,
    selectedChannels: string[],
    darkmode: boolean
): { traces: Data[]; layout: Partial<Layout> } | null {
    if (typeof spec.plotKind === 'string' && spec.plotKind) {
        const built = visualizerPlotsBuild(spec.plotKind, spec, selectedChannels, darkmode, toNyLocalIso);
        if (built && Array.isArray(built.traces) && built.traces.length > 0) {
            return {
                traces: built.traces as Data[],
                layout: mergeVisualizerLayout(built.layout as Partial<Layout>),
            };
        }
        return null;
    }

    if (Array.isArray(spec.data) && spec.data.length > 0) {
        const traces = spec.data.map(mapTraceXToNyLocalIso);
        const layout = mergeVisualizerLayout({ ...(spec.layout || {}) });
        const prevXaxis = layout.xaxis;
        const xaxis =
            typeof prevXaxis === 'object' && prevXaxis !== null && !Array.isArray(prevXaxis)
                ? { ...prevXaxis, type: 'date' as const }
                : { type: 'date' as const };
        layout.xaxis = xaxis;
        return { traces, layout };
    }

    return null;
}

interface VisualizerServerPlotsProps {
    plots: Record<string, VisualizerPlotSpec | null | undefined>;
    selectedChannels: string[];
    darkmode: boolean;
}

export default function VisualizerServerPlots({ plots, selectedChannels, darkmode }: VisualizerServerPlotsProps) {
    return (
        <div className="visualizer-server-plots-root">
            {PLOT_ORDER.map((plotId) => {
                const spec = plots[plotId];
                if (!spec) {
                    return null;
                }
                const resolved = getTracesAndLayout(spec, selectedChannels, darkmode);
                if (!resolved) {
                    return null;
                }
                const { traces, layout } = resolved;
                const config: Partial<Config> = { ...defaultPlotConfig, ...(spec.config || {}) };
                return (
                    <div
                        key={plotId}
                        className="plot-div"
                        style={{ width: '100%', height: `${VISUALIZER_PLOT_HEIGHT}px`, minHeight: `${VISUALIZER_PLOT_HEIGHT}px` }}
                    >
                        <Plot
                            data={traces}
                            layout={layout}
                            config={config}
                            style={{ width: '100%', height: '100%' }}
                            useResizeHandler
                        />
                    </div>
                );
            })}
        </div>
    );
}
