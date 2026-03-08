import Header from "./Header";

import './HeaderLayout.css';

export default function HeaderLayout({ children }: React.PropsWithChildren) {

    return <>
        <Header />
        <main className="header-layout text-center p-3">
            {children}
        </main>
    </>
}