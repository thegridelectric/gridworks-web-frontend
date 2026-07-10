import { useMemo } from "react";
import type { InstallationSummary } from "../_util/SessionContext";

export default function MultiInstallationDisplay({ installations, selectedInstallationIds }: { 
    installations: InstallationSummary[],
    selectedInstallationIds: ReadonlySet<string> 
}) {

    const selectedHouseDisplay = useMemo(
        () => selectedHouseFieldValue(selectedInstallationIds, installations),
        [selectedInstallationIds, installations],
    );

    function selectedHouseFieldValue(
        selectedIds: ReadonlySet<string>,
        installations: InstallationSummary[],
    ): string {
        if (selectedIds.size === 0) {
            return '';
        }
        const aliases: string[] = [];
        for (const inst of installations) {
            if (!selectedIds.has(String(inst.GNodeAlias))) {
                continue;
            }
            const a = (inst.DisplayName || inst.GNodeAlias || '').trim();
            if (a) {
                aliases.push(a);
            }
        }
        return aliases.join(', ');
    }

    return <input
        id="morning-selected-house"
        type="text"
        className="form-control text-light border-secondary"
        readOnly
        placeholder="All houses in the table"
        value={selectedHouseDisplay}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    />


}