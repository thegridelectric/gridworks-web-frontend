import { useContext, useState, type CSSProperties } from 'react';
import { Navigate, useLocation } from 'react-router';

import { getAuthToken } from '../auth/auth';
import SessionContext, { installationForRouteId } from '../_util/SessionContext';
import { parsePathname } from '../_util/urlUtility';
import { requestVisualizerCsv } from '../visualizer/fetchVisualizerCsv';
import InstallationPicker from '../_shared/InstallationPicker';
import {
  ALL_CHANNEL_IDS,
  CHANNEL_SECTIONS,
  formatDate,
  formatTime,
  getDefaultDate,
  isEndDateOldEnough,
  triggerBlobDownload,
  wallDateTimeToUtcMs,
} from './dataExportShared';

import '../visualizer/VisualizerPage.css';
import '../DataExportPage.css';

const LABEL_MUTED: CSSProperties = {
  fontSize: '0.875rem',
  color: 'var(--text-muted)',
};

export default function ChannelDataExportPage() {
  const session = useContext(SessionContext);
  const location = useLocation();
  const { currentInstallationId } = parsePathname(location.pathname);
  const installation = installationForRouteId(session?.installations, currentInstallationId);

  const authToken = getAuthToken();

  if (!authToken) {
    return <Navigate to="/login/" replace state={{ from: location.pathname }} />;
  }
  const token = authToken;

  const houseAliasForCsv = (installation?.houseAlias?.trim() || installation?.id || '').trim();

  const [channelStart, setChannelStart] = useState(() => getDefaultDate(true));
  const [channelEnd, setChannelEnd] = useState(() => getDefaultDate(false));
  const [timestep, setTimestep] = useState('1');
  const [channelIds, setChannelIds] = useState<Set<string>>(() => new Set(ALL_CHANNEL_IDS));
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [channelBusy, setChannelBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setNowEnd(setter: (d: Date) => void) {
    const nyDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    nyDate.setMinutes(nyDate.getMinutes() + 1);
    setter(nyDate);
  }

  function toggleChannel(id: string) {
    setChannelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllChannels() {
    setChannelIds(new Set(ALL_CHANNEL_IDS));
  }

  function unselectAllChannels() {
    setChannelIds(new Set());
  }

  async function onChannelCsv() {
    setError(null);
    if (!houseAliasForCsv) {
      setError('Select a house first.');
      return;
    }
    const selected = [...channelIds];
    if (selected.length === 0) {
      setError('Select at least one channel.');
      return;
    }
    const startMs = wallDateTimeToUtcMs(channelStart);
    const endMs = wallDateTimeToUtcMs(channelEnd);
    if (!isEndDateOldEnough(endMs, 10)) {
      setError('End time must be at least 10 days in the past (unless you are admin).');
      return;
    }

    setChannelBusy(true);
    try {
      let confirmWithUser = false;
      for (;;) {
        const result = await requestVisualizerCsv({
          token,
          houseAlias: houseAliasForCsv,
          startMs,
          endMs,
          selectedChannels: selected,
          timestep: timestep.trim() || '1',
          confirmWithUser,
        });
        if (result.type === 'file') {
          triggerBlobDownload(result.blob, result.filename);
          return;
        }
        if (result.type === 'confirm') {
          if (window.confirm(result.message)) {
            confirmWithUser = true;
            continue;
          }
          return;
        }
        setError(result.message);
        return;
      }
    } finally {
      setChannelBusy(false);
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
          <h5 className="card-title mb-0">Download channel data</h5>
          <div className="status-badges">
            <div className="loader" style={{ display: channelBusy ? 'inline-block' : 'none' }} aria-hidden={!channelBusy} />
          </div>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <label className="form-label" style={LABEL_MUTED}>
              Selected House
            </label>
            <div className="selected-house-picker">
              <InstallationPicker />
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
                    value={formatDate(channelStart)}
                    disabled={channelBusy}
                    onChange={(ev) => {
                      const d = new Date(channelStart);
                      const [y, m, day] = ev.target.value.split('-').map(Number);
                      d.setFullYear(y, m - 1, day);
                      setChannelStart(d);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    className="form-control text-light"
                    value={formatTime(channelStart)}
                    disabled={channelBusy}
                    onChange={(ev) => {
                      const d = new Date(channelStart);
                      const [hh, mm] = ev.target.value.split(':').map(Number);
                      d.setHours(hh, mm, 0, 0);
                      setChannelStart(d);
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
                    value={formatDate(channelEnd)}
                    disabled={channelBusy}
                    onChange={(ev) => {
                      const d = new Date(channelEnd);
                      const [y, m, day] = ev.target.value.split('-').map(Number);
                      d.setFullYear(y, m - 1, day);
                      setChannelEnd(d);
                    }}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    className="form-control text-light"
                    value={formatTime(channelEnd)}
                    disabled={channelBusy}
                    onChange={(ev) => {
                      const d = new Date(channelEnd);
                      const [hh, mm] = ev.target.value.split(':').map(Number);
                      d.setHours(hh, mm, 0, 0);
                      setChannelEnd(d);
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <div className="d-flex gap-2 align-items-center mb-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={channelBusy || !token || !houseAliasForCsv}
              style={{ opacity: channelBusy ? 0.5 : 1 }}
              onClick={onChannelCsv}
            >
              CSV
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setNowEnd(setChannelEnd)}
              disabled={channelBusy}
              style={{ opacity: channelBusy ? 0.5 : 1 }}
            >
              Now
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setOptionsOpen((o) => !o)}
              disabled={channelBusy}
              style={{ opacity: channelBusy ? 0.5 : 1 }}
            >
              Options
            </button>
          </div>

          {optionsOpen && (
            <div className="options-container mb-0" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="options-content">
                <div className="options-section mt-3">
                  <h6>Time step (seconds)</h6>
                  <input
                    type="number"
                    className="form-control border-secondary"
                    style={{ marginLeft: 10, marginBottom: '2rem', maxWidth: 100 }}
                    min={1}
                    value={timestep}
                    disabled={channelBusy}
                    onChange={(e) => setTimestep(e.target.value)}
                  />
                </div>
                <div className="options-section">
                  <h6>Channel selection</h6>
                  <div className="d-flex gap-2 mb-2">
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={selectAllChannels} disabled={channelBusy}>
                      Select all
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={unselectAllChannels} disabled={channelBusy}>
                      Unselect all
                    </button>
                  </div>
                </div>
                <div className="data-export-channel-options">
                  {CHANNEL_SECTIONS.map((section) => (
                    <div key={section.title} className="options-section">
                      <h6>{section.title}</h6>
                      {section.items.map((item) => (
                        <label key={item.id}>
                          <input
                            type="checkbox"
                            checked={channelIds.has(item.id)}
                            disabled={channelBusy}
                            onChange={() => toggleChannel(item.id)}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
