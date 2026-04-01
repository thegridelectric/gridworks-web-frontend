import { Navigate } from 'react-router';

import { useRouteInfo } from '../_util/useRouteInfo';

export default function DataExportPage() {
    const { currentInstallationId } = useRouteInfo();
    const suffix = currentInstallationId ? `${currentInstallationId}/` : '';
    return <Navigate to={`/data-export-channel/${suffix}`} replace />;
}
