import { useContext, useMemo, useState } from 'react';

import SingleInstallationPicker from '../_shared/SingleInstallationPicker';
import SessionContext, { installationRoleForGNode } from '../_util/SessionContext';
import { useRouteInfo } from '../_util/useRouteInfo';

import './InformationPage.css';

type InfoSection = 'Address' | 'contact' | 'status' | 'hardware';

export default function InformationPage() {
  const session = useContext(SessionContext);
  const { installationGNode } = useRouteInfo();
  const installation = installationRoleForGNode(session?.installations, installationGNode);

  const [activeSection, setActiveSection] = useState<InfoSection | null>(null);

  const selectedHouseDisplay = (installation?.GNodeAlias || installation?.DisplayName || '').trim();
  const statusValue = useMemo(() => {
    const s = installation?.AlertStatus;
    if (s === 'ok') return 'OK';
    if (s === 'alert') return 'Alert';
    return 'Unknown';
  }, [installation?.AlertStatus]);
  const hasSelectedHouse = selectedHouseDisplay.length > 0;
  const hardwareValue = JSON.stringify(installation?.HardwareLayout) || 'None';

  const AddressRows = [
    ['Street', installation?.Address?.street],
    ['City', installation?.Address?.city],
    ['State', installation?.Address?.state],
    ['ZIP', installation?.Address?.zip],
    ['Country', installation?.Address?.country],
    ['Coordinates',
      installation?.Address?.latitude != null && installation?.Address?.longitude != null
        ? `${installation.Address.latitude}, ${installation.Address.longitude}`
        : undefined],
  ].filter(([, value]) => !!value);

  const primaryContactRows = [
    ['First name', installation?.PrimaryContact?.FirstName],
    ['Last name', installation?.PrimaryContact?.LastName],
    ['Email', installation?.PrimaryContact?.Email],
    ['Phone', installation?.PrimaryContact?.Phone],
  ].filter(([, value]) => !!value);

  const secondaryContactRows = [
    ['First name', installation?.SecondaryContact?.FirstName],
    ['Last name', installation?.SecondaryContact?.LastName],
    ['Email', installation?.SecondaryContact?.Email],
    ['Phone', installation?.SecondaryContact?.Phone],
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
            <SingleInstallationPicker />
          </div>
        </div>

        <div className="d-flex gap-2 mb-4" style={{ marginBottom: '0 !important' }}>
          <button className="btn btn-sm btn-outline-secondary" type="button" disabled={!hasSelectedHouse} onClick={() => toggleSection('Address')}>
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
          <div className="detail-item" style={{ display: activeSection === 'Address' ? 'block' : 'none' }}>
            <div className="detail-label">Address</div>
            <div className="detail-value">
              {hasSelectedHouse && AddressRows.length > 0 ? (
                <table className="detail-table">
                  <tbody>
                    {AddressRows.map(([label, value]) => (
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
              {hasSelectedHouse && installation?.AlertStatus ? (
                <>
                  <span
                    className={`badge ${installation.AlertStatus === 'ok' ? 'bg-success' : installation.AlertStatus === 'alert' ? 'bg-danger' : 'bg-secondary'}`}
                  >
                    {statusValue.toLowerCase()}
                    {installation.AlertMessage && installation.AlertStatus !== 'alert' ? (
                      <>
                        <br />
                        <small>{installation.AlertMessage}</small>
                      </>
                    ) : null}
                  </span>
                  {installation.AlertMessage ? (
                    <div className="mt-2 info-alert-message">Alert: {installation.AlertMessage}</div>
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
