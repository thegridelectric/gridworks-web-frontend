/** Sema `gw.house.operating.status` 000: the slow facts of the LTN–scada
 *  agreement for one house, as its scada last stated them. */
export type StandbyPosture = 'MonitorOnly' | 'NoHeatingOrCooling';
export type SeasonalStorageMode = 'AllTanks' | 'BufferOnly';
export type ServiceMode = 'Heating' | 'Cooling';
export type TopState = 'Auto' | 'Admin';
export type ValidationState =
    | 'UnValidated'
    | 'ValidatedRealAssetAndGps'
    | 'ValidatedRealAssetIncorrectGps'
    | 'ValidatedSimulatedAsset';
export type DispatchRefusalReason =
    | 'NoTaDeed'
    | 'OperatorHold'
    | 'ServiceContractBroken'
    | 'ScadaBlind'
    | 'InAdmin';

export interface HouseOperatingStatus {
    TypeName: 'gw.house.operating.status';
    Version: '000';
    ScadaAlias: string;
    ValidationState: ValidationState;
    Standby: boolean;
    StandbyPosture: StandbyPosture;
    SeasonalStorageMode: SeasonalStorageMode;
    ServiceMode: ServiceMode;
    AcceptsDispatch: boolean;
    /** Present only when AcceptsDispatch is false. */
    DispatchRefusalReason?: DispatchRefusalReason;
    TopState: TopState;
    ScadaBlind: boolean;
    LtnDispatching: boolean;
    /** The scada's clock when the status was produced, ms since the epoch. */
    CreatedMs: number;
}
