/** Sema `operating.state.sequence` 000: a state machine's changes inside
 *  the window, the state's symbol at each change. Timestamps are UTC ISO
 *  8601 to the millisecond and strictly increasing. */
export interface OperatingStateSequence {
    TypeName: 'operating.state.sequence';
    Version: '000';
    ChannelName: string;
    ValueList: string[];
    TimestampList: string[];
}
