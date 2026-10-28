import { z } from 'zod';

/** Sema: https://schemas.electricity.works/enums/gw1.quantity/003 */
export const Gw1Quantity = z.enum([
    'Unknown',
    'Unitless',
    'Power',
    'Energy',
    'Temperature',
    'FlowRate',
    'Volume',
    'Voltage',
    'Current',
    'Percent',
    'Frequency',
    'Time',
    'WindSpeed',
    'Irradiance',
    'Currency',
]);
export type Gw1Quantity = z.infer<typeof Gw1Quantity>;
