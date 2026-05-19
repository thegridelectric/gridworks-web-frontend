import { useContext, useMemo, useState } from 'react';
import { Modal } from 'react-bootstrap';

import { getRequiredAuthToken } from '../auth/auth';
import SessionContext, { canViewDataFromDate, type InstallationRole } from '../_util/SessionContext';
import { useHouseTableSelection } from '../_util/useHouseTableSelection';
import {
    formatDate,
    formatTime,
    getDefaultDate,
    getNowInNewYork,
    wallDateTimeToUtcMs,
} from '../_util/newYorkTime';
import { getIsDarkMode } from '../_util/theme';
import {
    fetchMorningReportMessages,
    type MorningReportMessagesPayload,
} from './fetchMorningReportMessages';

import './MorningReportPage.css';

const MESSAGE_TYPES = [
    { value: 'gridworks.event.problem', label: 'gridworks.event.problem' },
    { value: 'glitch', label: 'glitch' },
] as const;
const EMPTY_INSTALLATIONS: InstallationRole[] = [];

function dataColumnKeys(data: MorningReportMessagesPayload): string[] {
    return Object.keys(data).filter(
        (k) =>
            k !== 'Details' &&
            k !== 'SummaryTable' &&
            k !== 'success' &&
            k !== 'message' &&
            k !== 'reload',
    );
}

function aliasesForQuery(
    selectedIds: ReadonlySet<string>,
    installations: InstallationRole[],
): string {
    if (selectedIds.size === 0) {
        return '';
    }
    const aliases: string[] = [];
    for (const inst of installations) {
        if (!selectedIds.has(String(inst.gNodeAlias))) {
            continue;
        }
        const a = (inst.gNodeAlias || inst.displayName || '').trim();
        if (a) {
            aliases.push(a);
        }
    }
    if (aliases.length === 0) {
        return '';
    }
    if (aliases.length === 1) {
        return aliases[0];
    }
    return aliases.join(',');
}

function selectedHouseFieldValue(
    selectedIds: ReadonlySet<string>,
    installations: InstallationRole[],
): string {
    if (selectedIds.size === 0) {
        return '';
    }
    const aliases: string[] = [];
    for (const inst of installations) {
        if (!selectedIds.has(String(inst.gNodeAlias))) {
            continue;
        }
        const a = (inst.gNodeAlias || inst.displayName || '').trim();
        if (a) {
            aliases.push(a);
        }
    }
    return aliases.join(', ');
}

