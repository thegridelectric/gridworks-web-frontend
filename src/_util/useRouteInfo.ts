import { useMatch, useParams } from 'react-router';

const ROUTE_SECTIONS = [
    'installations',
    'real-time',
    'visualizer',
    'information',
    'data-export',
    'data-export-channel',
    'data-export-hourly',
    'morning-report',
    'parameters',
    'alerts',
] as const;

type RouteSection = (typeof ROUTE_SECTIONS)[number];

function useMatchedSection(): RouteSection | undefined {
    const matches = [
        useMatch('/installations/:homeId?/'),
        useMatch('/real-time/:homeId?/'),
        useMatch('/visualizer/:homeId?/'),
        useMatch('/information/:homeId?/'),
        useMatch('/data-export/:homeId?/'),
        useMatch('/data-export-channel/:homeId?/'),
        useMatch('/data-export-hourly/:homeId?/'),
        useMatch('/morning-report/:homeId?/'),
        useMatch('/parameters/:homeId?/'),
        useMatch('/alerts/'),
    ];

    const index = matches.findIndex(Boolean);
    return index >= 0 ? ROUTE_SECTIONS[index] : undefined;
}

export function useRouteInfo(): {
    pathRoot: RouteSection | undefined;
    currentInstallationId: string | undefined;
} {
    const { homeId } = useParams();
    return {
        pathRoot: useMatchedSection(),
        currentInstallationId: homeId,
    };
}
