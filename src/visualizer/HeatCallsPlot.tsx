import Plot from 'react-plotly.js';
import type { PlotData, Shape } from 'plotly.js';
import type { ChannelReading } from '../sema';
import { formatIsoTimeForDisplay, getDefaultPlotLayout, getThemeColor } from './plot-configs';
import type { DefaultPlotParams } from './DefaultVisualizerPlot';
import { PlotlyWrapper } from './PlotlyWrapper';

const HEAT_CALL_CHANNEL_PATTERN = /^zone(\d+)-([\w-]+)-heat-call$/;
const WHITEWIRE_CHANNEL_PATTERN = /^zone(\d+)-([\w-]+)-whitewire-pwr$/;
const HEAT_CALL_ZONE_COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'];
const DEFAULT_WHITEWIRE_THRESHOLD_WATTS = 20;
const WHITEWIRE_THRESHOLD_OVERRIDES: Record<string, number> = {
    'hw1.isone.me.versant.keene.beech': 100,
    'hw1.isone.me.versant.keene.elm': 1,
    beech: 100,
    elm: 1,
};

type ZoneHeatSource = 'heat_call' | 'whitewire';

interface ZoneHeatChannel {
    zoneNumber: number;
    legendName: string;
    source: ZoneHeatSource;
    values: (number | null)[];
}

function getWhitewireThresholdWatts(installationGNode: string): number {
    if (installationGNode in WHITEWIRE_THRESHOLD_OVERRIDES) {
        return WHITEWIRE_THRESHOLD_OVERRIDES[installationGNode];
    }
    const houseAlias = installationGNode.split('.').pop();
    if (houseAlias && houseAlias in WHITEWIRE_THRESHOLD_OVERRIDES) {
        return WHITEWIRE_THRESHOLD_OVERRIDES[houseAlias];
    }
    return DEFAULT_WHITEWIRE_THRESHOLD_WATTS;
}

function isHeatCallsPlotSelected(selectedChannels: string[]): boolean {
    const expanded = selectedChannels.flatMap((channel) => channel.split(','));
    return expanded.some((channel) => channel.includes('heat-call'));
}

function findActivePeriodIndices(active: boolean[]): { starts: number[]; ends: number[] } {
    const starts: number[] = [];
    const ends: number[] = [];
    for (let i = 0; i < active.length; i++) {
        const prevInactive = i === 0 ? true : !active[i - 1];
        if (active[i] && prevInactive) {
            starts.push(i);
        }
        const nextInactive = i === active.length - 1 ? true : !active[i + 1];
        if (active[i] && nextInactive) {
            ends.push(i);
        }
    }
    return { starts, ends };
}

function valuesToActive(
    values: (number | null)[],
    source: ZoneHeatSource,
    whitewireThresholdWatts: number,
): boolean[] {
    if (source === 'heat_call') {
        return values.map((value) => value === 1);
    }
    return values.map((value) => value != null && Math.abs(value) > whitewireThresholdWatts);
}

function buildZoneHighlightTraces(
    zone: ZoneHeatChannel,
    times: string[],
    showPoints: boolean,
    isDarkMode: boolean,
    whitewireThresholdWatts: number,
): Partial<PlotData>[] {
    const active = valuesToActive(zone.values, zone.source, whitewireThresholdWatts);
    const zoneColor = HEAT_CALL_ZONE_COLORS[(zone.zoneNumber - 1) % HEAT_CALL_ZONE_COLORS.length];
    const color = getThemeColor(zoneColor, isDarkMode);
    const traces: Partial<PlotData>[] = [];

    if (!active.some(Boolean)) {
        traces.push({
            type: 'scatter',
            x: [null],
            y: [null],
            mode: 'lines',
            line: { color, width: 2 },
            name: zone.legendName,
        });
        return traces;
    }

    const { starts, ends } = findActivePeriodIndices(active);
    const fillX: (string | null)[] = [];
    const fillY: (number | null)[] = [];
    const edgeX: (string | null)[] = [];
    const edgeY: (number | null)[] = [];

    for (let k = 0; k < starts.length; k++) {
        const startIdx = starts[k];
        const endIdx = ends[k];
        const endTimeIdx = Math.min(endIdx + 1, times.length - 1);
        const x0 = times[startIdx];
        const x1 = times[endTimeIdx];
        fillX.push(x0, x0, x1, x1, null);
        fillY.push(zone.zoneNumber - 1, zone.zoneNumber, zone.zoneNumber, zone.zoneNumber - 1, null);
        edgeX.push(x0, x0, null, x1, x1, null);
        edgeY.push(zone.zoneNumber - 1, zone.zoneNumber, null, zone.zoneNumber - 1, zone.zoneNumber, null);
    }

    traces.push({
        type: 'scatter',
        x: fillX,
        y: fillY,
        mode: 'lines',
        fill: 'toself',
        line: { color, width: 0 },
        fillcolor: color,
        opacity: 0.2,
        showlegend: false,
        hoverinfo: 'skip',
    });
    traces.push({
        type: 'scatter',
        x: edgeX,
        y: edgeY,
        mode: 'lines',
        line: { color, width: 2 },
        opacity: 0.7,
        showlegend: false,
        hovertemplate: '%{x|%H:%M:%S}<extra></extra>',
    });

    if (showPoints) {
        const activeIdx = active.map((isActive, i) => (isActive ? i : -1)).filter((i) => i >= 0);
        traces.push({
            type: 'scatter',
            x: activeIdx.map((i) => times[i]),
            y: activeIdx.map(() => zone.zoneNumber - 0.5),
            mode: 'markers',
            marker: { size: 4, color, opacity: 0.6 },
            showlegend: false,
            hovertemplate: '%{x|%H:%M:%S}<extra></extra>',
        });
    }

    traces.push({
        type: 'scatter',
        x: [null],
        y: [null],
        mode: 'lines',
        line: { color, width: 2 },
        name: zone.legendName,
    });

    return traces;
}

