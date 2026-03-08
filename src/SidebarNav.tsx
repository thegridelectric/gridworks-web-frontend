import { BarChart, List, Camera, Table, Settings, Sun, Clock } from 'feather-icons-react';
import { NavLink as ReactRouterNavLink } from 'react-router';
import Nav from 'react-bootstrap/Nav';


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
    return <nav id="sidebarMenu" className="col-md-3 col-lg-2 d-md-block sidebar collapse">
        <div className="position-sticky pt-3">
            <ul className="nav flex-column">
                <li className="nav-item">
                    <Nav.Link as={ReactRouterNavLink} to="/installations/"><List />Installations</Nav.Link>
                </li>
                <li className="nav-item">
                    <Nav.Link as={ReactRouterNavLink} to="/morning-report/"><Sun />Morning Report</Nav.Link>
                </li>
                <hr />
                <li className="nav-item">
                    <Nav.Link as={ReactRouterNavLink} to="/real-time/"><Clock />Real-Time Status</Nav.Link>
                </li>
                <li className="nav-item">
                    <Nav.Link as={ReactRouterNavLink} to="/visualizer/"><BarChart />Stats Visualizer</Nav.Link>
                </li>
                <li className="nav-item">
                    <Nav.Link as={ReactRouterNavLink} to="/data-export/"><Table />Data Export</Nav.Link>
                </li>
                <li className="nav-item">
                    <Nav.Link as={ReactRouterNavLink} to="/parameters/"><Settings />Parameters</Nav.Link>
                </li>


{/* 

                {selectedInstallation ?
                    <h6 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                        <span>Saved reports</span>
                        <a className="link-secondary" href="#" aria-label="Add a new report">
                            <span data-feather="plus-circle"></span>
                        </a>
                    </h6> :
                    <h6 className="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted">
                        Select an Installation...
                    </h6>
                } */}
            </ul>

        </div>
    </nav>
}