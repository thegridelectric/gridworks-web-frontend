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
        useMatch('/installations/:gNode?/'),
        useMatch('/real-time/:gNode?/'),
        useMatch('/visualizer/:gNode?/'),
        useMatch('/information/:gNode?/'),
        useMatch('/data-export/:gNode?/'),
        useMatch('/data-export-channel/:gNode?/'),
        useMatch('/data-export-hourly/:gNode?/'),
        useMatch('/morning-report/:gNode?/'),
        useMatch('/alerts/'),
        useMatch('/parameters/:gNode?/'),
    ];

    const index = matches.findIndex(Boolean);
    return index >= 0 ? ROUTE_SECTIONS[index] : undefined;
}

export function useRouteInfo(): {
    pathRoot: RouteSection | undefined;
    installationGNode: string | undefined;
} {
    const { gNode } = useParams();
    return {
        pathRoot: useMatchedSection(),
        installationGNode: gNode,
    };
}
