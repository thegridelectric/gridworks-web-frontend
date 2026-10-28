import { z } from 'zod';
import { Gw1Quantity } from '../enums/Gw1Quantity';
import { Gw1Unit } from '../enums/Gw1Unit';

const PROJECTION: Record<Gw1Unit, Gw1Quantity> = {
    Unknown: 'Unknown',
    Unitless: 'Unitless',
    FahrenheitX100: 'Temperature',
    Watts: 'Power',
    WattHours: 'Energy',
    Gallons: 'Volume',
    GpmX100: 'FlowRate',
    Seconds: 'Time',
    SecondsX10: 'Time',
    Milliseconds: 'Time',
    DollarsX1000: 'Currency',
    MilesPerHourX1000: 'WindSpeed',
    KilowattHoursX1000: 'Energy',
    WattsPerSquareMeter: 'Irradiance',
    MilesPerHourX10: 'WindSpeed',
    FahrenheitX10: 'Temperature',
};

export function projectUnit(unit: Gw1Unit): Gw1Quantity {
    return PROJECTION[unit];
}

/** Sema: https://schemas.electricity.works/types/gw1.unit.quantity.projection/001 */
export const Gw1UnitQuantityProjection = z
    .strictObject({
        Unit: Gw1Unit,
        Quantity: Gw1Quantity,
        TypeName: z.literal('gw1.unit.quantity.projection'),
        Version: z.literal('001'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (EnumeratedProjectionMapping) failed: Unit and Quantity do not match the enumerated projection',
        path: ['Quantity'],
    });
export type Gw1UnitQuantityProjection = z.infer<typeof Gw1UnitQuantityProjection>;

function checkAxiom1(p: { Unit: Gw1Unit; Quantity: Gw1Quantity }): boolean {
    return projectUnit(p.Unit) === p.Quantity;
}
