import { useState } from 'react';

import { DEFAULT_CHANNELS } from './visualizerChannels';

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
