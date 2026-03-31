import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import JSZip from 'jszip';
import { Navigate, useLocation } from 'react-router';

import { getAuthToken } from '../auth/auth';
import SessionContext, { type BasicInstallationInfo } from '../_util/SessionContext';
import { useHouseTableSelection } from '../_util/HouseTableSelectionContext';
import { getIsDarkMode } from '../_util/theme';
import {
  downloadHourlyDataCsv,
} from './downloadHourlyDataCsv';
import {
  fetchHourlyPlots,
} from './fetchHourlyPlots';
import {
  formatDate,
  formatTime,
  getDefaultDate,
  isEndDateOldEnough,
  triggerBlobDownload,
  wallDateTimeToUtcMs,
} from './dataExportShared';

import './DataExportPage.css';

const LABEL_MUTED: CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--text-muted)',
};

export default function HourlyDataExportPage() {
  const session = useContext(SessionContext);
  const location = useLocation();
  const { selectedInstallationIds } = useHouseTableSelection();

  const authToken = getAuthToken();

  if (!authToken) {
    return <Navigate to="/login/" replace state={{ from: location.pathname }} />;
  }
  const token = authToken;

  const hourlyPlotHostRef = useRef<HTMLDivElement>(null);
  const hourlyPlotBlobUrlsRef = useRef<string[]>([]);

  const installations = session?.installations ?? [];

  function aliasesForHourlyQuery(selectedIds: ReadonlySet<string>, installs: BasicInstallationInfo[]): string[] {
    if (installs.length === 0) {
      return [];
    }
    if (selectedIds.size === 0) {
      const all: string[] = [];
      for (const inst of installs) {
        const a = (inst.houseAlias || inst.displayName || '').trim();
        if (a) {
          all.push(a);
        }
      }
      return all;
    }
    const out: string[] = [];
    for (const inst of installs) {
      if (!selectedIds.has(String(inst.id))) {
        continue;
      }
      const a = (inst.houseAlias || inst.displayName || '').trim();
      if (a) {
        out.push(a);
      }
    }
    return out;
  }

  function selectedHouseFieldValue(selectedIds: ReadonlySet<string>, installs: BasicInstallationInfo[]): string {
    if (selectedIds.size === 0) {
      return '';
    }
    const aliases: string[] = [];
    for (const inst of installs) {
      if (!selectedIds.has(String(inst.id))) {
        continue;
      }
      const a = (inst.houseAlias || inst.displayName || '').trim();
      if (a) {
        aliases.push(a);
      }
    }
    return aliases.join(', ');
  }

  const hourlyAliases = useMemo(() => aliasesForHourlyQuery(selectedInstallationIds, installations), [selectedInstallationIds, installations]);
  const hourlySelectedHouseDisplay = useMemo(
    () => selectedHouseFieldValue(selectedInstallationIds, installations),
    [selectedInstallationIds, installations],
  );

  const [hourlyStart, setHourlyStart] = useState(() => getDefaultDate(true));
  const [hourlyEnd, setHourlyEnd] = useState(() => getDefaultDate(false));
  const [hourlyCsvBusy, setHourlyCsvBusy] = useState(false);
  const [hourlyPlotBusy, setHourlyPlotBusy] = useState(false);
  const [hourlyPlotVisible, setHourlyPlotVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hourlyActionsBusy = hourlyCsvBusy || hourlyPlotBusy;

  useEffect(() => {
    return () => {
      for (const u of hourlyPlotBlobUrlsRef.current) {
        URL.revokeObjectURL(u);
      }
      hourlyPlotBlobUrlsRef.current = [];
    };
  }, []);

  function revokeHourlyPlotBlobUrls() {
    for (const u of hourlyPlotBlobUrlsRef.current) {
      URL.revokeObjectURL(u);
    }
    hourlyPlotBlobUrlsRef.current = [];
  }

  function clearHourlyPlots() {
    revokeHourlyPlotBlobUrls();
    const host = hourlyPlotHostRef.current;
    if (host) {
      host.innerHTML = '';
    }
    setHourlyPlotVisible(false);
  }

  function setNowEnd(setter: (d: Date) => void) {
    const nyDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    nyDate.setMinutes(nyDate.getMinutes() + 1);
    setter(nyDate);
  }

  async function onHourlyCsv() {
    setError(null);
    if (hourlyAliases.length === 0) {
      setError('No house aliases available for hourly export.');
      return;
    }
    const startMs = wallDateTimeToUtcMs(hourlyStart);
    const endMs = wallDateTimeToUtcMs(hourlyEnd);
    if (!isEndDateOldEnough(endMs, 10)) {
      setError('End time must be at least 10 days in the past (unless you are admin).');
      return;
    }

    setHourlyCsvBusy(true);
    try {
      const { blob, filename } = await downloadHourlyDataCsv({
        token,
        selectedShortAliases: hourlyAliases,
        startMs,
        endMs,
      });
      triggerBlobDownload(blob, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hourly CSV download failed.');
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
    if (!isEndDateOldEnough(endMs, 10)) {
      setError('End time must be at least 10 days in the past (unless you are admin).');
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
            <button type="button" className="filter-toggle" onClick={clearHourlyPlots}>
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="mb-4">
            <label className="form-label" style={LABEL_MUTED} htmlFor="data-export-hourly-house">
              Selected House(s)
            </label>
            <input
              id="data-export-hourly-house"
              type="text"
              className="form-control text-light border-secondary data-export-hourly-house-input"
              readOnly
              placeholder="All houses in the table"
              value={hourlySelectedHouseDisplay}
            />
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
              disabled={hourlyActionsBusy || !token || hourlyAliases.length === 0}
              style={{ opacity: hourlyActionsBusy ? 0.5 : 1 }}
              onClick={onHourlyPlot}
            >
              Plot
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={hourlyActionsBusy || !token || hourlyAliases.length === 0}
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

        <div id="data-export-electricity-plot-container" className="plot-container" style={{ display: hourlyPlotVisible ? 'flex' : 'none' }}>
          <div ref={hourlyPlotHostRef} className="plot-div visualizer-server-plots-root" />
        </div>
      </div>
    </div>
  );
}
