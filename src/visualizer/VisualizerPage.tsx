import { useState } from "react";
import SidebarNavLayout from "../_layout/SidebarNavLayout";
import GridworksApi from '../_util/GridWorksApi';

import './VisualizerPage.css';
import VisualizerHeatPumpPlot from "./VisualizerHeatPumpPlot";
import type { ReadingsData } from "./types";
import DateTimePicker from "../_shared/DateTimePicker";
import { Spinner } from "react-bootstrap";
import InstallationPicker from "../_shared/InstallationPicker";
import { useLocation } from "react-router";
import { parsePathname } from "../_util/urlUtility";

const CHANNEL_OPTION_GROUPS = [
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
]

const NON_DEFAULT_CHANNELS = new Set([
    'buffer-hot-pipe',
    'buffer-cold-pipe',
    'store-hot-pipe',
    'store-cold-pipe',
    'store-energy'
])
const DEFAULT_CHANNELS = new Set(CHANNEL_OPTION_GROUPS.flatMap(g => g.channels).map(c => c.id).filter(id => !NON_DEFAULT_CHANNELS.has(id)))

export default function VisualizerPage() {

    const [startDateTime, setStartDateTime] = useState(getDefaultDate(true));
    const [endDateTime, setEndDateTime] = useState(getDefaultDate(false));
    const [channels, setChannels] = useState(DEFAULT_CHANNELS);
    const [readingsData, setReadingsData] = useState<ReadingsData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isShowingOptions, setIsShowingOptions] = useState(false);
    const [showPoints, setShowPoints] = useState(false);

    const location = useLocation();
    const { currentInstallationId } = parsePathname(location.pathname);

    function setIncludesChannel(id: string, isIncluded: boolean) {
        if (isIncluded && !channels.has(id)) {
            const newChannels = new Set(channels);
            newChannels.add(id);
            setChannels(newChannels)
        } else if (!isIncluded && channels.has(id)) {
            const newChannels = new Set(channels);
            newChannels.delete(id);
            setChannels(newChannels);
        }
    }

    return <SidebarNavLayout>
        <h1>Visualizer</h1>
        <div>
            <div className="p-4">
                <div className="mb-4">
                    <InstallationPicker />
                </div>
                <div className="mb-3 datetime-picker">
                    <label className="form-label">Start</label>
                    <DateTimePicker className="form-control "
                        value={startDateTime} onChange={setStartDateTime} />
                </div>
                <div className="mb-3 datetime-picker">
                    <label className="form-label">End</label>
                    <DateTimePicker className="form-control "
                        value={endDateTime} onChange={setEndDateTime} />
                </div>

                <fieldset className="d-flex gap-2 align-items-center" disabled={isLoading} style={{ opacity: isLoading ? 0.5 : 1 }}>
                    <button className="btn btn-sm btn-outline-secondary" onClick={onPlotClick}>Plot</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={onNowClick}>8pm-Now</button>
                    <button className="btn btn-sm btn-outline-secondary" id="flo-btn">FLO</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setIsShowingOptions(!isShowingOptions)}>Options</button>
                </fieldset>
            </div>

            {isShowingOptions &&
                <div id="options-div bt-1 mb-0" className="options-container border-top">
                    <div className="options-section mt-2">
                        <h6>Plot settings</h6>
                        <label>
                            <input type="checkbox" checked={showPoints} onChange={evt => {
                                setShowPoints(evt.currentTarget.checked);
                            }} />
                            Show points
                        </label>
                    </div>
                    {CHANNEL_OPTION_GROUPS.map(g => {
                        return <div key={g.category} className="options-section">
                            <h6>{g.category}</h6>
                            {g.channels.map(c => {
                                return <label>
                                    <input type="checkbox" checked={channels.has(c.id)}
                                        onChange={evt => {
                                            setIncludesChannel(c.id, evt.currentTarget.checked)
                                        }} />
                                    {c.label}
                                </label>;
                            })}
                        </div>
                    })}

                </div>
            }

            {isLoading &&
                <div className="p-3 text-center">
                    <Spinner />
                </div>
            }
            {readingsData &&
                <div className="plot-container border-top">
                    <VisualizerHeatPumpPlot showMarkers={showPoints} {...{ readingsData }} />
                </div>
            }

        </div>
    </SidebarNavLayout>

    function onNowClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();
        setStartDateTime(getDefaultDate(true));
        setEndDateTime(new Date());
    }

    // Update getData function to use selected channels
    async function onPlotClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();

        // const selectedChannels = Array.from(document.querySelectorAll('input[name="channels"]:checked'))
        //     .map(checkbox => checkbox.value);

        setIsLoading(true);
        setReadingsData(null);
        try {
            const result = await GridworksApi.get<ReadingsData>(`/api/v2/installations/${currentInstallationId}/readings`, {
                params: {
                    start: startDateTime.toISOString(),
                    end: endDateTime.toISOString(),
                    channels: [...channels].sort().join(',')
                }
            });
            setReadingsData(result.data);
        }
        catch (error) {
            console.error('Error getting plots:', error);
            // Refresh the page on API failure
            window.location.reload();
        }
        finally {
            setIsLoading(false);
        }
    }



    function getDefaultDate(start: boolean) {
        const nyDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
        if (start) {
            nyDate.setDate(nyDate.getDate() - 1);
            nyDate.setHours(20, 0, 0, 0);
        } else {
            nyDate.setMinutes(nyDate.getMinutes() + 1);
        }
        return nyDate;
    }
}