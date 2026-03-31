import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useRouteInfo } from './useRouteInfo';

export type HouseTableSelectionContextValue = {
    /** On multi-select pages, table rows toggle selection instead of changing the URL. */
    isSelectionMode: boolean;
    selectedInstallationIds: ReadonlySet<string>;
    toggleInstallationSelection: (installationId: string) => void;
    clearInstallationSelection: () => void;
};

const HouseTableSelectionContext = createContext<HouseTableSelectionContextValue | null>(
    null,
);

export function HouseTableSelectionProvider({ children }: React.PropsWithChildren) {
    const { pathRoot } = useRouteInfo();
    const isMulti = pathRoot === 'morning-report' || pathRoot === 'data-export-hourly';

    const [selectedInstallationIds, setSelectedInstallationIds] = useState<Set<string>>(
        () => new Set(),
    );

    useEffect(() => {
        if (!isMulti) {
            setSelectedInstallationIds(new Set());
        }
    }, [isMulti]);

    const toggleInstallationSelection = useCallback((installationId: string) => {
        setSelectedInstallationIds((prev) => {
            const next = new Set(prev);
            if (next.has(installationId)) {
                next.delete(installationId);
            } else {
                next.add(installationId);
            }
            return next;
        });
    }, []);

    const clearInstallationSelection = useCallback(() => {
        setSelectedInstallationIds(new Set());
    }, []);

    const value = useMemo<HouseTableSelectionContextValue>(
        () => ({
            isSelectionMode: isMulti,
            selectedInstallationIds,
            toggleInstallationSelection,
            clearInstallationSelection,
        }),
        [isMulti, selectedInstallationIds, toggleInstallationSelection, clearInstallationSelection],
    );

    return (
        <HouseTableSelectionContext.Provider value={value}>
            {children}
        </HouseTableSelectionContext.Provider>
    );
}

export function useHouseTableSelection(): HouseTableSelectionContextValue {
    const ctx = useContext(HouseTableSelectionContext);
    if (!ctx) {
        throw new Error('useHouseTableSelection must be used within HouseTableSelectionProvider');
    }
    return ctx;
}
