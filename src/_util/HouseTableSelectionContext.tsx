import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useRouteInfo } from './useRouteInfo';
import {
    HouseTableSelectionContext,
    type HouseTableSelectionContextValue,
} from './useHouseTableSelection';

export function HouseTableSelectionProvider({ children }: React.PropsWithChildren) {
    const { pathRoot } = useRouteInfo();
    const isMulti = pathRoot === 'morning-report' || pathRoot === 'data-export-hourly';
    const selectionScopeKey = isMulti ? pathRoot : 'single-select';

    const [selectedInstallationIds, setSelectedInstallationIds] = useState<Set<string>>(
        () => new Set(),
    );

    useEffect(() => {
        setSelectedInstallationIds(new Set());
    }, [selectionScopeKey]);

    const toggleInstallationSelection = useCallback((installationId: string) => {
        if (!isMulti) {
            return;
        }
        setSelectedInstallationIds((prev) => {
            const next = new Set(prev);
            if (next.has(installationId)) {
                next.delete(installationId);
            } else {
                next.add(installationId);
            }
            return next;
        });
    }, [isMulti]);

    const clearInstallationSelection = useCallback(() => {
        setSelectedInstallationIds(new Set());
    }, []);

    const value = useMemo<HouseTableSelectionContextValue>(
        () => ({
            isSelectionMode: isMulti,
            selectedInstallationIds: isMulti ? selectedInstallationIds : new Set(),
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
