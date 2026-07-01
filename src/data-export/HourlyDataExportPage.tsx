import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import JSZip from 'jszip';

import { getRequiredAuthToken } from '../auth/auth';
import SessionContext, { canViewDataFromDate, type InstallationRole } from '../_util/SessionContext';
import { useHouseTableSelection } from '../_util/useHouseTableSelection';
import {
  formatDate,
  formatTime,
  getDefaultDate,
  getNowInNewYork,
  wallDateTimeToUtc,
  wallDateTimeToUtcMs,
} from '../_util/newYorkTime';
import { getIsDarkMode } from '../_util/theme';
import {
  fetchHourlyPlots,
} from './fetchHourlyPlots';

import './DataExportPage.css';
import GridWorksApi from '../_util/GridWorksApi';
import MultiInstallationDisplay from '../_shared/MultiInstallationDisplay';

const EMPTY_INSTALLATIONS: InstallationRole[] = [];

export default function HourlyDataExportPage() {
  const session = useContext(SessionContext);
  const { selectedInstallationIds } = useHouseTableSelection();

  const installations = session?.installationRoles ?? EMPTY_INSTALLATIONS;


  const [hourlyStart, setHourlyStart] = useState(() => getDefaultDate(true));
  const [hourlyEnd, setHourlyEnd] = useState(() => getDefaultDate(false));
  const [hourlyCsvBusy, setHourlyCsvBusy] = useState(false);
  const [hourlyPlotBusy, setHourlyPlotBusy] = useState(false);
  const [hourlyPlotVisible, setHourlyPlotVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (hourlyAliases.length === 0) {
      setError('No house aliases available for hourly plot.');
      return;
    }
    const startMs = wallDateTimeToUtcMs(hourlyStart);
    const endMs = wallDateTimeToUtcMs(hourlyEnd);
    if (!isEndDateOldEnough(endMs, 10, hourlyAliases)) {
      setError('End time must be at least 10 days in the past when viewer access applies to any selected installation.');
      return;
    }

    setHourlyPlotBusy(true);
    try {
      revokeHourlyPlotBlobUrls();
      const host = hourlyPlotHostRef.current;
      if (host) {
        host.innerHTML = '';
      }

      const result = await fetchHourlyPlots({
        token,
        selectedShortAliases: hourlyAliases,
        startMs,
        endMs,
        darkmode: getIsDarkMode(),
      });

      if (result.kind === 'json_error') {
        if (result.message) {
          window.alert(result.message);
        }
        setHourlyPlotVisible(true);
        const mount = hourlyPlotHostRef.current;
        if (mount) {
          const el = document.createElement('div');
          el.style.cssText = 'color: var(--text-muted); text-align: center; padding: 2rem; font-size: 0.875rem;';
          el.textContent = 'Could not find data for the selected house(s) during this period.';
          mount.appendChild(el);
        }
        return;
      }

      const zip = await JSZip.loadAsync(result.blob);
      setHourlyPlotVisible(true);
      const plotHost = hourlyPlotHostRef.current;
      if (!plotHost) {
        return;
      }

      plotHost.innerHTML = '';

      let hasPlots = false;
      const narrow = typeof window !== 'undefined' && window.innerWidth < 650;

      for (const filename of Object.keys(zip.files)) {
        if (!filename.endsWith('.html') || zip.files[filename].dir) {
          continue;
        }
        const text = await zip.files[filename].async('text');
        hasPlots = true;
        const htmlBlob = new Blob([text], { type: 'text/html' });
        const htmlUrl = URL.createObjectURL(htmlBlob);
        hourlyPlotBlobUrlsRef.current.push(htmlUrl);

        const iframe = document.createElement('iframe');
        iframe.src = htmlUrl;
        iframe.style.width = narrow ? '100%' : '97.5%';
        iframe.style.height = '375px';
        iframe.style.maxWidth = '1500px';
        iframe.style.border = 'none';
        plotHost.appendChild(iframe);
      }

      if (!hasPlots) {
        const d = document.createElement('div');
        d.style.cssText = 'color: var(--danger-color); text-align: center; padding: 2rem; font-size: 0.875rem;';
        d.textContent = 'Could not find data for this house and time frame';
        plotHost.appendChild(d);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hourly plot failed.');
      revokeHourlyPlotBlobUrls();
      const h = hourlyPlotHostRef.current;
      if (h) {
        h.innerHTML = '';
      }
      setHourlyPlotVisible(false);
    } finally {
      setHourlyPlotBusy(false);
    }
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
            <button type="button" className="filter-toggle" onClick={undefined}>
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

        {/* <div id="data-export-electricity-plot-container" className="plot-container" style={{ display: hourlyPlotVisible ? 'flex' : 'none' }}>
          <div ref={hourlyPlotHostRef} className="plot-div visualizer-server-plots-root" />
        </div> */}
      </div>
    </div>
  );
}
