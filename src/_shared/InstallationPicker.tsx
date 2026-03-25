import { useContext, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import SessionContext from "../_util/SessionContext";
import { parsePathname } from "../_util/urlUtility";

export default function InstallationPicker() {

    const session = useContext(SessionContext);
    const navigate = useNavigate();

    const location = useLocation();
    const { pathRoot, currentInstallationId } = parsePathname(location.pathname);

    const installationsSorted = useMemo(() => {
        const list = session?.installations ?? [];
        return [...list].sort((a, b) =>
            a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }),
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


    return <select value={currentInstallationId || ''} className="form-select" style={{ maxWidth: '300px' }} onChange={onInstallationChanged}>
        {!currentInstallationId &&
            <option value=''>Select an installation</option>
        }
        {installationsSorted.map((i) => (
            <option key={i.id} value={i.id}>{i.displayName}</option>
        ))}
    </select>

}