import { useState } from "react";
import SidebarNavLayout from "../_layout/SidebarNavLayout";
import GridworksApi from '../_util/GridWorksApi';

import './VisualizerPage.css';
import VisualizerHeatPumpPlot from "./VisualizerHeatPumpPlot";
import type { ReadingsData } from "./types";

const DEFAULT_CHANNELS = [
    'hp-lwt',
    'hp-ewt',
];



export default function VisualizerPage() {

    const [startDateTime, setStartDateTime] = useState(getDefaultDate(true));
    const [endDateTime, setEndDateTime] = useState(getDefaultDate(false));
    const [channels, setChannels] = useState(DEFAULT_CHANNELS);
    const [readingsData, setReadingsData] = useState<ReadingsData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

            /* <div id="options-div" className="options-container" style="border-top: 1px solid var(--border-color); margin-bottom:0rem">
                <div className="options-content">
                    <div className="options-section" style="margin-top: 1rem;">
                        <h6>Plot settings</h6>
                        <label><input type="checkbox" name="channels" value="show-points">Show points</input></label>
                    </div>
                    <div className="options-section">
                        <h6>Heat pump</h6>
                        <label><input type="checkbox" name="channels" value="hp-lwt" checked>Leaving water temperature</input></label>
                        <label><input type="checkbox" name="channels" value="hp-ewt" checked>Entering water temperature</input></label>
                        <label><input type="checkbox" name="channels" value="hp-odu-pwr" checked>Outdoor unit power</input></label>
                        <label><input type="checkbox" name="channels" value="hp-idu-pwr" checked>Indoor unit power</input></label>
                        <label><input type="checkbox" name="channels" value="primary-flow" checked>Primary pump flow rate</input></label>
                        <label><input type="checkbox" name="channels" value="primary-pump-pwr" checked>Primary pump power</input></label>
                        <label><input type="checkbox" name="channels" value="oil-boiler-pwr" checked>Oil boiler power</input></label>
                    </div>
                    <div className="options-section">
                        <h6>Distribution</h6>
                        <label><input type="checkbox" name="channels" value="dist-swt" checked>Source water temperature</label>
                        <label><input type="checkbox" name="channels" value="dist-rwt" checked>Return water temperature</label>
                        <label><input type="checkbox" name="channels" value="dist-flow" checked>Distribution pump flow rate</label>
                        <label><input type="checkbox" name="channels" value="dist-pump-pwr" checked>Distribution pump power</label>
                    </div>
                    <div className="options-section">
                        <h6>Zones</h6>
                        <label><input type="checkbox" name="channels" value="zone-heat-calls" checked>Heat calls</label>
                        <label><input type="checkbox" name="channels" value="oat" checked>Outside air temperature</label>
                    </div>
                    <div className="options-section">
                        <h6>Buffer</h6>
                        <label><input type="checkbox" name="channels" value="buffer-depths" checked>Buffer depths</label>
                        <label><input type="checkbox" name="channels" value="buffer-hot-pipe">Hot pipe</label>
                        <label><input type="checkbox" name="channels" value="buffer-cold-pipe">Cold pipe</label>
                    </div>
                    <div className="options-section">
                        <h6>Storage</h6>
                        <label><input type="checkbox" name="channels" value="storage-depths" checked>Storage depths</label>
                        <label><input type="checkbox" name="channels" value="store-hot-pipe">Hot pipe</label>
                        <label><input type="checkbox" name="channels" value="store-cold-pipe">Cold pipe</label>
                        <label><input type="checkbox" name="channels" value="store-flow" checked>Storage pump flow rate</label>
                        <label><input type="checkbox" name="channels" value="store-pump-pwr" checked>Storage pump power</label>
                        <label><input type="checkbox" name="channels" value="store-energy">Available and required energy</label>
                    </div>
                </div>
            </div> */


    return <SidebarNavLayout>
        <h1>Visualizer</h1>
        <div>
            <div className="p-4">
                <div className="mb-4">
                    <label className="form-label">Selected House</label>
                    <input type="text" className="form-control text-light border-secondary" id="selected-house" placeholder="Select a house in the table" readOnly={true}></input>
                </div>
                <table className="table table-borderless mb-4 data-query-form">
                    <tbody>
                        <tr>
                            <td>Start</td>
                            <td>
                                <input type="date" className="form-control text-light" value={formatDate(startDateTime)} onChange={evt => setStartDate(evt.currentTarget.value)}></input>
                            </td>
                            <td>
                                <input type="time" className="form-control text-light" value={formatTime(startDateTime)} onChange={evt => setStartTime(evt.currentTarget.value)}></input>
                            </td>
                        </tr>
                        <tr>
                            <td>End</td>
                            <td>
                                <input type="date" className="form-control text-light" value={formatDate(endDateTime)} onChange={evt => setEndDate(evt.currentTarget.value)}></input>
                            </td>
                            <td>
                                <input type="time" className="form-control text-light" value={formatTime(endDateTime)} onChange={evt => setEndTime(evt.currentTarget.value)}></input>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div className="d-flex gap-2 align-items-center">
                    <fieldset disabled={isLoading} style={{ opacity: isLoading ? 0.5 : 1 }}>
                        <button className="btn btn-sm btn-outline-secondary" onClick={onPlotClick}>Plot</button>
                        <button className="btn btn-sm btn-outline-secondary" id="now-btn">8pm-Now</button>
                        <button className="btn btn-sm btn-outline-secondary" id="flo-btn">FLO</button>
                        <button className="btn btn-sm btn-outline-secondary" id="options-btn">Options</button>
                    </fieldset>
                </div>
            </div>

            {readingsData &&
                <div className="plotContainer">
                    <VisualizerHeatPumpPlot showMarkers={false} {...{readingsData}} />
                </div>

            }

        </div>
    </SidebarNavLayout>

    function setStartDate(val: string) {

    }
    function setStartTime(val: string) {

    }
    function setEndDate(val: string) {

    }
    function setEndTime(val: string) {

    }


    // Update getData function to use selected channels
    async function onPlotClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        if (event) {
            event.preventDefault();
        }

        // const selectedChannels = Array.from(document.querySelectorAll('input[name="channels"]:checked'))
        //     .map(checkbox => checkbox.value);

        setIsLoading(true);
        try {
            const result = await GridworksApi.get<ReadingsData>('/api/v2/installations/a/readings', {
                params: {
                    start: startDateTime.toISOString(),
                    end: endDateTime.toISOString(),
                    channels: channels.join(',')
                }
            });
            setReadingsData(result.data);
        }
        catch (error) {
            console.error('Error getting plots:', error);
            // Refresh the page on API failure
            location.reload();
        }
        finally {
            setIsLoading(false);
        }
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

function formatDate(dt: Date) {
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatTime(dt: Date) {
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;

}
function getDefaultTime(start: boolean) {
    const nyDate = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
    if (start) {
        nyDate.setDate(nyDate.getDate() - 1);
        nyDate.setHours(20, 0, 0, 0);
    } else {
        nyDate.setMinutes(nyDate.getMinutes() + 1);
    }
    const hours = String(nyDate.getHours()).padStart(2, '0');
    const minutes = String(nyDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
