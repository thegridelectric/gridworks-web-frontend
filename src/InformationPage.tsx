import { useContext, useMemo, useState } from 'react';

import InstallationPicker from './_shared/InstallationPicker';
import SessionContext, { installationForRouteId } from './_util/SessionContext';
import { useRouteInfo } from './_util/useRouteInfo';

import './visualizer/VisualizerPage.css';
import './InformationPage.css';

type InfoSection = 'address' | 'contact' | 'status' | 'hardware';

export default function InformationPage() {
  const session = useContext(SessionContext);
  const { currentInstallationId } = useRouteInfo();
  const installation = installationForRouteId(session?.installations, currentInstallationId);

  const [activeSection, setActiveSection] = useState<InfoSection | null>(null);

  const selectedHouseDisplay = (installation?.houseAlias || installation?.displayName || '').trim();
  const statusValue = useMemo(() => {
    const s = installation?.alertStatus;
    if (s === 'ok') return 'OK';
    if (s === 'alert') return 'Alert';
    return 'Unknown';
  }, [installation?.alertStatus]);
  const hasSelectedHouse = selectedHouseDisplay.length > 0;
  const hardwareValue = installation?.hardwareLayout?.trim() || 'None';

  const addressRows = [
    ['Street', installation?.address?.street],
    ['City', installation?.address?.city],
    ['State', installation?.address?.state],
    ['ZIP', installation?.address?.zip],
    ['Country', installation?.address?.country],
    ['Coordinates',
      installation?.address?.latitude != null && installation?.address?.longitude != null
        ? `${installation.address.latitude}, ${installation.address.longitude}`
        : undefined],
  ].filter(([, value]) => !!value);

  const primaryContactRows = [
    ['First name', installation?.primaryContact?.firstName],
    ['Last name', installation?.primaryContact?.lastName],
    ['Email', installation?.primaryContact?.email],
    ['Phone', installation?.primaryContact?.phone],
  ].filter(([, value]) => !!value);

  const secondaryContactRows = [
    ['First name', installation?.secondaryContact?.firstName],
    ['Last name', installation?.secondaryContact?.lastName],
    ['Email', installation?.secondaryContact?.email],
    ['Phone', installation?.secondaryContact?.phone],
  ].filter(([, value]) => !!value);

  function toggleSection(section: InfoSection) {
    setActiveSection((prev) => (prev === section ? null : section));
  }

  function clearInfoCard() {
    setActiveSection(null);
  }

  const hasVisibleSections = activeSection !== null;

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
            <InstallationPicker />
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
            <div className="detail-value">
              {hasSelectedHouse && addressRows.length > 0 ? (
                <table className="detail-table">
                  <tbody>
                    {addressRows.map(([label, value]) => (
                      <tr key={label}>
                        <th>{label}</th>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : 'None'}
            </div>
          </div>

          <div className="detail-item" style={{ display: activeSection === 'contact' ? 'block' : 'none' }}>
            <div className="detail-label">Contact</div>
            <div className="detail-value">
              {!hasSelectedHouse || (primaryContactRows.length === 0 && secondaryContactRows.length === 0) ? (
                'None'
              ) : (
                <>
                  {primaryContactRows.length > 0 && (
                    <div className="contact-section">
                      <div className="detail-label">Primary Contact</div>
                      <table className="detail-table">
                        <tbody>
                          {primaryContactRows.map(([label, value]) => (
                            <tr key={`primary-${label}`}>
                              <th>{label}</th>
                              <td>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {secondaryContactRows.length > 0 && (
                    <div className="contact-section">
                      <div className="detail-label detail-label-secondary-contact">Secondary Contact</div>
                      <table className="detail-table">
                        <tbody>
                          {secondaryContactRows.map(([label, value]) => (
                            <tr key={`secondary-${label}`}>
                              <th>{label}</th>
                              <td>{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="detail-item" style={{ display: activeSection === 'status' ? 'block' : 'none' }}>
            <div className="detail-label">Status</div>
            <div className="detail-value">
              {hasSelectedHouse && installation?.alertStatus ? (
                <>
                  <span
                    className={`badge ${installation.alertStatus === 'ok' ? 'bg-success' : installation.alertStatus === 'alert' ? 'bg-danger' : 'bg-secondary'}`}
                  >
                    {statusValue.toLowerCase()}
                    {installation.alertMessage && installation.alertStatus !== 'alert' ? (
                      <>
                        <br />
                        <small>{installation.alertMessage}</small>
                      </>
                    ) : null}
                  </span>
                  {installation.alertMessage ? (
                    <div className="mt-2 info-alert-message">Alert: {installation.alertMessage}</div>
                  ) : null}
                </>
              ) : 'None'}
            </div>
          </div>

          <div className="detail-item" style={{ display: activeSection === 'hardware' ? 'block' : 'none' }}>
            <div className="detail-label">Hardware</div>
            <div className="detail-value">{hasSelectedHouse ? hardwareValue : 'None'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