function parseHeatCallChannel(channel: ChannelReading): ZoneHeatChannel | null {
    const match = channel.ChannelName.match(HEAT_CALL_CHANNEL_PATTERN);
    if (!match) {
        return null;
    }
    return {
        zoneNumber: parseInt(match[1], 10),
        legendName: `zone${match[1]}-${match[2]}`,
        source: 'heat_call',
        values: channel.ValueList,
    };
}

function parseWhitewireChannel(channel: ChannelReading): ZoneHeatChannel | null {
    const match = channel.ChannelName.match(WHITEWIRE_CHANNEL_PATTERN);
    if (!match) {
        return null;
    }
    return {
        zoneNumber: parseInt(match[1], 10),
        legendName: channel.ChannelName.replace('-whitewire', ''),
        source: 'whitewire',
        values: channel.ValueList,
    };
}

function buildZoneHeatChannels(channelReadings: ChannelReading[]): ZoneHeatChannel[] {
    const zonesByNumber = new Map<number, { heatCall?: ZoneHeatChannel; whitewire?: ZoneHeatChannel }>();

    for (const channel of channelReadings) {
        const heatCall = parseHeatCallChannel(channel);
        if (heatCall) {
            const existing = zonesByNumber.get(heatCall.zoneNumber) ?? {};
            existing.heatCall = heatCall;
            zonesByNumber.set(heatCall.zoneNumber, existing);
            continue;
        }

        const whitewire = parseWhitewireChannel(channel);
        if (whitewire) {
            const existing = zonesByNumber.get(whitewire.zoneNumber) ?? {};
            existing.whitewire = whitewire;
            zonesByNumber.set(whitewire.zoneNumber, existing);
        }
    }

    return [...zonesByNumber.entries()]
        .sort(([zoneA], [zoneB]) => zoneA - zoneB)
        .flatMap(([, zoneChannels]) => {
            if (zoneChannels.heatCall) {
                return [zoneChannels.heatCall];
            }
            if (zoneChannels.whitewire) {
                return [zoneChannels.whitewire];
            }
            return [];
        });
}

export interface HeatCallsPlotParams extends DefaultPlotParams {
    installationGNode: string;
}

export default function HeatCallsPlot(props: HeatCallsPlotParams) {
    const { plotConfig, readingsBundleData, selectedChannels, showPoints, isDarkMode, plotParams, installationGNode } = props;

    if (!isHeatCallsPlotSelected(selectedChannels)) {
        return null;
    }

    const times = readingsBundleData.TimestampList.map(formatIsoTimeForDisplay);
    const zoneHeatChannels = buildZoneHeatChannels(readingsBundleData.ChannelReadingsList);

    if (!zoneHeatChannels.length) {
        return null;
    }

    const whitewireThresholdWatts = getWhitewireThresholdWatts(installationGNode);
    const zoneAxisCount = Math.max(...zoneHeatChannels.map((zone) => zone.zoneNumber));

    const plotlyData: Partial<PlotData>[] = zoneHeatChannels.flatMap((zone) =>
        buildZoneHighlightTraces(zone, times, showPoints, isDarkMode, whitewireThresholdWatts),
    );

    const plotlyLayout = getDefaultPlotLayout(isDarkMode);
    plotlyLayout.title = {
        ...plotlyLayout.title,
        text: plotConfig.title,
    };
    plotlyLayout.legend = {
        ...plotlyLayout.legend,
        orientation: plotConfig.legendOrientation || 'h',
    };
    plotlyLayout.xaxis = {
        ...plotlyLayout.xaxis,
        range: [
            formatIsoTimeForDisplay(readingsBundleData.StartTimestamp),
            formatIsoTimeForDisplay(readingsBundleData.EndTimestamp),
        ],
    };
    plotlyLayout.yaxis = {
        ...plotlyLayout.yaxis,
        range: [-0.5, zoneAxisCount * 1.3],
        dtick: 1,
        tickvals: Array.from({ length: zoneAxisCount + 1 }, (_, i) => i),
        zeroline: false,
    };
    plotlyLayout.yaxis2 = {
        ...plotlyLayout.yaxis2,
        visible: false,
    };

    plotlyLayout.shapes = readingsBundleData.LatePersistenceTimePeriodList.map(([start, end]): Partial<Shape> => ({
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: formatIsoTimeForDisplay(start),
        x1: formatIsoTimeForDisplay(end),
        y0: 0,
        y1: 1,
        fillcolor: 'red',
        opacity: 0.15,
        layer: 'below',
        line: { width: 0 },
    }));

    return (
        <PlotlyWrapper>
            <Plot data={plotlyData} layout={plotlyLayout} {...plotParams} />
        </PlotlyWrapper>
    );
}
