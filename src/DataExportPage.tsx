import { Navigate, useLocation } from 'react-router';

import { parsePathname } from './_util/urlUtility';

export default function DataExportPage() {
    const location = useLocation();
    const { currentInstallationId } = parsePathname(location.pathname);
    const suffix = currentInstallationId ? `${currentInstallationId}/` : '';
    return <Navigate to={`/data-export-channel/${suffix}`} replace />;
}
