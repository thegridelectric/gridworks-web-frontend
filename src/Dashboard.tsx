import { useParams } from "react-router";

export default function Dashboard() {
   const { homeId } = useParams();
   // TODO fetch data for homeId

   return <h1>Dashboard for {homeId} </h1>;
}