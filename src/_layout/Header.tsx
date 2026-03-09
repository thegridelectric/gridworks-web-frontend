import { useContext } from 'react';

import { Nav } from 'react-bootstrap'
import { NavLink as ReactRouterNavLink } from 'react-router';
import { LogOut } from 'feather-icons-react';

import SessionContext from '../_util/SessionContext';

import './Header.css'

export default function Header() {
    
    const sessionContext = useContext(SessionContext);

    return <header className="navbar navbar-dark sticky-top flex-md-nowrap p-0">
        <Nav.Link as={ReactRouterNavLink} to="/" className="navbar-brand col-md-3 col-lg-2 me-0 px-3">GridWorks Web Portal</Nav.Link>
        <button className="navbar-toggler position-absolute d-md-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#sidebarMenu" aria-controls="sidebarMenu" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
        </button>
        <div className="navbar-nav me-3">
            <div className="nav-item text-nowrap">
                {sessionContext &&
                    <Nav.Link as={ReactRouterNavLink} to="/login?logOut=true"><LogOut />Sign Out</Nav.Link>
                }
            </div>
        </div>
    </header>

}