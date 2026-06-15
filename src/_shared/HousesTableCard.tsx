import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { getAuthToken, hasRealTimeAccessForInstallationAlias } from "../auth/auth";
import SessionContext, { type BasicInstallationInfo } from "../_util/SessionContext";
import { useHouseTableSelection } from "../_util/useHouseTableSelection";
import { useRouteInfo } from "../_util/useRouteInfo";
import { useHouseRealtimeData, type HouseRealtimeData } from "../real-time/useHouseRealtimeData";
import { lastHeardLabel } from "../real-time/snapshotState";

import "../installations/InstallationsPage.css";

type SortColumn = "short_alias" | "address" | /* "commit" | */ "mode" | "last_heard";
type SortDirection = "asc" | "desc";

function houseAliasForInstallation(h: BasicInstallationInfo): string {
    return (h.houseAlias ?? h.displayName ?? "").trim();
}

function realtimeDataForAlias(
    alias: string,
    realtimeDataByAlias: Record<string, HouseRealtimeData>,
): HouseRealtimeData {
    return realtimeDataByAlias[alias] ?? {
        control: null,
        mode: null,
        snapshotTimeUnixMs: null,
    };
}

function useNowMs(tickMs = 60_000): number {
    const [nowMs, setNowMs] = useState(() => Date.now());
    useEffect(() => {
        const id = window.setInterval(() => setNowMs(Date.now()), tickMs);
        return () => window.clearInterval(id);
    }, [tickMs]);
    return nowMs;
}

function formatHouseModeLabel(realtime: HouseRealtimeData | null): string {
    if (!realtime || (realtime.control == null && realtime.mode == null)) {
        return "—";
    }
    return `${realtime.control ?? "—"}, ${realtime.mode ?? "—"}`;
}

function compareInstallations(
    a: BasicInstallationInfo,
    b: BasicInstallationInfo,
    column: SortColumn,
    direction: SortDirection,
    realtimeDataByAlias: Record<string, HouseRealtimeData>,
): number {
    if (column === "last_heard") {
        const aliasA = houseAliasForInstallation(a);
        const aliasB = houseAliasForInstallation(b);
        const realtimeA =
            aliasA && hasRealTimeAccessForInstallationAlias(aliasA)
                ? realtimeDataForAlias(aliasA, realtimeDataByAlias)
                : null;
        const realtimeB =
            aliasB && hasRealTimeAccessForInstallationAlias(aliasB)
                ? realtimeDataForAlias(aliasB, realtimeDataByAlias)
                : null;
        const timeA = realtimeA?.snapshotTimeUnixMs ?? 0;
        const timeB = realtimeB?.snapshotTimeUnixMs ?? 0;
        let cmp = timeA - timeB;
        if (direction === "desc") {
            cmp = -cmp;
        }
        return cmp;
    }

    const cell = (h: BasicInstallationInfo) => {
        if (column === "short_alias") {
            return (h.displayName || "").trim();
        }
        if (column === "address") {
            return (h.locationLabel || "N/A").trim();
        }
        const alias = houseAliasForInstallation(h);
        const hasAccess = Boolean(alias && hasRealTimeAccessForInstallationAlias(alias));
        const realtime = hasAccess ? realtimeDataForAlias(alias, realtimeDataByAlias) : null;
        if (column === "mode") {
            return formatHouseModeLabel(realtime).trim();
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
    homes: BasicInstallationInfo[],
    realtimeDataByAlias: Record<string, HouseRealtimeData>,
) {
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [aliasFilter, setAliasFilter] = useState("");
    const [cityFilter, setCityFilter] = useState("");
    // [commit-column] const [commitFilter, setCommitFilter] = useState("");
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
        // [commit-column] const cof = commitFilter.trim().toLowerCase();
        let list = homes.filter((h) => {
            const alias = (h.displayName || "").toLowerCase();
            const city = (h.locationLabel || "N/A").toLowerCase();
            // [commit-column] const commit = (h.commit || "N/A").toLowerCase();
            return (
                alias.startsWith(af) &&
                city.startsWith(cf)
                // [commit-column] && commit.startsWith(cof)
            );
        });
        list = [...list].sort((a, b) =>
            compareInstallations(a, b, sortColumn, sortDirection, realtimeDataByAlias),
        );
        return list;
    }, [
        homes,
        aliasFilter,
        cityFilter,
        // commitFilter,
        sortColumn,
        sortDirection,
        realtimeDataByAlias,
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
    realtimeDataByAlias,
    nowMs,
    sortClass,
    onSortHeaderClick,
    onRowActivate,
    rowSelectedClass,
    showNoSearchResults,
}: {
    homes: BasicInstallationInfo[];
    realtimeDataByAlias: Record<string, HouseRealtimeData>;
    nowMs: number;
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
                        <th
                            data-sort="last_heard"
                            className={sortClass("last_heard")}
                            scope="col"
                            onClick={() => onSortHeaderClick("last_heard")}
                        >
                            Last heard
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
                        const alias = houseAliasForInstallation(h);
                        const hasRealtimeAccess =
                            Boolean(alias && hasRealTimeAccessForInstallationAlias(alias));
                        const realtime = hasRealtimeAccess
                            ? realtimeDataForAlias(alias, realtimeDataByAlias)
                            : null;
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
                                {/* [commit-column]
                                <td className="json-cell text-muted">
                                    {h.commit || "N/A"}
                                </td>
                                */}
                                <td className="text-muted">
                                    {formatHouseModeLabel(realtime)}
                                </td>
                                <td className="text-muted">
                                    {lastHeardLabel(realtime?.snapshotTimeUnixMs ?? null, nowMs)}
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
    const { pathRoot, currentInstallationId } = useRouteInfo();
    const { isSelectionMode, selectedInstallationIds, toggleInstallationSelection } =
        useHouseTableSelection();

    const token = getAuthToken();
    const homes = useMemo(
        () => session?.installations ?? [],
        [session?.installations],
    );
    const hasTable = token && !session?.homesError && homes.length > 0;

    const houseAliases = useMemo(
        () => homes.map(houseAliasForInstallation).filter(Boolean),
        [homes],
    );
    const realtimeDataByAlias = useHouseRealtimeData(houseAliases);
    const nowMs = useNowMs();

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
    } = useHousesTableState(homes, realtimeDataByAlias);

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
                        setAliasFilter={setAliasFilter}
                        setCityFilter={setCityFilter}
                        clearFilters={clearFilters}
                    />

                    <HousesCardTable
                        homes={filteredSorted}
                        realtimeDataByAlias={realtimeDataByAlias}
                        nowMs={nowMs}
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
