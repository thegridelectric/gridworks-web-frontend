import { BarChart, List, Table, Settings, Sun, Clock, Info, Bell } from 'feather-icons-react';
import { NavLink as ReactRouterNavLink } from 'react-router';
import Nav from 'react-bootstrap/Nav';
import { useContext } from 'react';
import SessionContext, { canViewRealTimePage, installationRoleForGNode } from '../_util/SessionContext';
import { useRouteInfo } from '../_util/useRouteInfo';


//  We use Bootstrap navs to get the look/feel/functionality, but we need them
//  to render react-router NavLink elements to get the correct routing behavior
//  (i.e., to navigate directly between pages without a full page-load)

// Dashboard -- list of homes w/ at-a-glance info (city/state, alert status, glitch count, commit, hardware layout, heat call length, etc.)
// Per-Home:
//  Status
//  Channel Data
//  Glitches
//  Parameters
// Logout

export default function SidebarNav() {

    const session = useContext(SessionContext);
    if (!session) {
        return null;
    }

    const { installationGNode } = useRouteInfo();
    const installationName = installationRoleForGNode(session?.installations, installationGNode)?.DisplayName ?? null;
    const installationHeading = installationName
        ? `${installationName.charAt(0).toUpperCase()}${installationName.slice(1)}`
        : null;
    const installationUrlSuffix = installationGNode ? `${installationGNode}/` : '';
    const showAdminNav = session.isSystemAdmin;
    const showRealTimeNav = canViewRealTimePage(session);

    function onSidebarClick(event: React.MouseEvent<HTMLElement>) {
        if (!window.matchMedia('(max-width: 767.98px)').matches) {
            return;
        }
        const target = event.target as HTMLElement | null;
        if (!target?.closest('a')) {
            return;
        }
        const sidebar = document.getElementById('sidebarMenu');
        if (sidebar?.classList.contains('show')) {
            sidebar.classList.remove('show');
        }
        const toggler = document.querySelector<HTMLButtonElement>(
            '.navbar-toggler[aria-controls="sidebarMenu"]',
        );
        if (toggler) {
            toggler.classList.add('collapsed');
            toggler.setAttribute('aria-expanded', 'false');
        }
    }

    return <nav id="sidebarMenu" className="col-md-3 col-lg-2 d-md-block sidebar collapse" onClick={onSidebarClick}>
        <div className="position-sticky pt-3">
            <ul className="nav flex-column">
                <li className="nav-item">
                    <Nav.Link as={ReactRouterNavLink} to="/installations/"><List />Installations</Nav.Link>
                </li>
                {showAdminNav && (
                    <li className="nav-item">
                        <Nav.Link as={ReactRouterNavLink} to="/morning-report/"><Sun />Morning Report</Nav.Link>
                    </li>
                )}
                {showAdminNav && (
                    <li className="nav-item">
                        <Nav.Link as={ReactRouterNavLink} to="/alerts/"><Bell />Alerts</Nav.Link>
                    </li>
                )}
                <hr />
                {installationHeading &&
                    <h4 className="sidebar-heading px-3 mt-1 mb-2 text-muted">{installationHeading}</h4>
                }
                {showRealTimeNav && (
                    <li className="nav-item">
                        <Nav.Link as={ReactRouterNavLink} to={`/real-time/${installationUrlSuffix}`}><Clock />Real-Time Status</Nav.Link>
                    </li>
                )}
                <li className="nav-item">
                    <Nav.Link as={ReactRouterNavLink} to={`/visualizer/${installationUrlSuffix}`}><BarChart />Visualizer</Nav.Link>
                </li>
                <li className="nav-item">
                    <Nav.Link as={ReactRouterNavLink} to={`/data-export-channel/${installationUrlSuffix}`}><Table />Channel data export</Nav.Link>
                </li>
                {showAdminNav && (
                    <li className="nav-item">
                        <Nav.Link as={ReactRouterNavLink} to={`/data-export-hourly/${installationUrlSuffix}`}><Table />Hourly data export</Nav.Link>
                    </li>
                )}
                {showAdminNav && (
                    <li className="nav-item">
                        <Nav.Link as={ReactRouterNavLink} to={`/information/${installationUrlSuffix}`}><Info />Information</Nav.Link>
                    </li>
                )}
                {showAdminNav && (
                    <li className="nav-item">
                        <Nav.Link as={ReactRouterNavLink} to={`/parameters/${installationUrlSuffix}`}><Settings />Parameters</Nav.Link>
                    </li>
                )}
            </ul>
        </div>
    </nav>
}
