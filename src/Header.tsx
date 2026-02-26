import { NavLink as ReactRouterNavLink } from 'react-router';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';

import './Header.css'

export default function Header() {

    //  We use Bootstrap navs to get the look/feel/functionality, but we need them
    //  to render react-router NavLink elements to get the correct routing behavior
    //  (i.e., to navigate directly between pages without a full page-load)

    return (
        <Navbar expand="lg" className="bg-body-tertiary">
            <Container>
                <Navbar.Brand as={ReactRouterNavLink} to="/">Home</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto"> 
                        <Nav.Link as={ReactRouterNavLink} to="/login">Login</Nav.Link>
                        <NavDropdown title="Dropdown" id="basic-nav-dropdown">
                            <NavDropdown.Item as={ReactRouterNavLink} to="#action/3.1">Action</NavDropdown.Item>
                            <NavDropdown.Item as={ReactRouterNavLink} to="#action/3.2">Another action</NavDropdown.Item>
                            <NavDropdown.Item as={ReactRouterNavLink} to="#action/3.3">Something</NavDropdown.Item>
                            <NavDropdown.Divider />
                            <NavDropdown.Item as={ReactRouterNavLink} to="#action/3.4">
                                Separated link
                            </NavDropdown.Item>
                        </NavDropdown>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}