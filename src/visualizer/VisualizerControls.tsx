import { useState } from 'react';

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
        ]
    },
    {
        category: 'Distribution',
        channels: [
            { id: 'dist-swt', label: 'Source water temperature' },
            { id: 'dist-rwt', label: 'Return water temperature' },
            { id: 'dist-flow', label: 'Distribution pump flow rate' },
            { id: 'dist-pump-pwr', label: 'Distribution pump power' },
        ]
    },
    {
        category: 'Zones',
        channels: [
            { id: 'zone-heat-calls', label: 'Heat calls' },
            { id: 'oat', label: 'Outside air temperature' },
        ]
    },
    {
        category: 'Buffer',
        channels: [
            { id: 'buffer-depths', label: 'Buffer depths' },
            { id: 'buffer-hot-pipe', label: 'Hot pipe' },
            { id: 'buffer-cold-pipe', label: 'Cold pipe' },
        ]
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
        ]
    },
];

const NON_DEFAULT_CHANNELS = new Set([
    'buffer-hot-pipe',
    'buffer-cold-pipe',
    'store-hot-pipe',
    'store-cold-pipe',
    'store-energy'
]);

export const DEFAULT_CHANNELS = new Set(
    CHANNEL_OPTION_GROUPS
        .flatMap((group) => group.channels)
        .map((channel) => channel.id)
        .filter((id) => !NON_DEFAULT_CHANNELS.has(id))
);

export function useVisualizerControls() {
    const [channels, setChannels] = useState(DEFAULT_CHANNELS);
    const [isShowingOptions, setIsShowingOptions] = useState(false);
    const [showPoints, setShowPoints] = useState(false);

    function setIncludesChannel(id: string, isIncluded: boolean) {
        if (isIncluded && !channels.has(id)) {
            const newChannels = new Set(channels);
            newChannels.add(id);
            setChannels(newChannels);
        } else if (!isIncluded && channels.has(id)) {
            const newChannels = new Set(channels);
            newChannels.delete(id);
            setChannels(newChannels);
        }
    }

    function resetControls() {
        setIsShowingOptions(false);
        setShowPoints(false);
        setChannels(DEFAULT_CHANNELS);
    }

    return {
        channels,
        isShowingOptions,
        setIsShowingOptions,
        showPoints,
        setShowPoints,
        setIncludesChannel,
        resetControls,
    };
}

export function VisualizerOptionsPanel({
    isShowingOptions,
    showPoints,
    setShowPoints,
    channels,
    setIncludesChannel,
}: {
    isShowingOptions: boolean;
    showPoints: boolean;
    setShowPoints: (value: boolean) => void;
    channels: Set<string>;
    setIncludesChannel: (id: string, isIncluded: boolean) => void;
}) {
    if (!isShowingOptions) {
        return null;
    }

    return (
        <div id="options-div" className="options-container border-top mb-0">
            <div className="options-content">
                <div className="options-section mt-3">
                    <h6>Plot settings</h6>
                    <label>
                        <input
                            type="checkbox"
                            checked={showPoints}
                            onChange={(evt) => setShowPoints(evt.currentTarget.checked)}
                        />
                        Show points
                    </label>
                </div>
                {CHANNEL_OPTION_GROUPS.map((group) => (
                    <div key={group.category} className="options-section">
                        <h6>{group.category}</h6>
                        {group.channels.map((channel) => (
                            <label key={channel.id}>
                                <input
                                    type="checkbox"
                                    checked={channels.has(channel.id)}
                                    onChange={(evt) => {
                                        setIncludesChannel(channel.id, evt.currentTarget.checked);
                                    }}
                                />
                                {channel.label}
                            </label>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
