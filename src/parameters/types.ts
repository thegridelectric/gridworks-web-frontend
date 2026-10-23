/** The heating-curve parameters the page plots. Operational params are
 *  not on the bus, so every house starts from these defaults. */
export interface HeatingParams {
    alpha: number;
    beta: number;
    gamma: number;
    intermediate_power_kw: number;
    intermediate_rswt: number;
    dd_power_kw: number;
    dd_rswt: number;
    dd_delta_t: number;
}

export const DEFAULT_HEATING_PARAMS: HeatingParams = {
    alpha: 12,
    beta: -0.22,
    gamma: 0.002,
    intermediate_power_kw: 1.5,
    intermediate_rswt: 130,
    dd_power_kw: 12,
    dd_rswt: 180,
    dd_delta_t: 20,
};
