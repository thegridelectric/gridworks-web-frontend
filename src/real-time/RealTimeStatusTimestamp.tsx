import { useEffect, useState } from "react";

interface RealTimeStatusTimestampProps {
    updateTime: Date
}

export default function ({ updateTime }: RealTimeStatusTimestampProps) {

    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 100);
        return () => {
            clearInterval(interval);
        };
    }, []);

    let formattedTime = 'Unknown';
    let isDataFresh = false;

    // TODO why is this Swedish??
    // Should we display it in user-local timezone? 
    formattedTime = updateTime.toLocaleString('sv-SE', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const twoMinutesAgo = new Date(currentTime.getTime() - 2 * 60 * 1000);
    isDataFresh = updateTime > twoMinutesAgo;
    const statusStyle = {
        color: isDataFresh ? 'var(--text-muted)' : 'red',
        fontWeight: isDataFresh ? '' : 'bold'
    };

    const seconds = currentTime.getSeconds();
    const milliseconds = currentTime.getMilliseconds();

    let progress;

    if (seconds < 30) {
        // We're in the first half of the minute (xx:00 to xx:30)
        // Progress from 0% to 100% over 30 seconds
        progress = (seconds + milliseconds / 1000) / 30 * 100;
    } else {
        // We're in the second half of the minute (xx:30 to xx:00)
        // Progress from 0% to 100% over 30 seconds
        progress = ((seconds - 30) + milliseconds / 1000) / 30 * 100;
    }

    // Set the progress bar width0
    const loaderProgressStyle = { width: Math.min(100, Math.max(0, progress)) + '%' };


    return <div id="dashboard-snapshot-timestamp" className="text-center text-muted mt-0" style={statusStyle}>
        Last snapshot: <span id="dashboard-snapshot-time" style={statusStyle}>{formattedTime}</span>

        {/* Loader */}
        <div id="dashboard-loader" className="mt-1">
            <span>Next snapshot:</span>
            <div id="loader-bar" style={{ 'display': isDataFresh ? 'flex' : 'none' }}>
                <div id="loader-progress" style={loaderProgressStyle}></div>
            </div>
        </div>

    </div>

}