function MorningReportPageContent() {
    const session = useContext(SessionContext);
    const { selectedInstallationIds } = useHouseTableSelection();

    const [startDateTime, setStartDateTime] = useState(() => getDefaultDate(true));
    const [endDateTime, setEndDateTime] = useState(() => getDefaultDate(false));
    const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
        () => new Set(MESSAGE_TYPES.map((m) => m.value)),
    );
    const [tableData, setTableData] = useState<MorningReportMessagesPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [detailRowIndex, setDetailRowIndex] = useState<number | null>(null);

    const token = getRequiredAuthToken();
    const installations = session?.installationRoles ?? EMPTY_INSTALLATIONS;

    const houseAliasParam = useMemo(
        () => aliasesForQuery(selectedInstallationIds, installations),
        [selectedInstallationIds, installations],
    );

    const selectedHouseDisplay = useMemo(
        () => selectedHouseFieldValue(selectedInstallationIds, installations),
        [selectedInstallationIds, installations],
    );

    const aliasesForDateLookback = useMemo(() => {
        if (houseAliasParam.trim()) {
            return houseAliasParam.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
        }
        return installations
            .map((i) => (i.gNodeAlias || i.displayName || '').trim())
            .filter((s) => s.length > 0);
    }, [houseAliasParam, installations]);

    function setNowEnd() {
        const nyDate = getNowInNewYork();
        nyDate.setMinutes(nyDate.getMinutes() + 1);
        setEndDateTime(nyDate);
    }

    function toggleMessageType(value: string) {
        setSelectedTypes((prev) => {
            const next = new Set(prev);
            if (next.has(value)) {
                next.delete(value);
            } else {
                next.add(value);
            }
            return next;
        });
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setTableData(null);

        const types = [...selectedTypes];
        if (types.length === 0) {
            setError('Select at least one message type.');
            return;
        }

        const startMs = wallDateTimeToUtcMs(startDateTime);
        const endMs = wallDateTimeToUtcMs(endDateTime);
        // TODO fix this
        if (!canViewDataFromDate(session, aliasesForDateLookback, startMs)) {
            setError('End time must be at least 10 days in the past when viewer access applies to any selected installation.');
            return;
        }

        setIsLoading(true);
        try {
            const data = await fetchMorningReportMessages({
                token,
                houseAlias: houseAliasParam,
                selectedMessageTypes: types,
                startMs,
                endMs,
                darkmode: getIsDarkMode(),
            });
            setTableData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load messages.');
        } finally {
            setIsLoading(false);
        }
    }

    function clearResults() {
        setTableData(null);
        setError(null);
        setDetailRowIndex(null);
    }

    const columnKeys = tableData ? dataColumnKeys(tableData) : [];
    const firstColumn =
        tableData && columnKeys[0]
            ? tableData[columnKeys[0] as keyof MorningReportMessagesPayload]
            : undefined;
    const rowCount = Array.isArray(firstColumn) ? firstColumn.length : 0;

    return (
        <>
            <div className="card visualizer-card morning-report-card" id="morning-report-card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Morning report</h5>
                    <div className="status-badges">
                        <div
                            className="loader"
                            id="morning-loader-spinner"
                            style={{ display: isLoading ? 'inline-block' : 'none' }}
                            aria-hidden={!isLoading}
                        />
                        <button
                            type="button"
                            className="filter-toggle"
                            onClick={clearResults}
                            title="Clear results"
                        >
                            <span>Clear</span>
                        </button>
                    </div>
                </div>
                <div className="p-4 morning-report-card-body">
                    <form onSubmit={onSubmit}>
                        <div className="mb-4">
                            <label
                                className="form-label morning-selected-house-label"
                                htmlFor="morning-selected-house"
                            >
                                Selected House(s)
                            </label>
                            <input
                                id="morning-selected-house"
                                type="text"
                                className="form-control text-light border-secondary"
                                readOnly
                                placeholder="All houses in the table"
                                value={selectedHouseDisplay}
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
                                            value={formatDate(startDateTime)}
                                            onChange={(ev) => {
                                                const d = new Date(startDateTime);
                                                const [y, m, day] = ev.target.value.split('-').map(Number);
                                                d.setFullYear(y, m - 1, day);
                                                setStartDateTime(d);
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            className="form-control text-light"
                                            value={formatTime(startDateTime)}
                                            onChange={(ev) => {
                                                const d = new Date(startDateTime);
                                                const [hh, mm] = ev.target.value.split(':').map(Number);
                                                d.setHours(hh, mm, 0, 0);
                                                setStartDateTime(d);
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
                                            value={formatDate(endDateTime)}
                                            onChange={(ev) => {
                                                const d = new Date(endDateTime);
                                                const [y, m, day] = ev.target.value.split('-').map(Number);
                                                d.setFullYear(y, m - 1, day);
                                                setEndDateTime(d);
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="time"
                                            className="form-control text-light"
                                            value={formatTime(endDateTime)}
                                            onChange={(ev) => {
                                                const d = new Date(endDateTime);
                                                const [hh, mm] = ev.target.value.split(':').map(Number);
                                                d.setHours(hh, mm, 0, 0);
                                                setEndDateTime(d);
                                            }}
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="mb-3">
                            <label className="form-label morning-message-types-label">Message types</label>
                            <div id="morning-checkboxDiv">
                                {MESSAGE_TYPES.map((m, i) => (
                                    <label
                                        key={m.value}
                                        className={
                                            i === MESSAGE_TYPES.length - 1
                                                ? 'morning-checkbox-label-last'
                                                : undefined
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            className="morning-message-type-checkbox"
                                            checked={selectedTypes.has(m.value)}
                                            onChange={() => toggleMessageType(m.value)}
                                        />
                                        {m.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="d-flex gap-2 align-items-center">
                            <button
                                type="submit"
                                className="btn btn-sm btn-outline-secondary"
                                disabled={isLoading || !token}
                            >
                                Get messages
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={setNowEnd}
                                disabled={isLoading}
                            >
                                Now
                            </button>
                        </div>
                    </form>

                    <div id="morning-table-container">
                        {error && (
                            <div className="alert alert-danger mt-3 mb-0" role="alert">
                                {error}
                            </div>
                        )}

                        {tableData && (
                            <div className="morning-report-table-wrap">
                                {tableData.SummaryTable && (
                                    <table className="summary-table">
                                        <tbody>
                                            <tr>
                                                <th>Log level</th>
                                                <th>Count</th>
                                            </tr>
                                            {Object.entries(tableData.SummaryTable).map(([level, count]) => (
                                                <tr key={level}>
                                                    <td>{level}</td>
                                                    <td>{count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {columnKeys.length > 0 && rowCount > 0 && (
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                {columnKeys.map((k) => (
                                                    <th key={k}>{k}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.from({ length: rowCount }, (_, i) => (
                                                <tr
                                                    key={i}
                                                    onClick={() => setDetailRowIndex(i)}
                                                    onKeyDown={(ke) => {
                                                        if (ke.key === 'Enter' || ke.key === ' ') {
                                                            ke.preventDefault();
                                                            setDetailRowIndex(i);
                                                        }
                                                    }}
                                                    tabIndex={0}
                                                    role="button"
                                                >
                                                    {columnKeys.map((k) => {
                                                        const col = tableData[
                                                            k as keyof typeof tableData
                                                        ] as string[] | undefined;
                                                        return <td key={k}>{col?.[i] ?? ''}</td>;
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal show={detailRowIndex !== null} onHide={() => setDetailRowIndex(null)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Message details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {detailRowIndex !== null &&
                        tableData &&
                        (() => {
                            const i = detailRowIndex;
                            const details = tableData.Details?.[i] ?? '';
                            const timeCreated = tableData['Time created']?.[i] ?? '';
                            const fromNode = tableData['From node']?.[i] ?? '';
                            const logLevel = tableData['Log level']?.[i] ?? '';
                            const summary = tableData.Summary?.[i] ?? '';
                            return (
                                <>
                                    <p>
                                        <strong>Log level:</strong> {logLevel}
                                    </p>
                                    <p>
                                        <strong>From node:</strong> {fromNode}
                                    </p>
                                    <p>
                                        <strong>Summary:</strong> {summary}
                                    </p>
                                    <p>
                                        <strong>Time created:</strong> {timeCreated}
                                    </p>
                                    <p>
                                        <strong>Details:</strong>
                                    </p>
                                    <div
                                        className="border rounded p-2 small"
                                        dangerouslySetInnerHTML={{ __html: details || '' }}
                                    />
                                </>
                            );
                        })()}
                </Modal.Body>
            </Modal>
        </>
    );
}

export default function MorningReportPage() {
    return <MorningReportPageContent />;
}
