import { Outlet } from 'react-router';

import SidebarNavLayout from './SidebarNavLayout';

/**
 * Single layout shell for all authenticated app sections: sidebar, houses table,
 * and selection context persist across route changes; only the outlet swaps.
 */
export default function AuthedSidebarOutletLayout() {
    return (
        <SidebarNavLayout>
            <Outlet />
        </SidebarNavLayout>
    );
}
