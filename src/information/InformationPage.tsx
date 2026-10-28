import { useContext, useState } from 'react';
import { DateTime } from 'luxon';

import SingleInstallationPicker from '../_shared/SingleInstallationPicker';
import SessionContext, { installationRoleForGNode } from '../_util/SessionContext';
import { useRouteInfo } from '../_util/useRouteInfo';
import { layoutHasSiegLoop } from '../sema/plantLoops';

import './InformationPage.css';

type InfoSection = 'address' | 'contact' | 'status' | 'hardware';

/** Address and Contact live in the private customer store, which the
 *  dashboard does not read yet; operators use its CLI. */
const NOT_SHOWN = 'Not shown here';

function formatTime(iso: string | null | undefined): string | undefined {
  if (!iso) {
    return undefined;
  }
  return DateTime.fromISO(iso).toLocal().toFormat('yyyy-LL-dd HH:mm:ss ZZZZ');
}

export default function InformationPage() {
  const session = useContext(SessionContext);
  const { installationGNode } = useRouteInfo();
  const installation = installationRoleForGNode(session?.installations, installationGNode);

  const [activeSection, setActiveSection] = useState<InfoSection | null>(null);

  const selectedHouseDisplay = (installation?.GNodeAlias || installation?.DisplayName || '').trim();
  const hasSelectedHouse = selectedHouseDisplay.length > 0;
  const layout = installation?.Layout ?? null;
  const status = installation?.OperatingStatus ?? null;

  const statusRows: [string, string | undefined][] = [
    ['Standby', status ? (status.Standby ? `yes (${status.StandbyPosture})` : 'no') : undefined],
    ['Service mode', status?.ServiceMode],
    ['Top state', status?.TopState],
    ['Status as of', status ? formatTime(DateTime.fromMillis(status.CreatedMs).toISO()) : undefined],
    ['Latest snapshot', formatTime(installation?.LatestSnapshotTime)],
    ['Longest running zone', installation?.LongestRunningZoneName ?? undefined],
    ['Calling since', formatTime(installation?.LongestRunningZoneStartTime)],
  ];
  const statusRowsShown = statusRows.filter(([, value]) => !!value);

  const hardwareRows: [string, string | undefined][] = layout
    ? [
        ['Layout', `${layout.TypeName} ${layout.Version}`],
        ['Hardware layout', layout.HardwareLayoutTypeName],
        ['Strategy', layout.Strategy],
        ['Seasonal storage mode', layout.SeasonalStorageMode],
        ['Store tanks', layout.TotalStoreTanks === undefined ? undefined : String(layout.TotalStoreTanks)],
        ['Zones', layout.ZoneList.join(', ')],
        ['Critical zones', layout.CriticalZoneList.join(', ') || undefined],
        ['Sieg loop', layoutHasSiegLoop(layout) ? 'yes' : 'no'],
        ['Data channels', String(layout.DataChannels.length)],
        ['Sent by', layout.FromGNodeAlias],
      ]
    : [];
  const hardwareRowsShown = hardwareRows.filter(([, value]) => !!value);

  function toggleSection(section: InfoSection) {
    setActiveSection((prev) => (prev === section ? null : section));
  }

  function clearInfoCard() {
    setActiveSection(null);
  }

  const hasVisibleSections = activeSection !== null;

  function detailTable(rows: [string, string | undefined][]) {
    return (
      <table className="detail-table">
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div className="card visualizer-card mb-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title">Information</h5>
        <div className="status-badges">
          <button className="filter-toggle" type="button" onClick={clearInfoCard}>
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4">
          <label className="form-label">Selected House</label>
          <div className="selected-house-picker">
            <SingleInstallationPicker />
          </div>
        </div>

        <div className="d-flex gap-2 mb-4" style={{ marginBottom: '0 !important' }}>
          <button className="btn btn-sm btn-outline-secondary" type="button" disabled={!hasSelectedHouse} onClick={() => toggleSection('address')}>
            Address
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" disabled={!hasSelectedHouse} onClick={() => toggleSection('contact')}>
            Contact
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" disabled={!hasSelectedHouse} onClick={() => toggleSection('status')}>
            Status
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" disabled={!hasSelectedHouse} onClick={() => toggleSection('hardware')}>
            Hardware
          </button>
        </div>

        <div className="details-grid info-details-grid" style={{ display: hasVisibleSections ? 'grid' : 'none' }}>
          <div className="detail-item" style={{ display: activeSection === 'address' ? 'block' : 'none' }}>
            <div className="detail-label">Address</div>
            <div className="detail-value">{hasSelectedHouse ? NOT_SHOWN : 'None'}</div>
          </div>

          <div className="detail-item" style={{ display: activeSection === 'contact' ? 'block' : 'none' }}>
            <div className="detail-label">Contact</div>
            <div className="detail-value">{hasSelectedHouse ? NOT_SHOWN : 'None'}</div>
          </div>

          <div className="detail-item" style={{ display: activeSection === 'status' ? 'block' : 'none' }}>
            <div className="detail-label">Status</div>
            <div className="detail-value">
              {hasSelectedHouse && statusRowsShown.length > 0 ? detailTable(statusRowsShown) : 'None'}
            </div>
          </div>

          <div className="detail-item" style={{ display: activeSection === 'hardware' ? 'block' : 'none' }}>
            <div className="detail-label">Hardware</div>
            <div className="detail-value">
              {hasSelectedHouse && hardwareRowsShown.length > 0 ? detailTable(hardwareRowsShown) : 'None'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
