import { z } from 'zod';
import { Gw1Quantity } from '../enums/Gw1Quantity';
import { SpaceheatTelemetryName } from '../enums/SpaceheatTelemetryName';

const PROJECTION: Record<SpaceheatTelemetryName, Gw1Quantity> = {
    Unknown: 'Unknown',
    PowerW: 'Power',
    WattHours: 'Energy',
    MilliWattHours: 'Energy',
    WaterTempCTimes1000: 'Temperature',
    WaterTempFTimes1000: 'Temperature',
    AirTempCTimes1000: 'Temperature',
    AirTempFTimes1000: 'Temperature',
    CelsiusTimes100: 'Temperature',
    GpmTimes100: 'FlowRate',
    GallonsTimes100: 'Volume',
    VoltageRmsMilliVolts: 'Voltage',
    VoltsTimesTen: 'Voltage',
    VoltsTimes100: 'Voltage',
    MicroVolts: 'Voltage',
    CurrentRmsMicroAmps: 'Current',
    HzTimes100: 'Frequency',
    MicroHz: 'Frequency',
    RelayState: 'Unitless',
    ThermostatState: 'Unitless',
    StorageLayer: 'Unitless',
    BinaryState: 'Unitless',
    PercentKeep: 'Percent',
};

export function projectTelemetryName(telemetryName: SpaceheatTelemetryName): Gw1Quantity {
    return PROJECTION[telemetryName];
}

/** Sema: https://schemas.electricity.works/types/spaceheat.telemetry.quantity.projection/001 */
export const SpaceheatTelemetryQuantityProjection = z
    .strictObject({
        TelemetryName: SpaceheatTelemetryName,
        Quantity: Gw1Quantity,
        TypeName: z.literal('spaceheat.telemetry.quantity.projection'),
        Version: z.literal('001'),
    })
    .refine(checkAxiom1, {
        message: 'Axiom 1 (EnumeratedProjectionMapping) failed: TelemetryName and Quantity do not match the enumerated projection',
        path: ['Quantity'],
    });
export type SpaceheatTelemetryQuantityProjection = z.infer<typeof SpaceheatTelemetryQuantityProjection>;

function checkAxiom1(p: { TelemetryName: SpaceheatTelemetryName; Quantity: Gw1Quantity }): boolean {
    return projectTelemetryName(p.TelemetryName) === p.Quantity;
}
