import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import SessionContext from "../_util/SessionContext";
import { useHouseTableSelection } from "../_util/useHouseTableSelection";
import { useRouteInfo } from "../_util/useRouteInfo";

import "../installations/InstallationsPage.css";
import { DateTime } from "luxon";
import type { HouseSummary } from "../sema";

type SortColumn = "short_alias" | /* "commit" | */ "status";
type SortDirection = "asc" | "desc";

/** The house's operating status as one label: Standby, else the service
 *  mode, then the scada's top state. */
function formatHouseStatusLabel(installation: HouseSummary | null): string {
    const status = installation?.OperatingStatus;
    if (!status) {
        return "—";
    }
    return `${status.Standby ? "Standby" : status.ServiceMode}, ${status.TopState}`;
}

function isLatestSnapshotFresh(h: HouseSummary, refreshTime: DateTime): boolean {
    return !!h.LatestSnapshotTime && DateTime.fromISO(h.LatestSnapshotTime) > refreshTime.minus({seconds: 60})
}

function aliasBadgeClassForHouse(
    h: HouseSummary,
    refreshTime: DateTime,
): string {
    // [alert-status-badge] from backoffice `alert_status`:
    // const alert = h.alertStatus;
    // return alert === "ok" ? "bg-success" : alert === "alert" ? "bg-danger" : "bg-secondary";
    return isLatestSnapshotFresh(h, refreshTime)
        ? "bg-success"
        : "bg-danger";
}

function compareInstallations(
    a: HouseSummary,
    b: HouseSummary,
    column: SortColumn,
    direction: SortDirection,
): number {
    const cell = (h: HouseSummary) => {
        if (column === "short_alias") {
            return (h.DisplayName || "").trim();
        }
        if (column === "status") {
            return formatHouseStatusLabel(h).trim();
        }
        // [commit-column] return (h.commit || "N/A").trim();
        return "";
    };
    let av = cell(a);
    let bv = cell(b);
    if (av === "N/A") {
        av = "";
    }
    if (bv === "N/A") {
        bv = "";
    }
    let cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
    if (direction === "desc") {
        cmp = -cmp;
    }
    return cmp;
}

function useHousesTableState(
    homes: HouseSummary[],
    refreshTime: DateTime,
) {
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [aliasFilter, setAliasFilter] = useState("");
    // [commit-column] const [commitFilter, setCommitFilter] = useState("");
    const [sortColumn, setSortColumn] = useState<SortColumn>("short_alias");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const okCount = useMemo(
        () =>
            homes.filter((h) =>
                isLatestSnapshotFresh(h, refreshTime),
            ).length,
        [homes, refreshTime],
    );
    const alertCount = useMemo(
        () =>
            homes.filter(
                (h) =>
                    !isLatestSnapshotFresh(h, refreshTime),
            ).length,
        [homes, refreshTime],
// TODO fix this merge
    //     () => homes.filter((h) => h.alertStatus?.status === "ok").length,
    //     [homes],
    // );
    // const alertCount = useMemo(
    //     () => homes.filter((h) => h.alertStatus?.status === "alert").length,
    //     [homes],
    );
    // [alert-status-badge]
    // const okCount = useMemo(
    //     () => homes.filter((h) => h.alertStatus === "ok").length,
    //     [homes],
    // );
    // const alertCount = useMemo(
    //     () => homes.filter((h) => h.alertStatus === "alert").length,
    //     [homes],
    // );

    const filteredSorted = useMemo(() => {
        const af = aliasFilter.trim().toLowerCase();
        // [commit-column] const cof = commitFilter.trim().toLowerCase();
        let list = homes.filter((h) => {
            const alias = (h.DisplayName || "").toLowerCase();
            // [commit-column] const commit = (h.commit || "N/A").toLowerCase();
            return (
                alias.startsWith(af)
                // [commit-column] && commit.startsWith(cof)
            );
        });
        list = [...list].sort((a, b) =>
            compareInstallations(a, b, sortColumn, sortDirection),
        );
        return list;
    }, [
        homes,
        aliasFilter,
        // commitFilter,
        sortColumn,
        sortDirection,
    ]);

    function onSortHeaderClick(column: SortColumn) {
        if (sortColumn === column) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    }

    function clearFilters() {
        setAliasFilter("");
        // [commit-column] setCommitFilter("");
    }

    const showNoSearchResults =
        homes.length > 0 && filteredSorted.length === 0;

    function sortClass(column: SortColumn) {
        if (sortColumn !== column) {
            return "";
        }
        return sortDirection === "asc" ? "sort-asc" : "sort-desc";
    }

    return {
        filtersVisible,
        setFiltersVisible,
        aliasFilter,
        setAliasFilter,
        // [commit-column] commitFilter,
        // [commit-column] setCommitFilter,
        okCount,
        alertCount,
        filteredSorted,
        onSortHeaderClick,
        clearFilters,
        showNoSearchResults,
        sortClass,
    };
}

