import Plot from 'react-plotly.js';

import { getDefaultPlotLayout, getDefaultPlotConfig, getDefaultPlotlyData } from './plotlyConfig.ts';
import type { Datum } from 'plotly.js';

interface VisualizerHeatPumpPlotProps {
    showMarkers: boolean,
    times: Datum[],
    ewts: Datum[],
    lwts: Datum[],
}

export default function VisualizerHeatPumpPlot({ times, ewts, lwts, showMarkers }: VisualizerHeatPumpPlotProps) {
    const plotData: Plotly.Data[] = [
        getDefaultPlotlyData({
            showMarkers,
            x: times,
            y: lwts,
            name: 'HP LWT',
            lineColor: '#d62728'
        }),
        getDefaultPlotlyData({
            showMarkers,
            x: times,
            y: ewts,
            name: 'HP EWT',
            lineColor: '#1f77b4'
        }),
    ];
    const plotLayout = getDefaultPlotLayout();

    plotLayout.yaxis = {
        ...plotLayout.yaxis,
        range: [0, 260],
        title: {
            text: 'Temperature [°F]'
        }
    };
    plotLayout.yaxis2 = {
        ...plotLayout.yaxis2,
        range: [0,35],
        title: {
            text: 'Power [kW] or Flow [GPM]'
        }
    };

    // def add_internet_down_highlights(self, fig, request):
    //     for period_start, period_end in self.data[request].get('late_persistence_periods', []):
    //         fig.add_vrect(
    //             x0=period_start, x1=period_end,
    //             fillcolor="red", opacity=0.15,
    //             layer="below", line_width=0,
    //             annotation_text="Late persistence",
    //             annotation_position="top left",
    //             annotation_font_size=10,
    //             annotation_font_color="red",
    //         )    

    const plotConfig = getDefaultPlotConfig();
    return <div className="plot-div">
        <Plot data={plotData} layout={plotLayout} config={plotConfig} />
    </div>
}