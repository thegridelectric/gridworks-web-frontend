import { CHANNEL_OPTION_GROUPS } from './visualizerChannels';

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
