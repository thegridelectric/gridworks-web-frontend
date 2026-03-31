import { useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { getAuthToken } from "../auth/auth";
import SessionContext, { type BasicInstallationInfo } from "../_util/SessionContext";
import { useHouseTableSelection } from "../_util/HouseTableSelectionContext";
import { parsePathname } from "../_util/urlUtility";

import "../InstallationsPage.css";

type SortColumn = "short_alias" | "address" | "commit";

function compareInstallations(
    a: BasicInstallationInfo,
    b: BasicInstallationInfo,
    column: SortColumn,
    direction: "asc" | "desc",
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

/** Houses table pinned at top of layout (backoffice-style). Row click: from Installations → Real-time with that house; otherwise same section + id. */
export default function HousesTableCard() {
    const session = useContext(SessionContext);
    const navigate = useNavigate();
    const location = useLocation();
    const { pathRoot, currentInstallationId } = parsePathname(location.pathname);
    const { isMultiSelectMode, morningSelectedIds, toggleMorningSelect } =
        useHouseTableSelection();

    const token = getAuthToken();
    const homes = useMemo(
        () => session?.installations ?? [],
        [session?.installations],
    );

    const [filtersVisible, setFiltersVisible] = useState(false);
    const [aliasFilter, setAliasFilter] = useState("");
    const [cityFilter, setCityFilter] = useState("");
    const [commitFilter, setCommitFilter] = useState("");
    const [sortColumn, setSortColumn] = useState<SortColumn>("short_alias");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

    function selectHouse(h: BasicInstallationInfo) {
        const root = pathRoot ?? "installations";
        const targetRoot = root === "installations" ? "real-time" : root;
        navigate(
            `/${targetRoot}/${h.id}/`,
            root === "installations" ? undefined : { replace: true },
        );
    }

    function onRowActivate(h: BasicInstallationInfo) {
        if (isMultiSelectMode) {
            toggleMorningSelect(String(h.id));
            return;
        }
        selectHouse(h);
    }

    const showNoSearchResults =
        homes.length > 0 && filteredSorted.length === 0;
    const hasTable = token && !session?.homesError && homes.length > 0;

    function sortClass(column: SortColumn) {
        if (sortColumn !== column) {
            return "";
        }
        return sortDirection === "asc" ? "sort-asc" : "sort-desc";
    }

    function rowSelectedClass(id: string) {
        if (isMultiSelectMode) {
            return morningSelectedIds.has(String(id)) ? "expanded" : "";
        }
        return String(id).trim() === String(currentInstallationId ?? "").trim()
            ? "expanded"
            : "";
    }

    return (
        <div className="houses-table-at-top mb-4">
            {!token && (
                    <p className="text-muted mb-3">
                    Sign in to load homes into the shared table.
                </p>
            )}

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
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="card-title">Houses</h5>
                        <div className="status-badges">
                            <button
                                type="button"
                                id="houses-filter-toggle"
                                className={`filter-toggle${filtersVisible ? " active" : ""}`}
                                title="Filter table"
                                aria-expanded={filtersVisible}
                                onClick={() => setFiltersVisible((v) => !v)}
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

                    <div
                        className={`search-container${filtersVisible ? " visible" : ""}`}
                    >
                        <div className="search-group alias">
                            <div className="search-input-wrapper">
                                <i
                                    className="bi bi-search search-icon"
                                    aria-hidden
                                />
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
                                <i
                                    className="bi bi-search search-icon"
                                    aria-hidden
                                />
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
                                <i
                                    className="bi bi-search search-icon"
                                    aria-hidden
                                />
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

                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th
                                        data-sort="short_alias"
                                        className={sortClass("short_alias")}
                                        scope="col"
                                        onClick={() =>
                                            onSortHeaderClick("short_alias")
                                        }
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
                                {filteredSorted.map((h) => {
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
                                                if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                ) {
                                                    e.preventDefault();
                                                    onRowActivate(h);
                                                }
                                            }}
                                        >
                                            <td>
                                                <span
                                                    className={`badge ${badgeClass}`}
                                                >
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
