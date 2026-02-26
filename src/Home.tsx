import { useEffect, useState } from "react";
import Header from "./Header";
import GridworksApi from './GridWorksApi';

interface Installation {
    id: string,
    displayName: string
}

export default function Home() {

    const [isLoading, setIsLoading] = useState(false);
    const [homes, setHomes] = useState<Installation[] | null>(null);
    const [err, setErr] = useState(null);

    useEffect(() => {
        setIsLoading(true)
        GridworksApi.get<Installation[]>('/api/v2/installations').then(
            response => {
                setHomes(response.data);
            },
            apiError => {
                setErr(apiError);
            }
        ).finally(() => {
            setIsLoading(false);
        })
    }, []);

    return <>
        <Header />
        <div>
            <h2>Installations</h2>
            {isLoading &&
                <p>Loading...</p>
            }
            {homes &&
                homes.map(h => <div key={h.id}> {h.displayName}</div>)
            }
            {err &&
                <pre>
                    {JSON.stringify(err, null, 2)}
                </pre>
            }
        </div>
    </>
}