import HousesTableCard from "../_shared/HousesTableCard";
import { HouseTableSelectionProvider } from "../_util/HouseTableSelectionContext";
import { HouseRealtimeDataProvider } from "../real-time/HouseRealtimeDataProvider";
import Header from "./Header";
import SidebarNav from "./SidebarNav";
import { Outlet } from "react-router";

export default function SidebarNavLayoutWithHouseSelection() {

    return <>
        <Header />
        <div className="container-fluid">
            <div className="row">
                <SidebarNav />
                <div className="main-container col-md-9 ms-sm-auto col-lg-10 px-md-4">
                    <HouseRealtimeDataProvider>
                        <HouseTableSelectionProvider>
                            <main>
                                <HousesTableCard />
                                <Outlet />
                            </main>
                        </HouseTableSelectionProvider>
                    </HouseRealtimeDataProvider>
                </div>
            </div>
        </div>
    </>
}
