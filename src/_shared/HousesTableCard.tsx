import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { getAuthToken } from "../auth/auth";
import SessionContext, { type BasicInstallationInfo } from "../_util/SessionContext";
import { useHouseTableSelection } from "../_util/HouseTableSelectionContext";
import { useRouteInfo } from "../_util/useRouteInfo";

import "../InstallationsPage.css";

type SortColumn = "short_alias" | "address" | "commit";
type SortDirection = "asc" | "desc";

function compareInstallations(
    a: BasicInstallationInfo,
    b: BasicInstallationInfo,
    column: SortColumn,
    direction: SortDirection,
): number {
    const cell = (h: BasicInstallationInfo) => {
        if (column === "short_alias") {
            return (h.displayName || "").trim();
        }
        if (column === "address") {
            return (h.locationLabel || "N/A").trim();
        }
        return (h.commit || "N/A").trim();
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

function useHousesTableState(homes: BasicInstallationInfo[]) {
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [aliasFilter, setAliasFilter] = useState("");
    const [cityFilter, setCityFilter] = useState("");
    const [commitFilter, setCommitFilter] = useState("");
    const [sortColumn, setSortColumn] = useState<SortColumn>("short_alias");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const okCount = useMemo(
        () => homes.filter((h) => h.alertStatus === "ok").length,
        [homes],
    );
    const alertCount = useMemo(
        () => homes.filter((h) => h.alertStatus === "alert").length,
        [homes],
    );

    const filteredSorted = useMemo(() => {
        const af = aliasFilter.trim().toLowerCase();
        const cf = cityFilter.trim().toLowerCase();
        const cof = commitFilter.trim().toLowerCase();
        let list = homes.filter((h) => {
            const alias = (h.displayName || "").toLowerCase();
            const city = (h.locationLabel || "N/A").toLowerCase();
            const commit = (h.commit || "N/A").toLowerCase();
            return (
                alias.startsWith(af) &&
                city.startsWith(cf) &&
                commit.startsWith(cof)
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
        commitFilter,
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
        setCommitFilter("");
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
        commitFilter,
        setCommitFilter,
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
    commitFilter,
    setAliasFilter,
    setCityFilter,
    setCommitFilter,
    clearFilters,
}: {
    filtersVisible: boolean;
    aliasFilter: string;
    cityFilter: string;
    commitFilter: string;
    setAliasFilter: (value: string) => void;
    setCityFilter: (value: string) => void;
    setCommitFilter: (value: string) => void;
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
    sortClass,
    onSortHeaderClick,
    onRowActivate,
    rowSelectedClass,
    showNoSearchResults,
}: {
    homes: BasicInstallationInfo[];
    sortClass: (column: SortColumn) => string;
    onSortHeaderClick: (column: SortColumn) => void;
    onRowActivate: (home: BasicInstallationInfo) => void;
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
                        <th
                            data-sort="commit"
                            className={sortClass("commit")}
                            scope="col"
                            onClick={() => onSortHeaderClick("commit")}
                        >
                            Commit
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {homes.map((h) => {
                        const alert = h.alertStatus;
                        const badgeClass =
                            alert === "ok"
                                ? "bg-success"
                                : alert === "alert"
                                  ? "bg-danger"
                                  : "bg-secondary";
                        return (
                            <tr
                                key={h.id}
                                className={`expandable-row ${rowSelectedClass(h.id)}`.trim()}
                                data-home-id={h.id}
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
                                        {h.displayName}
                                    </span>
                                </td>
                                <td>{h.locationLabel || "N/A"}</td>
                                <td className="json-cell text-muted">
                                    {h.commit || "N/A"}
                                </td>
                            </tr>
                        );
                    })}
                    {showNoSearchResults && (
                        <tr className="no-results-row">
                            <td colSpan={3}>
                                <span>No results found</span>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

/** Houses table pinned at top of layout (backoffice-style). Row click: from Installations → Real-time with that house; otherwise same section + id. */
export default function HousesTableCard() {
    const session = useContext(SessionContext);
    const navigate = useNavigate();
    const { pathRoot, currentInstallationId } = useRouteInfo();
    const { isSelectionMode, selectedInstallationIds, toggleInstallationSelection } =
        useHouseTableSelection();

    const token = getAuthToken();
    const homes = useMemo(
        () => session?.installations ?? [],
        [session?.installations],
    );
    const hasTable = token && !session?.homesError && homes.length > 0;

    const {
        filtersVisible,
        setFiltersVisible,
        aliasFilter,
        setAliasFilter,
        cityFilter,
        setCityFilter,
        commitFilter,
        setCommitFilter,
        okCount,
        alertCount,
        filteredSorted,
        onSortHeaderClick,
        clearFilters,
        showNoSearchResults,
        sortClass,
    } = useHousesTableState(homes);

    function selectHouse(h: BasicInstallationInfo) {
        const root = pathRoot ?? "installations";
        const targetRoot = root === "installations" ? "real-time" : root;
        navigate(
            `/${targetRoot}/${h.id}/`,
            root === "installations" ? undefined : { replace: true },
        );
    }

    function onRowActivate(h: BasicInstallationInfo) {
        if (isSelectionMode) {
            toggleInstallationSelection(String(h.id));
            return;
        }
        selectHouse(h);
    }

    function rowSelectedClass(id: string) {
        if (isSelectionMode) {
            return selectedInstallationIds.has(String(id)) ? "expanded" : "";
        }
        return String(id).trim() === String(currentInstallationId ?? "").trim()
            ? "expanded"
            : "";
    }

    return (
        <div className="houses-table-at-top mb-4">
            {session?.homesError && (
                <div className="alert alert-warning mb-3" role="alert">
                    Could not load homes from the visualizer API:{" "}
                    {session.homesError}
                </div>
            )}

            {token && !session?.homesError && homes.length === 0 && (
                <div className="card houses-card mb-0">
                    <div className="empty-state">
                        <h3>No homes found</h3>
                        <p>There are no homes in the database yet.</p>
                    </div>
                </div>
            )}

            {hasTable && (
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
                        commitFilter={commitFilter}
                        setAliasFilter={setAliasFilter}
                        setCityFilter={setCityFilter}
                        setCommitFilter={setCommitFilter}
                        clearFilters={clearFilters}
                    />

                    <HousesCardTable
                        homes={filteredSorted}
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
