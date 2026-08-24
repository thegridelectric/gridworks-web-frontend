import type { SpaceheatParameters } from "../sema/SpaceheatParameters";

export const DEFAULT_HEATING_PARAMS: SpaceheatParameters = {
    alpha: 12,
    beta: -0.22,
    gamma: 0.002,
    intermediate_power_kw: 1.5,
    intermediate_rswt: 130,
    dd_power_kw: 12,
    dd_rswt: 180,
    dd_delta_t: 20,
};
