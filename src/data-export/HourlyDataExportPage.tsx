import { useContext, useState } from 'react';

import SessionContext, { canViewDataFromDate } from '../_util/SessionContext';
import { useHouseTableSelection } from '../_util/useHouseTableSelection';
import {
  formatDate,
  formatTime,
  getDefaultDate,
  getNowInNewYork,
  wallDateTimeToUtc,
} from '../_util/newYorkTime';
import { getIsDarkMode } from '../_util/theme';

import './DataExportPage.css';
import GridWorksApi from '../_util/GridWorksApi';
import MultiInstallationDisplay from '../_shared/MultiInstallationDisplay';
import { PlotlyWrapper } from '../visualizer/PlotlyWrapper';
import Plot, { type PlotParams } from 'react-plotly.js';
import type { Layout, PlotData } from 'plotly.js';
import { formatForDisplay, getDefaultPlotLayout } from '../visualizer/plot-configs';
import { DateTime } from 'luxon';
import type { InstallationSummary } from '../sema';

const EMPTY_INSTALLATIONS: InstallationSummary[] = [];

interface HourlyElectricityApiResponseItem {
  0: string,
  1: number,
  2: number
}

export default function HourlyDataExportPage() {
  const session = useContext(SessionContext);
  const { selectedInstallationIds, clearInstallationSelection } = useHouseTableSelection();

  const installations = session?.installations ?? EMPTY_INSTALLATIONS;


  const [hourlyStart, setHourlyStart] = useState(() => getDefaultDate(true));
  const [hourlyEnd, setHourlyEnd] = useState(() => getDefaultDate(false));
  const [hourlyCsvBusy, setHourlyCsvBusy] = useState(false);
  const [hourlyPlotBusy, setHourlyPlotBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plotData, setPlotData] = useState<HourlyElectricityApiResponseItem[] | null>(null);

  const hourlyActionsBusy = hourlyCsvBusy || hourlyPlotBusy;

  function setNowEnd(setter: (d: Date) => void) {
    const nyDate = getNowInNewYork();
    nyDate.setMinutes(nyDate.getMinutes() + 1);
    setter(nyDate);
  }

  async function onHourlyCsv() {
    setError(null);
    if (selectedInstallationIds.size === 0) {
      setError('No house aliases available for hourly export.');
      return;
    }
    const startDate = wallDateTimeToUtc(hourlyStart);
    const endDate = wallDateTimeToUtc(hourlyEnd);

    if (startDate == null || endDate == null) {
      return;
    }

    if (!canViewDataFromDate(session, [...selectedInstallationIds], startDate)) {

      setError('Access restricted: the end date must be more than 10 days in the past. Please choose an earlier end date and try again.');
      return;
    }

    const url = selectedInstallationIds.size === 1 ?
      `/api/v2/installations/${[...selectedInstallationIds][0]}/hourly.data` :
      `/api/v2/installations/${[...selectedInstallationIds].sort().join(',')}/hourly.electricity`;

    setHourlyCsvBusy(true);
    try {
      await GridWorksApi.get(url,
        {
          params: {
            start: startDate.toISO(),
            end: endDate.toISO(),
            dl: true
          },
          responseType: 'blob'
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(message);
    } finally {
      setHourlyCsvBusy(false);
    }
  }

  async function onHourlyPlot() {
    setError(null);
    if (selectedInstallationIds.size === 0) {
      setError('No house aliases available for hourly plot.');
      return;
    }
    const startDate = wallDateTimeToUtc(hourlyStart);
    const endDate = wallDateTimeToUtc(hourlyEnd);

    if (startDate == null || endDate == null) {
      return;
    }

    if (!canViewDataFromDate(session, [...selectedInstallationIds], startDate)) {

      setError('Access restricted: the end date must be more than 10 days in the past. Please choose an earlier end date and try again.');
      return;
    }

    setHourlyPlotBusy(true);
    try {
      const apiResult = await GridWorksApi.get(`/api/v2/installations/${[...selectedInstallationIds].sort().join(',')}/hourly.electricity`,
        {
          params: {
            start: startDate.toISO(),
            end: endDate.toISO(),
          },
        }
      );
      setPlotData(apiResult.data as HourlyElectricityApiResponseItem[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(message);
    } finally {
      setHourlyPlotBusy(false);
    }
  }


  let plotContent: React.ReactNode;
  if (plotData) {

    const isDarkMode = getIsDarkMode();

    const timeValues = plotData.map(p => DateTime.fromISO(p[0]));
    const usageValues = plotData.map(p => p[1]);
    const priceValues = plotData.map(p => p[2]);

    const usagePlotData: Partial<PlotData> = {
      type: 'bar',
      x: timeValues.map(dt => formatForDisplay(dt.plus({ minutes: 30 }))),
      y: usageValues,
      opacity: isDarkMode ? 0.6 : 0.3,
      marker: {
        color: '#2a4ca2',
        line: {
          width: 0
        }
      },
      name: 'Electricity Used',
      showlegend: true,
      hovertemplate: "%{x|%H}:00-%{x|%H}:59 | %{y:.1f} kWh<extra></extra>",
      width: Array(timeValues.length).fill(3600000 / 1.2)
    }

    const pricePlotData: Partial<PlotData> = {
      type: 'scatter',
      x: timeValues.map(dt => formatForDisplay(dt)),
      y: priceValues,
      mode: 'lines',
      opacity: 0.8,
      line: {
        color: 'red',
        shape: 'hv'
      },
      name: 'Electricity Price',
      showlegend: true,
      hovertemplate: '%{x|%H:%M} | %{y:.2f} $/MWh<extra></extra>',
      yaxis: 'y2'
    }

    const plotlyLayout: Partial<Layout> = getDefaultPlotLayout(isDarkMode);

    plotlyLayout.title = {
      ...plotlyLayout.title,
      text: ''
    };
    plotlyLayout.yaxis = {
      ...plotlyLayout.yaxis,
      title: {
        ...plotlyLayout?.yaxis?.title,
        text: 'Quantity [kWh]',

      },
      range: [0, 1.3 * Math.max(3, ...usageValues)],
    };
    plotlyLayout.yaxis2 = {
      ...plotlyLayout.yaxis2,
      title: {
        ...plotlyLayout?.yaxis2?.title,
        text: 'Price [$/MWh]',

      },
      range: [0, 1.3 * Math.max(10, ...priceValues)],
    };

    const plotParams: Partial<PlotParams> = {
      config: {
        displayModeBar: false,
        responsive: true,
      },
      style: { width: '100%', height: '100%' },
      useResizeHandler: true
    }


    plotContent = <Plot data={[usagePlotData, pricePlotData]} layout={plotlyLayout} {...plotParams} />

  } else if (hourlyPlotBusy) {
    plotContent = <div className="loader" aria-label="Loading plot data" />;
  }


  return (
    <div className="data-export-page">
      {error && (
        <div className="alert alert-danger mb-3" role="alert">
          {error}
        </div>
      )}

      <div className="card visualizer-card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">Download hourly data</h5>
          <div className="status-badges">
            <div className="loader" style={{ display: hourlyActionsBusy ? 'inline-block' : 'none' }} aria-hidden={!hourlyActionsBusy} />
            <button type="button" className="filter-toggle" onClick={evt => { evt.preventDefault(); clearInstallationSelection(); }}>
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <div className="mb-4">
              <label
                className="form-label morning-selected-house-label"
                htmlFor="morning-selected-house"
              >
                Selected House(s)
              </label>
              <MultiInstallationDisplay installations={installations} selectedInstallationIds={selectedInstallationIds} />
            </div>
          </div>

          <table className="table table-borderless mb-4 data-query-form">
            <tbody>
              <tr>
                <td>Start</td>
                <td>
                  <input
                    type="date"
                    className="form-control text-light"
                    value={formatDate(hourlyStart)}
                    disabled={hourlyActionsBusy}
                    onChange={(ev) => {
                      const d = new Date(hourlyStart);
                      const [y, m, day] = ev.target.value.split('-').map(Number);
                      d.setFullYear(y, m - 1, day);
                      setHourlyStart(d);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    className="form-control text-light"
                    value={formatTime(hourlyStart)}
                    disabled={hourlyActionsBusy}
                    onChange={(ev) => {
                      const d = new Date(hourlyStart);
                      const [hh, mm] = ev.target.value.split(':').map(Number);
                      d.setHours(hh, mm, 0, 0);
                      setHourlyStart(d);
                    }}
                  />
                </td>
              </tr>
              <tr>
                <td>End</td>
                <td>
                  <input
                    type="date"
                    className="form-control text-light"
                    value={formatDate(hourlyEnd)}
                    disabled={hourlyActionsBusy}
                    onChange={(ev) => {
                      const d = new Date(hourlyEnd);
                      const [y, m, day] = ev.target.value.split('-').map(Number);
                      d.setFullYear(y, m - 1, day);
                      setHourlyEnd(d);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    className="form-control text-light"
                    value={formatTime(hourlyEnd)}
                    disabled={hourlyActionsBusy}
                    onChange={(ev) => {
                      const d = new Date(hourlyEnd);
                      const [hh, mm] = ev.target.value.split(':').map(Number);
                      d.setHours(hh, mm, 0, 0);
                      setHourlyEnd(d);
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="d-flex gap-2 align-items-center">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={hourlyActionsBusy || selectedInstallationIds.size === 0}
              style={{ opacity: hourlyActionsBusy ? 0.5 : 1 }}
              onClick={onHourlyPlot}
            >
              Plot
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={hourlyActionsBusy || selectedInstallationIds.size === 0}
              style={{ opacity: hourlyActionsBusy ? 0.5 : 1 }}
              onClick={onHourlyCsv}
            >
              CSV
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setNowEnd(setHourlyEnd)}
              disabled={hourlyActionsBusy}
              style={{ opacity: hourlyActionsBusy ? 0.5 : 1 }}
            >
              Now
            </button>
          </div>
        </div>

        {plotContent &&
          <PlotlyWrapper>{plotContent}</PlotlyWrapper>
        }

        {/* <div id="data-export-electricity-plot-container" className="plot-container" style={{ display: hourlyPlotVisible ? 'flex' : 'none' }}>
          <div ref={hourlyPlotHostRef} className="plot-div visualizer-server-plots-root" />
        </div> */}
      </div>
    </div>
  );
}
