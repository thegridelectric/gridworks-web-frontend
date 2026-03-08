interface RealTimeStatusHeaderProps {
    err: string | null,
    isConnected: boolean,
    targetGNode: string | null
}

export default function RealTimeStatusHeader({ err, isConnected, targetGNode }: RealTimeStatusHeaderProps) {

    let statusLeft, statusRight;
    if (err) {
        statusLeft = 'Error, connection failed';
        statusRight = '-';
    } else if (isConnected) {
        if (targetGNode) {
            const gnodeParts = targetGNode.split('.');
            const beforeLastPart = gnodeParts.length > 1 ? gnodeParts[gnodeParts.length - 2] : '';
            const capitalizedPart = beforeLastPart.charAt(0).toUpperCase() + beforeLastPart.slice(1);
            statusLeft = <b>{capitalizedPart}</b>
            statusRight = <span style={{ color: 'var(--text-muted)', fontSize: '1em' }}>{targetGNode}</span>
        } else {
            statusLeft = 'Connected';
            statusRight = '';
        }
    } else {
        statusLeft = 'Connecting...';
        statusRight = '';
    }

    return <div id="dashboard-status">
        <div id="dashboard-status-left">
            {statusLeft}
        </div>
        <div id="dashboard-status-right">
            {statusRight}
        </div>
    </div>


}