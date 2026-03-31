import { createContext, useContext } from 'react';

export type HouseTableSelectionContextValue = {
    isSelectionMode: boolean;
    selectedInstallationIds: ReadonlySet<string>;
    toggleInstallationSelection: (installationId: string) => void;
    clearInstallationSelection: () => void;
};

export const HouseTableSelectionContext = createContext<HouseTableSelectionContextValue | null>(
    null,
);

export function useHouseTableSelection(): HouseTableSelectionContextValue {
    const ctx = useContext(HouseTableSelectionContext);
    if (!ctx) {
        throw new Error('useHouseTableSelection must be used within HouseTableSelectionProvider');
    }
    return ctx;
}
