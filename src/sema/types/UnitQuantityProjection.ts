import { z } from 'zod';
import { Quantity } from '../enums/Quantity';
import { Unit } from '../enums/Unit';

const PROJECTION: Record<Unit, Quantity> = {
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

export function projectUnit(unit: Unit): Quantity {
    return PROJECTION[unit];
}

/** Sema: https://schemas.electricity.works/types/gw1.unit.quantity.projection/001 */
export const UnitQuantityProjection = z
    .strictObject({
        Unit: Unit,
        Quantity: Quantity,
        TypeName: z.literal('gw1.unit.quantity.projection'),
        Version: z.literal('001'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (EnumeratedProjectionMapping) failed: Unit and Quantity do not match the enumerated projection',
        path: ['Quantity'],
    });
export type UnitQuantityProjection = z.infer<typeof UnitQuantityProjection>;

function checkAxiom1(p: { Unit: Unit; Quantity: Quantity }): boolean {
    return projectUnit(p.Unit) === p.Quantity;
}
