import React from "react";
import HousesTableCard from "../_shared/HousesTableCard";
import { HouseTableSelectionProvider } from "../_util/HouseTableSelectionContext";
import Header from "./Header";
import SidebarNav from "./SidebarNav";

interface SidebarNavLayoutProps extends React.PropsWithChildren {
}

export default function SidebarNavLayout({ children }: SidebarNavLayoutProps) {

    return <>
        <Header />
        <div className="container-fluid">
            <div className="row">
                <SidebarNav />
                <div className="main-container col-md-9 ms-sm-auto col-lg-10 px-md-4">
                    <HouseTableSelectionProvider>
                        <main>
                            <HousesTableCard />
                            {children}
                        </main>
                    </HouseTableSelectionProvider>
                </div>
            </div>
        </div>
    </>
}