import HousesTableCard from "../_shared/HousesTableCard";
import { HouseTableSelectionProvider } from "../_util/HouseTableSelectionContext";
import { Outlet } from "react-router";
import SidebarNavLayout from "./SidebarNavLayout";

export default function SidebarNavLayoutWithHouseSelection() {

    return <SidebarNavLayout>
        <HouseTableSelectionProvider>
            <main>
                <HousesTableCard />
                <Outlet />
            </main>
        </HouseTableSelectionProvider>
    </SidebarNavLayout>
}
