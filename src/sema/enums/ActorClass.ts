import { z } from 'zod';
import { semaStrEnum } from './semaEnum';

/** Sema: https://schemas.electricity.works/enums/gw1.actor.class/014 */
export const ActorClass = semaStrEnum(
    'gw1.actor.class',
    '014',
    [
        'NoActor',
        'PrimaryScada',
        'SecondaryScada',
        'PowerMeter',
        'LocalControl',
        'LeafAlly',
        'DerivedGenerator',
        'PicoCycler',
        'HpBoss',
        'I2cRelayMultiplexer',
        'I2cZeroTenMultiplexer',
        'Hubitat',
        'Relay',
        'MultipurposeSensor',
        'HoneywellThermostat',
        'ApiTankModule',
        'ApiFlowModule',
        'ZeroTenOutputer',
        'ApiBtuMeter',
        'SiegLoop',
        'GpioSensor',
        'I2cBus',
        'I2cRelayBoard',
        'I2cThermistorReader',
        'SimSensorActor',
        'SimRelayActor',
        'I2cDacWriter',
        'HpTwin',
        'FiveVBoss',
        'HpWatch',
        'ColdWatch',
    ],
    'NoActor',
);
export type ActorClass = z.infer<typeof ActorClass>;
