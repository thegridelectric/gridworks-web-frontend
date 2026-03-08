import type { Datum } from "plotly.js";

interface DataOptions {
    name: string,
    x: Datum[],
    y: Datum[],
    lineColor: string
    showMarkers: boolean,
}

export function getDefaultPlotlyData(options: DataOptions): Partial<Plotly.Data> {
    return {
        name: options.name,
        x: options.x,
        y: options.y,
        mode: options.showMarkers ? 'lines+markers' : 'lines',
        opacity: 0.7,
        line: {
            color: options.lineColor,
            dash: 'solid',
            shape: 'hv'
        },
        hovertemplate: '%{x|%H:%M:%S} | %{y:.1f}°F<extra></extra>'
    };
}

export function getDefaultPlotLayout(): Partial<Plotly.Layout> {
    const root = document.documentElement;
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // const isDarkMode = root.getAttribute('data-theme') === 'dark' ||
    //     (root.getAttribute('data-theme') === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return {
        autosize: true,
        height: 375,
        title: {
            text: 'Heat pump',
            x: 0.5,
            xanchor: 'center',
            font: {
                color: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
            }
        },
        margin: {
            t: 30,
            b: 30,
        },
        plot_bgcolor: isDarkMode ? '#1b1b1c' : 'white',
        paper_bgcolor: isDarkMode ? '#1b1b1c' : 'white',
        font: {
            color: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
        },
        xaxis: {
            mirror: true,
            type: 'date',
            ticks: 'outside',
            showline: true,
            linecolor: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
            automargin: true,
        },
        yaxis: {
            mirror: true,
            ticks: 'outside',
            showline: true,
            zeroline: false,
            showgrid: true,
            gridwidth: 1,
            linecolor: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
            gridcolor: isDarkMode ? '#424242' : 'LightGray',
        },
        yaxis2: {
            mirror: true,
            ticks: 'outside',
            showline: true,
            zeroline: false,
            showgrid: false,
            linecolor: isDarkMode ? '#b5b5b5' : 'rgb(42,63,96)',
            overlaying: 'y',
            side: 'right'
        },
        legend: {
            x: 0,
            y: 1,
            xanchor: 'left',
            yanchor: 'top',
            bgcolor: 'rgba(0,0,0,0)'
        }
    };
}

export function getDefaultPlotConfig(): Partial<Plotly.Config> {
    return {
        displayModeBar: false,
        staticPlot: false,
        responsive: true
    };
}