function HousesCardHeader({
    filtersVisible,
    okCount,
    alertCount,
    onToggleFilters,
}: {
    filtersVisible: boolean;
    okCount: number;
    alertCount: number;
    onToggleFilters: () => void;
}) {
    return (
        <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title">Houses</h5>
            <div className="status-badges">
                <button
                    type="button"
                    id="houses-filter-toggle"
                    className={`filter-toggle${filtersVisible ? " active" : ""}`}
                    title="Filter table"
                    aria-expanded={filtersVisible}
                    onClick={onToggleFilters}
                >
                    <i className="bi bi-funnel fs-6" aria-hidden />
                </button>
                <div className="status-badge ok">
                    <span className="status-badge-count">{okCount}</span>
                </div>
                <div className="status-badge offline">
                    <span className="status-badge-count">{alertCount}</span>
                </div>
            </div>
        </div>
    );
}

function HousesCardFilters({
    filtersVisible,
    aliasFilter,
    // [commit-column] commitFilter,
    setAliasFilter,
    // [commit-column] setCommitFilter,
    clearFilters,
}: {
    filtersVisible: boolean;
    aliasFilter: string;
    // [commit-column] commitFilter: string;
    setAliasFilter: (value: string) => void;
    // [commit-column] setCommitFilter: (value: string) => void;
    clearFilters: () => void;
}) {
    return (
        <div className={`search-container${filtersVisible ? " visible" : ""}`}>
            <div className="search-group alias">
                <div className="search-input-wrapper">
                    <i className="bi bi-search search-icon" aria-hidden />
                    <input
                        type="text"
                        className={`search-input${aliasFilter.trim() ? " active" : ""}`}
                        id="search-alias"
                        placeholder="Alias"
                        value={aliasFilter}
                        onChange={(e) => setAliasFilter(e.target.value)}
                        autoComplete="off"
                    />
                </div>
            </div>
            {/* [commit-column]
            <div className="search-group commit">
                <div className="search-input-wrapper">
                    <i className="bi bi-search search-icon" aria-hidden />
                    <input
                        type="text"
                        className={`search-input${commitFilter.trim() ? " active" : ""}`}
                        id="search-commit"
                        placeholder="Commit"
                        value={commitFilter}
                        onChange={(e) => setCommitFilter(e.target.value)}
                        autoComplete="off"
                    />
                </div>
            </div>
            */}
            <button
                type="button"
                className="clear-filters-btn"
                id="clear-filters"
                onClick={clearFilters}
            >
                <i className="bi bi-x-lg" aria-hidden />
                Clear
            </button>
        </div>
    );
}

