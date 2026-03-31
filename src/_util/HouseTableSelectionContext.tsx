import {
    useCallback,
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

    return (
        <HouseTableSelectionProviderInner key={selectionScopeKey} isSelectionMode={isMulti}>
            {children}
        </HouseTableSelectionProviderInner>
    );
}

function HouseTableSelectionProviderInner({
    children,
    isSelectionMode,
}: React.PropsWithChildren<{ isSelectionMode: boolean }>) {
    const [selectedInstallationIds, setSelectedInstallationIds] = useState<Set<string>>(
        () => new Set(),
    );

    const toggleInstallationSelection = useCallback((installationId: string) => {
        if (!isSelectionMode) {
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
    }, [isSelectionMode]);

    const clearInstallationSelection = useCallback(() => {
        setSelectedInstallationIds(new Set());
    }, []);

    const value = useMemo<HouseTableSelectionContextValue>(
        () => ({
            isSelectionMode,
            selectedInstallationIds: isSelectionMode ? selectedInstallationIds : new Set(),
            toggleInstallationSelection,
            clearInstallationSelection,
        }),
        [isSelectionMode, selectedInstallationIds, toggleInstallationSelection, clearInstallationSelection],
    );

    return (
        <HouseTableSelectionContext.Provider value={value}>
            {children}
        </HouseTableSelectionContext.Provider>
    );
}
