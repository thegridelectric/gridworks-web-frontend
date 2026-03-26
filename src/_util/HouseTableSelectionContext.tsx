import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useLocation } from 'react-router';

import { parsePathname } from './urlUtility';

export type HouseTableSelectionContextValue = {
    /** On multi-select pages, table rows toggle selection instead of changing the URL. */
    isMultiSelectMode: boolean;
    morningSelectedIds: ReadonlySet<string>;
    toggleMorningSelect: (installationId: string) => void;
    clearMorningSelection: () => void;
};

const HouseTableSelectionContext = createContext<HouseTableSelectionContextValue | null>(
    null,
);

export function HouseTableSelectionProvider({ children }: React.PropsWithChildren) {
    const location = useLocation();
    const { pathRoot } = parsePathname(location.pathname);
    const isMulti = pathRoot === 'morning-report' || pathRoot === 'data-export-hourly';

    const [morningSelectedIds, setMorningSelectedIds] = useState<Set<string>>(
        () => new Set(),
    );

    useEffect(() => {
        if (!isMulti) {
            setMorningSelectedIds(new Set());
        }
    }, [isMulti]);

    const toggleMorningSelect = useCallback((installationId: string) => {
        setMorningSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(installationId)) {
                next.delete(installationId);
            } else {
                next.add(installationId);
            }
            return next;
        });
    }, []);

    const clearMorningSelection = useCallback(() => {
        setMorningSelectedIds(new Set());
    }, []);

    const value = useMemo<HouseTableSelectionContextValue>(
        () => ({
            isMultiSelectMode: isMulti,
            morningSelectedIds,
            toggleMorningSelect,
            clearMorningSelection,
        }),
        [isMulti, morningSelectedIds, toggleMorningSelect, clearMorningSelection],
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
