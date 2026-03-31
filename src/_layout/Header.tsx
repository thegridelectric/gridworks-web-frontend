import { useContext } from 'react';

import { Nav } from 'react-bootstrap'
import { NavLink as ReactRouterNavLink, useNavigate } from 'react-router';
import { LogOut } from 'feather-icons-react';

import { clearAuth } from '../auth/auth';
import SessionContext from '../_util/SessionContext';

import './Header.css'

export default function Header() {

    const sessionContext = useContext(SessionContext);
    const navigate = useNavigate();

    function onSignOut() {
        clearAuth();
        navigate('/login/', { replace: true });
    }

    return <header className="navbar sticky-top flex-md-nowrap p-0">
        <Nav.Link as={ReactRouterNavLink} to="/" className="navbar-brand col-md-3 col-lg-2 me-0 px-3">GridWorks Web Portal</Nav.Link>
        <button className="navbar-toggler position-absolute d-md-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sidebarMenu" aria-controls="sidebarMenu" aria-expanded="false" aria-label="Toggle navigation">
            <i className="bi bi-list fs-4 header-menu-icon" aria-hidden="true"></i>
        </button>
        <div className="navbar-nav me-3">
            <div className="nav-item text-nowrap header-user-actions">
                {sessionContext &&
                    <>
                        <span className="header-username d-none d-md-inline">
                            {sessionContext.userName}
                        </span>
                        <button type="button" className="nav-link btn btn-link p-0 border-0" aria-label="Sign out" onClick={onSignOut}>
                            <LogOut />
                        </button>
                    </>
                }
            </div>
        </div>
    </header>

}