function HousesCardTable({
    homes,
    refreshTime,
    sortClass,
    onSortHeaderClick,
    onRowActivate,
    rowSelectedClass,
    showNoSearchResults,
}: {
    homes: HouseSummary[];
    refreshTime: DateTime;
    sortClass: (column: SortColumn) => string;
    onSortHeaderClick: (column: SortColumn) => void;
    onRowActivate: (home: HouseSummary) => void;
    rowSelectedClass: (id: string) => string;
    showNoSearchResults: boolean;
}) {
    return (
        <div className="table-responsive">
            <table className="table">
                <thead>
                    <tr>
                        <th
                            data-sort="short_alias"
                            className={sortClass("short_alias")}
                            scope="col"
                            onClick={() => onSortHeaderClick("short_alias")}
                        >
                            Alias
                        </th>
                        {/* [commit-column]
                        <th
                            data-sort="commit"
                            className={sortClass("commit")}
                            scope="col"
                            onClick={() => onSortHeaderClick("commit")}
                        >
                            Commit
                        </th>
                        */}
                        <th
                            data-sort="status"
                            className={sortClass("status")}
                            scope="col"
                            onClick={() => onSortHeaderClick("status")}
                        >
                            Status
                        </th>
                        <th scope="col">Active heat call</th>
                    </tr>
                </thead>
                <tbody>
                    {homes.map((h) => {
                        const badgeClass = aliasBadgeClassForHouse(h, refreshTime);
                        // const alert = h.alertStatus?.status;
// TODO fix this merge
                        // const badgeClass =
                        //     alert === "ok"
                        //         ? "bg-success"
                        //         : alert === "alert"
                        //           ? "bg-danger"
                        //           : "bg-secondary";
                        return (
                            <tr
                                key={h.GNodeAlias}
                                className={`expandable-row ${rowSelectedClass(h.GNodeAlias)}`.trim()}
                                tabIndex={0}
                                onClick={() => onRowActivate(h)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        onRowActivate(h);
                                    }
                                }}
                            >
                                <td>
                                    <span className={`badge ${badgeClass}`}>
                                        {h.DisplayName ?? h.GNodeAlias}
                                    </span>
                                </td>
                                {/* [commit-column]
                                <td className="json-cell text-muted">
                                    {h.commit || "N/A"}
                                </td>
                                */}
                                <td>{formatHouseStatusLabel(h)}</td>
                                <td>
                                    {h.LongestRunningZoneName ?
                                        <span>
                                            {h.LongestRunningZoneName.replace('-heat-call', '')}
                                            <br />(for {h.LongestRunningZoneStartTime ? refreshTime.diff(DateTime.fromISO(h.LongestRunningZoneStartTime), 'hours').hours.toFixed(2) : '?'} hours)
                                        </span> :
                                        <span>(none)</span>
                                    }
                                </td>
                            </tr>
                        );
                    })}
                    {showNoSearchResults && (
                        <tr className="no-results-row">
                            <td colSpan={4}>
                                <span>No results found</span>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function HousesTableCard() {
    const session = useContext(SessionContext);
    const navigate = useNavigate();
    const { pathRoot, installationGNode } = useRouteInfo();
    const { isSelectionMode, selectedInstallationIds, toggleInstallationSelection } =
        useHouseTableSelection();

    const homes = useMemo(
        () => session!.installations,
        [session!.installations],
    );

    const {
        filtersVisible,
        setFiltersVisible,
        aliasFilter,
        setAliasFilter,
        // [commit-column] commitFilter,
        // [commit-column] setCommitFilter,
        okCount,
        alertCount,
        filteredSorted,
        onSortHeaderClick,
        clearFilters,
        showNoSearchResults,
        sortClass,
    } = useHousesTableState(homes, session!.refreshTime);

    function selectHouse(h: HouseSummary) {
        const root = pathRoot ?? "installations";
        const targetRoot = root === "installations" ? "real-time" : root;
        navigate(
            `/${targetRoot}/${h.GNodeAlias}/`,
            root === "installations" ? undefined : { replace: true },
        );
    }

    function onRowActivate(h: HouseSummary) {
        if (isSelectionMode) {
            toggleInstallationSelection(String(h.GNodeAlias));
            return;
        }
        selectHouse(h);
    }

    function rowSelectedClass(id: string) {
        if (isSelectionMode) {
            return selectedInstallationIds.has(String(id)) ? "expanded" : "";
        }
        return String(id).trim() === String(installationGNode ?? "").trim()
            ? "expanded"
            : "";
    }

    return (
        <div className="houses-table-at-top mb-4">
            {homes.length === 0 && (
                <div className="card houses-card mb-0">
                    <div className="empty-state">
                        <h3>No homes found</h3>
                        <p>There are no homes in the database yet.</p>
                    </div>
                </div>
            )}

            {homes.length > 0 && (
                <div className="card houses-card mb-0">
                    <HousesCardHeader
                        filtersVisible={filtersVisible}
                        okCount={okCount}
                        alertCount={alertCount}
                        onToggleFilters={() => setFiltersVisible((v) => !v)}
                    />

                    <HousesCardFilters
                        filtersVisible={filtersVisible}
                        aliasFilter={aliasFilter}
                        setAliasFilter={setAliasFilter}
                        clearFilters={clearFilters}
                    />

                    <HousesCardTable
                        homes={filteredSorted}
                        refreshTime={session!.refreshTime}
                        sortClass={sortClass}
                        onSortHeaderClick={onSortHeaderClick}
                        onRowActivate={onRowActivate}
                        rowSelectedClass={rowSelectedClass}
                        showNoSearchResults={showNoSearchResults}
                    />

                    {showNoSearchResults && (
                        <div className="no-results visible border-top">
                            <button
                                type="button"
                                className="btn btn-primary mt-3 mb-3"
                                id="clear-search"
                                onClick={clearFilters}
                            >
                                Clear Search
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
