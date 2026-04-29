import type { DateTime } from "luxon";

export type PriceForecastApiReponse = {
    HourStartS: number[],
    LmpList: number[],
    DistList: number[],
    // Not in the API; we populate this ourselves.
    TotalList: number[],
};

export const PriceForecastApiResponseSeriesNames: [keyof PriceForecastApiReponse, keyof PriceForecastApiReponse, keyof PriceForecastApiReponse] = [
    'LmpList',
    'TotalList',
    'DistList',
]


export async function fetchPriceForecast(params: {
    houseAlias: string;
    startDate: DateTime;
    endDate: DateTime;
}): Promise<PriceForecastApiReponse> {


    // TODO pull the location from the houseAlias
    try {
        const res = await fetch(`https://price-service.electricity.works/get_prices_visualizer/hw1-isone-me-versant-keene-ps/gw0-price-forecast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "start_unix_s": params.startDate.toSeconds(),
                "end_unix_s": params.endDate.toSeconds() + 48*3600,
                "timezone_str": "America/New_York"
            })
        });
        if (!res.ok) {
            throw new Error(`Pricing request failed: ${res.status}`);
        }

        const data = await res.json() as PriceForecastApiReponse;
        // Insert our own calculation for Total price
        data.TotalList = data.LmpList.map((v, i) => v + (data.DistList[i] || 0));

        return data;
    } catch (error: any) {
        const errMsg = error.message || `Unknown error type ${typeof error}`
        throw new Error(`Pricing request failed: ${errMsg}`);
    }

}