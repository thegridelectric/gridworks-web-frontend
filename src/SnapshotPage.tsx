import { useParams } from "react-router";
import DefaultLayout from "./SidebarNavLayout";

export default function SnapshotPage() {

   const { homeId } = useParams();


    return <DefaultLayout>
        <h1>Snapshot</h1>
    </DefaultLayout>
}