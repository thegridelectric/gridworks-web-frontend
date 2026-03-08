import React from "react";
import Header from "./Header";
import SidebarNav from "./SidebarNav";

export default function SidebarNavLayout({ children }: React.PropsWithChildren) {
    return <>
        <Header />
        <div className="row">
            <SidebarNav />
            <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4">
                {children}
            </main>
        </div>
    </>
}