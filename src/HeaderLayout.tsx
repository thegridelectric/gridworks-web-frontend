import Header from "./Header";

export default function HeaderLayout({ children }: React.PropsWithChildren) {

    return <>
        <Header />
        {children}
    </>
}