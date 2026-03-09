import React from "react";
import Header from "./Header";
import SidebarNav from "./SidebarNav";

export default function SidebarNavLayout({ children }: React.PropsWithChildren) {
    return <>
        <Header />
        <div className="container-fluid">
            <div className="row">
                <SidebarNav />
                <div className="main-container col-md-9 ms-sm-auto col-lg-10 px-md-4">
                    <main>
                        {children}
                    </main>
                </div>
            </div>
        </div>
    </>
}