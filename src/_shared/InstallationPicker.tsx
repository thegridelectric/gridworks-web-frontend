import { useContext } from "react";
import { useLocation, useNavigate } from "react-router";
import SessionContext from "../_util/SessionContext";
import { parsePathname } from "../_util/urlUtility";

export default function InstallationPicker() {
   
    var session = useContext(SessionContext);
    const navigate = useNavigate();

    const location = useLocation();
    const {pathRoot, currentInstallationId} = parsePathname(location.pathname);

    function onInstallationChanged(evt: React.ChangeEvent<HTMLSelectElement, Element>) {
        evt.preventDefault();
        const installationId = evt.currentTarget.value;
        navigate(`/${pathRoot}/${installationId}/`, { replace: true });
    }


    return <select value={currentInstallationId || ''} className="form-select" style={{ maxWidth: '300px' }} onChange={onInstallationChanged}>
        {!currentInstallationId &&
            <option value=''>Select an installation</option>
        }
        {session?.installations.map(i => <option key={i.id} value={i.id}>{i.displayName}</option>)}
    </select>

}