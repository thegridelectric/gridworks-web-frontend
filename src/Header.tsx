import { NavLink, type NavLinkRenderProps } from "react-router";
import './Header.css'

export default function Header() {

    const navLinkStyle = ({ isActive }: NavLinkRenderProps) => isActive ? "active" : "";

    return (
        <nav>
            <NavLink to="/" className={navLinkStyle}>Home</NavLink>
            <NavLink to="/login" className={navLinkStyle}>Login</NavLink>
            <NavLink to="/dashboard/beech" className={navLinkStyle}>Beech</NavLink>
        </nav>
    );
}
