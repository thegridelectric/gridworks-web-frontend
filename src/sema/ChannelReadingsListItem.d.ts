/** Sema `channel.readings.list.item` 000: one channel's series on the
 *  bundle's time grid, in `Unit` from the `UnitType` vocabulary. A grid
 *  point with no reading is null. */
export interface ChannelReadingsListItem {
    TypeName: 'channel.readings.list.item';
    Version: '000';
    ChannelName: string;
    ValueList: (number | null)[];
    Unit: string;
    UnitType: string;
}
