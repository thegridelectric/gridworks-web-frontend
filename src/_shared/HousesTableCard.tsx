import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import SessionContext, { type InstallationSummary } from "../_util/SessionContext";
import { useHouseTableSelection } from "../_util/useHouseTableSelection";
import { useRouteInfo } from "../_util/useRouteInfo";

import "../installations/InstallationsPage.css";
import { DateTime } from "luxon";

type SortColumn = "short_alias" | "address" | /* "commit" | */ "mode";
type SortDirection = "asc" | "desc";

function formatHouseModeLabel(installation: InstallationSummary | null): string {
    if (!installation || (installation.SystemMode == null && installation.MainAutoState == null)) {
        return "—";
    }
    return `${installation.SystemMode ?? "—"}, ${installation.MainAutoState ?? "—"}`;
}

function isLatestSnapshotFresh(h: InstallationSummary, refreshTime: DateTime): boolean {
    return DateTime.fromISO(h.LatestSnapshotTime) > refreshTime.minus({seconds: 60})
}

function aliasBadgeClassForHouse(
    h: InstallationSummary,
    refreshTime: DateTime,
): string {
    // [alert-status-badge] from backoffice `alert_status`:
    // const alert = h.alertStatus;
    // return alert === "ok" ? "bg-success" : alert === "alert" ? "bg-danger" : "bg-secondary";
    return isLatestSnapshotFresh(h, refreshTime)
        ? "bg-success"
        : "bg-danger";
}

function getLocationLabel(h: InstallationSummary): string {
    return h.Address && h.Address.city && h.Address.state ? 
        `${h.Address.city}, ${h.Address.state}` : 
        "N/A";
}

function compareInstallations(
    a: InstallationSummary,
    b: InstallationSummary,
    column: SortColumn,
    direction: SortDirection,
): number {
    const cell = (h: InstallationSummary) => {
        if (column === "short_alias") {
            return (h.DisplayName || "").trim();
        }
        if (column === "address") {
            return (getLocationLabel(h)).trim();
        }
        if (column === "mode") {
            return formatHouseModeLabel(h).trim();
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
    homes: InstallationSummary[],
    refreshTime: DateTime,
) {
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [aliasFilter, setAliasFilter] = useState("");
    const [cityFilter, setCityFilter] = useState("");
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
        const cf = cityFilter.trim().toLowerCase();
        // [commit-column] const cof = commitFilter.trim().toLowerCase();
        let list = homes.filter((h) => {
            const alias = (h.DisplayName || "").toLowerCase();
            const city = (getLocationLabel(h) || "N/A").toLowerCase();
            // [commit-column] const commit = (h.commit || "N/A").toLowerCase();
// TODO fix this merge
            // const city = (getLocationLabel(h) || "N/A").toLowerCase();
            // const commit = (h.commit || "N/A").toLowerCase();
            return (
                alias.startsWith(af) &&
                city.startsWith(cf)
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
        cityFilter,
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
        setCityFilter("");
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
        cityFilter,
        setCityFilter,
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
    cityFilter,
    // [commit-column] commitFilter,
    setAliasFilter,
    setCityFilter,
    // [commit-column] setCommitFilter,
    clearFilters,
}: {
    filtersVisible: boolean;
    aliasFilter: string;
    cityFilter: string;
    // [commit-column] commitFilter: string;
    setAliasFilter: (value: string) => void;
    setCityFilter: (value: string) => void;
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
            <div className="search-group city">
                <div className="search-input-wrapper">
                    <i className="bi bi-search search-icon" aria-hidden />
                    <input
                        type="text"
                        className={`search-input${cityFilter.trim() ? " active" : ""}`}
                        id="search-city"
                        placeholder="Location"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
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
    homes: InstallationSummary[];
    refreshTime: DateTime;
    sortClass: (column: SortColumn) => string;
    onSortHeaderClick: (column: SortColumn) => void;
    onRowActivate: (home: InstallationSummary) => void;
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
                        <th
                            data-sort="address"
                            className={sortClass("address")}
                            scope="col"
                            onClick={() => onSortHeaderClick("address")}
                        >
                            Location
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
                            data-sort="mode"
                            className={sortClass("mode")}
                            scope="col"
                            onClick={() => onSortHeaderClick("mode")}
                        >
                            Mode
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
                                        {h.DisplayName}
                                    </span>
                                </td>
                                <td>{getLocationLabel(h) || "N/A"}</td>
                                {/* [commit-column]
                                <td className="json-cell text-muted">
                                    {h.commit || "N/A"}
                                </td>
                                */}
                                <td>{formatHouseModeLabel(h)}</td>
                                <td>
                                    {h.LongestRunningZoneName ?
                                        <span>
                                            {h.LongestRunningZoneName.replace('-heat-call', '')}
                                            (for {refreshTime.diff(DateTime.fromISO(h.LongestRunningZoneStartTime), 'hours').hours.toFixed(1)} hours)
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
        cityFilter,
        setCityFilter,
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

    function selectHouse(h: InstallationSummary) {
        const root = pathRoot ?? "installations";
        const targetRoot = root === "installations" ? "real-time" : root;
        navigate(
            `/${targetRoot}/${h.GNodeAlias}/`,
            root === "installations" ? undefined : { replace: true },
        );
    }

    function onRowActivate(h: InstallationSummary) {
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
                        cityFilter={cityFilter}
                        setAliasFilter={setAliasFilter}
                        setCityFilter={setCityFilter}
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
