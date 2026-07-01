import { useMemo } from "react";
import type { InstallationRole } from "../_util/SessionContext";

export default function MultiInstallationDisplay({ installations, selectedInstallationIds }: { 
    installations: InstallationRole[],
    selectedInstallationIds: ReadonlySet<string> 
}) {

    const selectedHouseDisplay = useMemo(
        () => selectedHouseFieldValue(selectedInstallationIds, installations),
        [selectedInstallationIds, installations],
    );

    function selectedHouseFieldValue(
        selectedIds: ReadonlySet<string>,
        installations: InstallationRole[],
    ): string {
        if (selectedIds.size === 0) {
            return '';
        }
        const aliases: string[] = [];
        for (const inst of installations) {
            if (!selectedIds.has(String(inst.gNodeAlias))) {
                continue;
            }
            const a = (inst.displayName || inst.gNodeAlias || '').trim();
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