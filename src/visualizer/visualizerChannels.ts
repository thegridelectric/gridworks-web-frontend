export type VisualizerChannelOption = {
    id: string;
    label: string;
};

export type VisualizerChannelGroup = {
    category: string;
    channels: VisualizerChannelOption[];
};

export const CHANNEL_OPTION_GROUPS: VisualizerChannelGroup[] = [
    {
        category: 'Heat pump',
        channels: [
            { id: 'hp-lwt', label: 'Leaving water temperature' },
            { id: 'hp-ewt', label: 'Entering water temperature' },
            { id: 'hp-odu-pwr', label: 'Outdoor unit power' },
            { id: 'hp-idu-pwr', label: 'Indoor unit power' },
            { id: 'primary-flow', label: 'Primary pump flow rate' },
            { id: 'primary-pump-pwr', label: 'Primary pump power' },
            { id: 'oil-boiler-pwr', label: 'Oil boiler power' },
            { id: 'hp-on-highlights', label: 'Highlight HP on times' },
        ],
    },
    {
        category: 'Distribution',
        channels: [
            { id: 'dist-swt', label: 'Source water temperature' },
            { id: 'dist-rwt', label: 'Return water temperature' },
            { id: 'dist-flow', label: 'Distribution pump flow rate' },
            { id: 'dist-pump-pwr', label: 'Distribution pump power' },
        ],
    },
    {
        category: 'Zones',
        channels: [
            { id: 'zone-heat-calls', label: 'Heat calls' },
            { id: 'oat', label: 'Outside air temperature' },
        ],
    },
    {
        category: 'Buffer',
        channels: [
            { id: 'buffer-depths', label: 'Buffer depths' },
            { id: 'buffer-hot-pipe', label: 'Hot pipe' },
            { id: 'buffer-cold-pipe', label: 'Cold pipe' },
        ],
    },
    {
        category: 'Storage',
        channels: [
            { id: 'storage-depths', label: 'Storage depths' },
            { id: 'store-hot-pipe', label: 'Hot pipe' },
            { id: 'store-cold-pipe', label: 'Cold pipe' },
            { id: 'store-flow', label: 'Storage pump flow rate' },
            { id: 'store-pump-pwr', label: 'Storage pump power' },
            { id: 'store-energy', label: 'Available and required energy' },
        ],
    },
];

const NON_DEFAULT_CHANNELS = new Set([
    'buffer-hot-pipe',
    'buffer-cold-pipe',
    'store-hot-pipe',
    'store-cold-pipe',
    'store-energy',
    /** UI + plot shading only; never send as selected_channels to the plots API. */
    'hp-on-highlights',
]);

export const DEFAULT_CHANNELS = new Set(
    CHANNEL_OPTION_GROUPS
        .flatMap((group) => group.channels)
        .map((channel) => channel.id)
        .filter((id) => !NON_DEFAULT_CHANNELS.has(id)),
);

/** Plot-only; strip from POST /plots `selected_channels`. */
export const CLIENT_ONLY_VISUALIZER_CHANNEL_IDS = new Set(['hp-on-highlights']);
