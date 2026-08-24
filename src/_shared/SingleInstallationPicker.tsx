import { useContext, useMemo } from "react";
import { useNavigate } from "react-router";
import SessionContext from "../_util/SessionContext";
import { useRouteInfo } from "../_util/useRouteInfo";

export default function SingleInstallationPicker() {

    const session = useContext(SessionContext);
    const navigate = useNavigate();
    const { pathRoot, installationGNode } = useRouteInfo();

    const installationsSorted = useMemo(() => {
        const list = session?.installations ?? [];
        return [...list].sort((a, b) =>
            a.DisplayName.localeCompare(b.DisplayName, undefined, { sensitivity: 'base' }),
        );
    }, [session?.installations]);

    function onInstallationChanged(evt: React.ChangeEvent<HTMLSelectElement, Element>) {
        evt.preventDefault();
        const installationId = evt.currentTarget.value;
        const root = pathRoot ?? 'installations';
        navigate(
            installationId ? `/${root}/${installationId}/` : `/${root}/`,
            { replace: true },
        );
    }


    return <select value={installationGNode || ''} className="form-select" style={{ maxWidth: '300px' }} onChange={onInstallationChanged}>
        {!installationGNode &&
            <option value=''>Select an installation</option>
        }
        {installationsSorted.map((i) => (
            <option key={i.GNodeAlias} value={i.GNodeAlias}>{i.DisplayName}</option>
        ))}
    </select>

}
