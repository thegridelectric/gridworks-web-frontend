/** Sema `gw.stopgap.price.forecast` 000: the stopgap price service's
 *  current 48-hour forecast for one pricing node under one tariff, from
 *  GET /api/v2/price-forecast/latest. HourStartS, LmpList and DistList
 *  are parallel; prices are USD per MWh. The word retires with the
 *  price-forecast service's own forecast word. */
export interface StopgapPriceForecast {
    TypeName: 'gw.stopgap.price.forecast';
    Version: '000';
    FromGNodeAlias: string;
    PNodeAlias: string;
    TariffAlias: string;
    /** Start of each forecast hour, seconds since the epoch, ascending. */
    HourStartS: number[];
    LmpList: number[];
    DistList: number[];
    PriceUid?: string;
    ForecastCreatedS?: number;
}
