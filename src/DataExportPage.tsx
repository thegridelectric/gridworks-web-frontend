import { Navigate, useLocation } from 'react-router';

import { parsePathname } from './_util/urlUtility';

export default function DataExportPage() {
    // Compatibility route: redirect old `/data-export/:homeId?/` to the channel export page.
    // (We keep the old URL working for bookmarks.)
    const location = useLocation();
    const { currentInstallationId } = parsePathname(location.pathname);
    const suffix = currentInstallationId ? `${currentInstallationId}/` : '';
    return <Navigate to={`/data-export-channel/${suffix}`} replace />;
}
