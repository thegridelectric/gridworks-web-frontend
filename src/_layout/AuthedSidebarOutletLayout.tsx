import { Outlet } from 'react-router';

import SidebarNavLayout from './SidebarNavLayout';

export default function AuthedSidebarOutletLayout() {
    return (
        <SidebarNavLayout>
            <Outlet />
        </SidebarNavLayout>
    );
}
