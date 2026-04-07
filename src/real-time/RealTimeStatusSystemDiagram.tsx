import RealTimeStatusSystemDiagramPipes from "./RealTimeStatusSystemDiagramPipes";

interface RelayStatus {
    state: string,
    display_name: string
}

interface RealTimeStatusSystemDiagramProps {
    readings: Record<string, number>,
    relays: Record<string, RelayStatus>,
    isSpruce: boolean,
}

export default function RealTimeStatusSystemDiagram({ relays, readings, isSpruce }: RealTimeStatusSystemDiagramProps) {
    // Layout tweaks (tank/house shift) apply only to Spruce; other homes keep the original 3-tank diagram.
    const tank1X = isSpruce ? 340 : 460;
    const tank1TextX = isSpruce ? 400 : 520;
    const tank1LabelX = isSpruce ? 440 : 560;
    const storeColdPipeLabelX = (isSpruce ? tank1X : 200) - 55;

    const houseShiftX = isSpruce ? 120 : 0;
    const houseLeftX = (isSpruce ? 480 : 660) + houseShiftX;
    const houseWidth = isSpruce ? 170 : 120;
    const houseTextX = houseLeftX + houseWidth / 2;
    const houseRoofLeftX = houseLeftX - 3;
    const houseRoofRightX = houseLeftX + houseWidth + 3;
    // Spruce: nudge dist labels away from the risers (both farther left than the non-Spruce layout).
    const distSwtX = isSpruce ? houseLeftX + houseWidth + 55 : houseLeftX + houseWidth + 30;
    const distRwtX = isSpruce ? houseLeftX - 58 : houseLeftX - 30;
    const distLabelY = isSpruce ? 315 : 405;
    const floorSwtX = distSwtX;
    const floorRwtX = distRwtX;
    const floorLabelY = isSpruce ? 438 : 405;

    const heatPumpHeight = 200;
    const heatPumpY = 50;
    const hpPipeTempLabelCenterX = 170;
    const spruceAuxComponentWidth = 120 / 3;
    const spruceAuxComponentX = hpPipeTempLabelCenterX + 38 + 10;
    const hexSecondaryTempLabelX = spruceAuxComponentX + spruceAuxComponentWidth + 18;
    const spruceHexPlateFill = "#5a5a62";
    const spruceHexPlateLineStroke = "#3a3a42";
    const spruceHexPlateLines: number[] = isSpruce
        ? Array.from({ length: 9 }, (_, i) => {
            const u = (i + 1) / 10;
            const inset = 3;
            return spruceAuxComponentX + inset + u * (spruceAuxComponentWidth - 2 * inset);
        })
        : [];

    const { currentState, shouldAnimateHouse, hasPrimFlow, animateBufferDistLoop, storageDischargePipeAnimation } =
        getCurrentState(relays, readings);

    let storageTankAnimationColor;
    if (storageDischargePipeAnimation) {
        storageTankAnimationColor = 'url(#dashboardTankHeatLinesBottomToTop)'
    } else if (currentState === 'HpOnStoreCharge') {
        storageTankAnimationColor = 'url(#dashboardTankHeatLinesTopToBottom)'
    }
    
    return <div id="dashboard-system-diagram">
        <svg id="dashboard-diagram-svg" viewBox="0 0 1000 500">
            <defs>
                {/* Dynamic gradient for heat pump animation (EWT to LWT) */}
                <linearGradient id="dashboardHeatGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="25%" style={getGradientStopStyle(readings, 'hp-ewt')} />
                    <stop offset="75%" style={getGradientStopStyle(readings, 'hp-lwt')} />
                </linearGradient>

                {/* Dynamic gradient for house animation (dist-rwt to dist-swt, left to right) */}
                <linearGradient id="dashboardHouseHeatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="25%" style={getGradientStopStyle(readings, 'dist-rwt')} />
                    <stop offset="75%" style={getGradientStopStyle(readings, 'dist-swt')} />
                </linearGradient>

                {/* Flow pattern for HpOffStoreDischarge top horizontal pipe */}
                <pattern id="dashboardFlowPattern" x="0" y="0" width="90" height="15" patternUnits="userSpaceOnUse">
                    <rect width="90" height="15" fill="#4CAF50" />
                    <rect x="0" y="0" width="15" height="15" fill="#66BB6A" />
                    <rect x="30" y="0" width="15" height="15" fill="#66BB6A" />
                    <rect x="60" y="0" width="15" height="15" fill="#66BB6A" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 0; 90 0"
                        dur="1.2s"
                        repeatCount="indefinite" />
                </pattern>

                {/* Flow pattern for HpOffStoreDischarge vertical pipe (upward flow) */}
                <pattern id="dashboardVerticalFlowPattern" x="0" y="0" width="15" height="90" patternUnits="userSpaceOnUse">
                    <rect width="15" height="90" fill="#4CAF50" />
                    <rect x="0" y="0" width="15" height="15" fill="#66BB6A" />
                    <rect x="0" y="30" width="15" height="15" fill="#66BB6A" />
                    <rect x="0" y="60" width="15" height="15" fill="#66BB6A" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 0; 0 -90"
                        dur="1.2s"
                        repeatCount="indefinite" />
                </pattern>

                {/* Flow pattern for HpOffStoreDischarge vertical pipe (downward flow) */}
                <pattern id="dashboardVerticalDownFlowPattern" x="0" y="0" width="15" height="90" patternUnits="userSpaceOnUse">
                    <rect width="15" height="90" fill="#4CAF50" />
                    <rect x="0" y="0" width="15" height="15" fill="#66BB6A" />
                    <rect x="0" y="30" width="15" height="15" fill="#66BB6A" />
                    <rect x="0" y="60" width="15" height="15" fill="#66BB6A" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 0; 0 90"
                        dur="1.2s"
                        repeatCount="indefinite" />
                </pattern>

                {/* Flow pattern for HpOffStoreDischarge horizontal pipe (leftward flow) */}
                <pattern id="dashboardLeftFlowPattern" x="0" y="0" width="90" height="15" patternUnits="userSpaceOnUse">
                    <rect width="90" height="15" fill="#4CAF50" />
                    <rect x="0" y="0" width="15" height="15" fill="#66BB6A" />
                    <rect x="30" y="0" width="15" height="15" fill="#66BB6A" />
                    <rect x="60" y="0" width="15" height="15" fill="#66BB6A" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 0; -90 0"
                        dur="1.2s"
                        repeatCount="indefinite" />
                </pattern>

                {/* Moving heat lines pattern */}
                <pattern id="dashboardHeatLinesPattern" x="0" y="0" width="20" height="120" patternUnits="userSpaceOnUse">
                    <path d="M 3,10 Q 10,7 17,10 Q 10,13 3,10" fill="#999" opacity="0.12" />
                    <path d="M 3,30 Q 10,27 17,30 Q 10,33 3,30" fill="#999" opacity="0.12" />
                    <path d="M 3,50 Q 10,47 17,50 Q 10,53 3,50" fill="#999" opacity="0.12" />
                    <path d="M 3,70 Q 10,67 17,70 Q 10,73 3,70" fill="#999" opacity="0.12" />
                    <path d="M 3,90 Q 10,87 17,90 Q 10,93 3,90" fill="#999" opacity="0.12" />
                    <path d="M 3,110 Q 10,107 17,110 Q 10,113 3,110" fill="#999" opacity="0.12" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 0; 0 -120"
                        dur="3s"
                        repeatCount="indefinite" />
                </pattern>

                {/* Buffer heat lines pattern - top to bottom flow */}
                <pattern id="dashboardBufferHeatLinesTopToBottom" x="0" y="0" width="20" height="120" patternUnits="userSpaceOnUse">
                    <path d="M 3,10 Q 10,7 17,10 Q 10,13 3,10" fill="#999" opacity="0.12" />
                    <path d="M 3,30 Q 10,27 17,30 Q 10,33 3,30" fill="#999" opacity="0.12" />
                    <path d="M 3,50 Q 10,47 17,50 Q 10,53 3,50" fill="#999" opacity="0.12" />
                    <path d="M 3,70 Q 10,67 17,70 Q 10,73 3,70" fill="#999" opacity="0.12" />
                    <path d="M 3,90 Q 10,87 17,90 Q 10,93 3,90" fill="#999" opacity="0.12" />
                    <path d="M 3,110 Q 10,107 17,110 Q 10,113 3,110" fill="#999" opacity="0.12" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 0; 0 120"
                        dur="3s"
                        repeatCount="indefinite" />
                </pattern>

                {/* Buffer heat lines pattern - bottom to top flow */}
                <pattern id="dashboardBufferHeatLinesBottomToTop" x="0" y="0" width="20" height="120" patternUnits="userSpaceOnUse">
                    <path d="M 3,10 Q 10,7 17,10 Q 10,13 3,10" fill="#999" opacity="0.12" />
                    <path d="M 3,30 Q 10,27 17,30 Q 10,33 3,30" fill="#999" opacity="0.12" />
                    <path d="M 3,50 Q 10,47 17,50 Q 10,53 3,50" fill="#999" opacity="0.12" />
                    <path d="M 3,70 Q 10,67 17,70 Q 10,73 3,70" fill="#999" opacity="0.12" />
                    <path d="M 3,90 Q 10,87 17,90 Q 10,93 3,90" fill="#999" opacity="0.12" />
                    <path d="M 3,110 Q 10,107 17,110 Q 10,113 3,110" fill="#999" opacity="0.12" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 120; 0 0"
                        dur="3s"
                        repeatCount="indefinite" />
                </pattern>

                {/* Moving heat lines pattern for house (uniform, seamless) */}
                <pattern id="dashboardHouseHeatLinesPattern" x="0" y="0" width="120" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 10,3 Q 7,10 10,17 Q 13,10 10,3" fill="#999" opacity="0.12" />
                    <path d="M 30,3 Q 27,10 30,17 Q 33,10 30,3" fill="#999" opacity="0.12" />
                    <path d="M 50,3 Q 47,10 50,17 Q 53,10 50,3" fill="#999" opacity="0.12" />
                    <path d="M 70,3 Q 67,10 70,17 Q 73,10 70,3" fill="#999" opacity="0.12" />
                    <path d="M 90,3 Q 87,10 90,17 Q 93,10 90,3" fill="#999" opacity="0.12" />
                    <path d="M 110,3 Q 107,10 110,17 Q 113,10 110,3" fill="#999" opacity="0.12" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 0; -120 0"
                        dur="3s"
                        repeatCount="indefinite" />
                </pattern>

                {/* Tank heat lines pattern - top to bottom flow */}
                <pattern id="dashboardTankHeatLinesTopToBottom" x="0" y="0" width="20" height="120" patternUnits="userSpaceOnUse">
                    <path d="M 3,10 Q 10,7 17,10 Q 10,13 3,10" fill="#999" opacity="0.12" />
                    <path d="M 3,30 Q 10,27 17,30 Q 10,33 3,30" fill="#999" opacity="0.12" />
                    <path d="M 3,50 Q 10,47 17,50 Q 10,53 3,50" fill="#999" opacity="0.12" />
                    <path d="M 3,70 Q 10,67 17,70 Q 10,73 3,70" fill="#999" opacity="0.12" />
                    <path d="M 3,90 Q 10,87 17,90 Q 10,93 3,90" fill="#999" opacity="0.12" />
                    <path d="M 3,110 Q 10,107 17,110 Q 10,113 3,110" fill="#999" opacity="0.12" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 0; 0 120"
                        dur="3s"
                        repeatCount="indefinite" />
                </pattern>

                {/* Tank heat lines pattern - bottom to top flow */}
                <pattern id="dashboardTankHeatLinesBottomToTop" x="0" y="0" width="20" height="120" patternUnits="userSpaceOnUse">
                    <path d="M 3,10 Q 10,7 17,10 Q 10,13 3,10" fill="#999" opacity="0.12" />
                    <path d="M 3,30 Q 10,27 17,30 Q 10,33 3,30" fill="#999" opacity="0.12" />
                    <path d="M 3,50 Q 10,47 17,50 Q 10,53 3,50" fill="#999" opacity="0.12" />
                    <path d="M 3,70 Q 10,67 17,70 Q 10,73 3,70" fill="#999" opacity="0.12" />
                    <path d="M 3,90 Q 10,87 17,90 Q 10,93 3,90" fill="#999" opacity="0.12" />
                    <path d="M 3,110 Q 10,107 17,110 Q 10,113 3,110" fill="#999" opacity="0.12" />
                    <animateTransform
                        attributeName="patternTransform"
                        type="translate"
                        values="0 120; 0 0"
                        dur="3s"
                        repeatCount="indefinite" />
                </pattern>
            </defs>

            {/* Heat pump */}
            {renderStaticHeatPump()}
            {(currentState === 'HpOnStoreOff' || currentState === 'HpOnStoreCharge') &&
                <g id="dashboard-hp-animation">
                    <rect x="20" y="50" width="120" height="200" rx="10" fill="url(#dashboardHeatGradient)" />
                    <rect x="20" y="50" width="120" height="200" rx="10" fill="url(#dashboardHeatLinesPattern)" />
                    <text id="dashboard-hp-lift" x="80" y="150" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="16" fontWeight="600">
                        Lift<tspan x="80" dy="1.2em">{formatTempDelta(readings, 'hp-lwt', 'hp-ewt')}</tspan>
                    </text>
                </g>
            }
            <text x="80" y="270" textAnchor="middle" fill="var(--text-color)" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">Heat pump</text>

            {/* Buffer */}
            {renderBufferTank(readings, isSpruce)}
            {(currentState === 'HpOnStoreOff' || storageDischargePipeAnimation ||
                (shouldAnimateHouse && (isSpruce ? currentState === 'HpOffStoreOff' : (currentState === 'HpOffStoreOff' || animateBufferDistLoop)))) &&
                <g id="dashboard-buffer-animation">
                    <rect x="860" y="50" width="120" height="200" rx="10" fill="url(#dashboardBufferHeatLinesTopToBottom)" />
                </g>
            }

            {renderStaticHouse(houseLeftX, houseWidth, houseTextX, houseRoofLeftX, houseRoofRightX)}

            {!isSpruce && renderStorageTank3(readings)}
            {!isSpruce && renderStorageTank2(readings)}
            {renderStorageTank1(readings, tank1X, tank1TextX, isSpruce)}

            {(storageDischargePipeAnimation || currentState === 'HpOnStoreCharge') &&
                <>
                    {!isSpruce &&
                        <g id="dashboard-tank3-animation">
                            <rect x="200" y="280" width="120" height="200" rx="10" fill={storageTankAnimationColor} />
                        </g>
                    }

                    {!isSpruce &&
                        <g id="dashboard-tank2-animation">
                            <rect x="330" y="280" width="120" height="200" rx="10" fill={storageTankAnimationColor} />
                        </g>
                    }

                    <g id="dashboard-tank1-animation">
                        <rect x={tank1X} y="280" width="120" height="200" rx="10" fill={storageTankAnimationColor} />
                    </g>
                </>
            }

            <RealTimeStatusSystemDiagramPipes {...{currentState, shouldAnimateHouse, hasPrimFlow, animateBufferDistLoop, storageDischargePipeAnimation, isSpruce, tank1X, houseLeftX, houseWidth}} />

            {isSpruce &&
                <>
                    <defs>
                        <clipPath id="dashboard-spruce-hex-plate-clip">
                            <rect
                                x={spruceAuxComponentX}
                                y={heatPumpY}
                                width={spruceAuxComponentWidth}
                                height={heatPumpHeight}
                                rx="10"
                            />
                        </clipPath>
                    </defs>
                    <g id="dashboard-spruce-hex" clipPath="url(#dashboard-spruce-hex-plate-clip)">
                        <rect
                            id="dashboard-spruce-hp-aux"
                            x={spruceAuxComponentX}
                            y={heatPumpY}
                            width={spruceAuxComponentWidth}
                            height={heatPumpHeight}
                            fill={spruceHexPlateFill}
                        />
                        <g id="dashboard-spruce-hex-plates" stroke={spruceHexPlateLineStroke} strokeWidth="1.1" strokeLinecap="square">
                            {spruceHexPlateLines.map((lineX) => (
                                <line
                                    key={lineX}
                                    x1={lineX}
                                    x2={lineX}
                                    y1={heatPumpY}
                                    y2={heatPumpY + heatPumpHeight}
                                />
                            ))}
                        </g>
                    </g>
                    <text
                        id="dashboard-spruce-hex-label"
                        x={spruceAuxComponentX + spruceAuxComponentWidth / 2}
                        y="270"
                        textAnchor="middle"
                        fill="var(--text-color)"
                        fontFamily="Montserrat, sans-serif"
                        fontSize="14"
                        fontWeight="600"
                    >
                        HEX
                    </text>
                </>
            }

            {/* Store hot pipe temperature label (above Tank 1) */}
            <text x={tank1LabelX} y="260" textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                {formatTemp(readings, 'store-hot-pipe')}
            </text>

            {/* Store cold pipe temperature label (left of bottom return / Tank 3) */}
            <text x={storeColdPipeLabelX} y="430" textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                {formatTemp(readings, 'store-cold-pipe')}
            </text>

            {/* Top pipe (from top of heat pump to top of buffer) temperature label */}
            <text x="170" y="70" textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                {formatTemp(readings, 'hp-lwt')}
            </text>

            {/* Bottom pipe (from bottom of heat pump to bottom of buffer) temperature label */}
            <text x="170" y="210" textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                {formatTemp(readings, 'hp-ewt')}
            </text>

            {isSpruce &&
                <>
                    <text
                        id="dashboard-secondary-lwt"
                        x={hexSecondaryTempLabelX}
                        y="70"
                        textAnchor="middle"
                        fill="#888"
                        fontFamily="Montserrat, sans-serif"
                        fontSize="14"
                        fontWeight="600"
                    >
                        {formatTemp(readings, 'secondary-lwt')}
                    </text>
                    <text
                        id="dashboard-secondary-ewt"
                        x={hexSecondaryTempLabelX}
                        y="210"
                        textAnchor="middle"
                        fill="#888"
                        fontFamily="Montserrat, sans-serif"
                        fontSize="14"
                        fontWeight="600"
                    >
                        {formatTemp(readings, 'secondary-ewt')}
                    </text>
                </>
            }

            {/* Dist system labels */}
            <text x={distSwtX} y={distLabelY} textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                {formatTemp(readings, 'dist-swt')}
            </text>
            <text id="dashboard-dist-rwt" x={distRwtX} y={distLabelY} textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                {formatTemp(readings, 'dist-rwt')}
            </text>

            {isSpruce &&
                <>
                    <text id="dashboard-floor-rwt" x={floorRwtX} y={floorLabelY} textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                        {formatTemp(readings, 'floor-rwt')}
                    </text>
                    <text id="dashboard-floor-swt" x={floorSwtX} y={floorLabelY} textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                        {formatTemp(readings, 'floor-swt')}
                    </text>
                </>
            }

            {/* Buffer pipe temperature labels */}
            <text id="dashboard-buffer-hot-pipe" x="830" y="70" textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                {formatTemp(readings, 'buffer-hot-pipe')}
            </text>
            <text id="dashboard-buffer-cold-pipe" x="830" y="210" textAnchor="middle" fill="#888" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
                {formatTemp(readings, 'buffer-cold-pipe')}
            </text>

            {/* House animation group (moved to end to ensure visibility) */}
            {shouldAnimateHouse &&
                <g id="dashboard-house-animation">
                    <rect x={houseLeftX} y="335" width={houseWidth} height="90" rx="0" fill="url(#dashboardHouseHeatGradient)" />
                    <polygon points={`${houseRoofLeftX},336 ${houseRoofRightX},336 ${houseTextX},290`} fill="url(#dashboardHouseHeatGradient)" />
                    {/* <rect x="660" y="280" width="120" height="200" rx="10" fill="url(#dashboardHouseHeatGradient)"/> */}
                    <rect x={houseLeftX} y="335" width={houseWidth} height="90" rx="10" fill="url(#dashboardHouseHeatLinesPattern)" />
                    <text id="dashboard-house-drop" x={houseTextX} y="375" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="16" fontWeight="600">
                        Drop<tspan x={houseTextX} dy="1.2em">{formatTempDelta(readings, 'dist-swt', 'dist-rwt')}</tspan>
                    </text>
                </g>
            }

        </svg>
    </div>
}

function getTempColor(temp: number) {
    const minTemp = 50;
    const maxTemp = 160;
    const normalizedTemp = (temp - minTemp) / (maxTemp - minTemp);
    const red = Math.min(255, Math.floor(255 * normalizedTemp));
    const blue = Math.min(255, Math.floor(255 * (1 - normalizedTemp)));
    const backgroundColor = `rgba(${red}, 0, ${blue}, 0.86)`;
    return backgroundColor;
}

function getGradientStopStyle(readings: Record<string, number>, channelName: string) {
    const temp = tempValueToFahrenheit(channelName, readings[channelName]);
    if (temp === null) {
        return {
            stopOpacity: 1,
            stopColor: '#888'
        };
    }

    return {
        stopOpacity: 1,
        stopColor: getTempColor(temp)
    };
}

function getSectionFill(readings: Record<string, number>, channelName: string) {
    const temp = tempValueToFahrenheit(channelName, readings[channelName]);
    if (temp === null) {
        return '#444';
    }

    return getTempColor(temp);
}

function formatTempDelta(readings: Record<string, number>, channelName1: string, channelName2: string) {
    const val1 = tempValueToFahrenheit(channelName1, readings[channelName1]);
    const val2 = tempValueToFahrenheit(channelName2, readings[channelName2]);

    if (val1 === null || val2 === null) {
        return '-';
    }

    return `${(val1 - val2).toFixed(1)}°F`;
}

function formatTemp(readings: Record<string, number>, channelName: string) {
    const value = tempValueToFahrenheit(channelName, readings[channelName]);
    if (value === null) {
        return '-';
    }

    return `${value.toFixed(1)}°F`;
}

// TEMP UNIT HOTFIX (JM / 2026-01)
// Depth channels (buffer-depth*, tank*-depth*) are now Fahrenheit × 100.
// This helper normalizes values for display only.
// REMOVE once channel units are sourced from registry metadata.
function tempValueToFahrenheit(channelName: string, rawValue: number | null | undefined): number | null {
    if (rawValue === null || rawValue === undefined) {
        return null;
    }

    const isDepthChannel =
        /^(buffer|tank\d+)-depth\d+$/.test(channelName);

    if (isDepthChannel) {
        return (rawValue / 100);
    }

    const tempC = rawValue / 1000;
    return ((tempC * 9 / 5) + 32);
}

function getCurrentState(relays: Record<string, RelayStatus>, readings: Record<string, number>) {

    const distFlowReading = readings['dist-flow'];
    const hasDistFlow = !!(distFlowReading && distFlowReading > 0);

    const primFlowReading = readings['primary-flow'];
    const hasPrimFlow = !!(primFlowReading && primFlowReading > 0);

    const storeFlowReading = readings['store-flow'];
    const hasStoreFlow = storeFlowReading && storeFlowReading > 0;

    const hpIduReading = readings['hp-idu-pwr'];
    const hpOduReading = readings['hp-odu-pwr'];
    const hasHpPowerReading = hpIduReading && hpOduReading;
    let hpHasPower = false;
    if (hasHpPowerReading) {
        const totalHpKw = hpIduReading / 1000 + hpOduReading / 1000;
        if (totalHpKw > 0.5) {
            hpHasPower = true;
        }
    }

    const shouldAnimateHouse = hasDistFlow;

    // Buffer↔house distribution loop with HP off and no storage discharge: same plumbing as HpOffStoreOff,
    // but detectable even when relay payload is missing or maps to "Unknown".
    const animateBufferDistLoop = hasDistFlow && !hpHasPower && !hasStoreFlow;

    // Check relay states to determine system state
    const relay5 = relays['relay5'];
    const relay6 = relays['relay6'];
    const relay3 = relays['relay3'];
    const relay9 = relays['relay9'];

    let currentState = null;

    if (relay5 && relay6 && relay3 && relay9) {
        const relay3State = relay3.state;

        let hpOn = false;
        // if (relay5State === 'energized' && relay6State === 'deenergized' && hpHasPower) {
        if (hpHasPower) {
            hpOn = true;
        }

        let storeCharge = false;
        let storeDischarge = false;
        if (relay3State === 'energized' && hasPrimFlow) {
            storeCharge = true;
            // } else if (relay3State === 'deenergized' && relay9State === 'energized' && hasStoreFlow) {
        } else if (hasStoreFlow) {
            storeDischarge = true;
        }

        if (hpOn && storeCharge) {
            currentState = 'HpOnStoreCharge';
        } else if (hpOn && !storeCharge && !storeDischarge) {
            currentState = 'HpOnStoreOff';
        } else if (!hpOn && storeDischarge) {
            currentState = 'HpOffStoreDischarge';
        } else if (!hpOn && !storeCharge && !storeDischarge) {
            currentState = 'HpOffStoreOff';
        } else {
            currentState = 'Unknown combined state';
        }
    }

    // Pipes/tanks: same discharge layout as HpOffStoreDischarge when relays are missing but store pump is moving water.
    const storageDischargePipeAnimation =
        hasStoreFlow &&
        !hpHasPower &&
        (currentState === 'HpOffStoreDischarge' || currentState === null);

    return { currentState, shouldAnimateHouse, hasPrimFlow, animateBufferDistLoop, storageDischargePipeAnimation };
}

function renderStaticHeatPump() {
    return <>
        <rect x="20" y="50" width="120" height="200" rx="10" fill="#888" />
        {/* Fan grilles for heat pump */}
        {/* Top fan grille */}
        <g id="dashboard-hp-fan-top" transform="translate(70,105)">
            {/* Outer ring */}
            <circle cx="0" cy="0" r="32" fill="#ddd" stroke="#bbb" strokeWidth="1" />
            {/* Middle ring */}
            <circle cx="0" cy="0" r="24" fill="#ccc" stroke="#aaa" strokeWidth="1" />
            {/* Inner ring */}
            <circle cx="0" cy="0" r="16" fill="#bbb" stroke="#999" strokeWidth="1" />
            {/* Center circle */}
            <circle cx="0" cy="0" r="8" fill="#222" stroke="#fff" strokeWidth="1" />
            {/* Radial spokes */}
            <g stroke="#666" strokeWidth="1">
                <line x1="0" y1="0" x2="0" y2="-32" />
                <line x1="0" y1="0" x2="22.6" y2="-22.6" />
                <line x1="0" y1="0" x2="32" y2="0" />
                <line x1="0" y1="0" x2="22.6" y2="22.6" />
                <line x1="0" y1="0" x2="0" y2="32" />
                <line x1="0" y1="0" x2="-22.6" y2="22.6" />
                <line x1="0" y1="0" x2="-32" y2="0" />
                <line x1="0" y1="0" x2="-22.6" y2="-22.6" />
            </g>
        </g>

        {/* Bottom fan grille */}
        <g id="dashboard-hp-fan-bottom" transform="translate(70,195)">
            {/* Outer ring */}
            <circle cx="0" cy="0" r="32" fill="#ddd" stroke="#bbb" strokeWidth="1" />
            {/* Middle ring */}
            <circle cx="0" cy="0" r="24" fill="#ccc" stroke="#aaa" strokeWidth="1" />
            {/* Inner ring */}
            <circle cx="0" cy="0" r="16" fill="#bbb" stroke="#999" strokeWidth="1" />
            {/* Center circle */}
            <circle cx="0" cy="0" r="8" fill="#222" stroke="#fff" strokeWidth="1" />
            {/* Radial spokes */}
            <g stroke="#666" strokeWidth="1">
                <line x1="0" y1="0" x2="0" y2="-32" />
                <line x1="0" y1="0" x2="22.6" y2="-22.6" />
                <line x1="0" y1="0" x2="32" y2="0" />
                <line x1="0" y1="0" x2="22.6" y2="22.6" />
                <line x1="0" y1="0" x2="0" y2="32" />
                <line x1="0" y1="0" x2="-22.6" y2="22.6" />
                <line x1="0" y1="0" x2="-32" y2="0" />
                <line x1="0" y1="0" x2="-22.6" y2="-22.6" />
            </g>
        </g>
    </>
}

function renderBufferTank(readings: Record<string, number>, isSpruce: boolean) {
    return <>
        <rect x="860" y="50" width="120" height="200" rx="10" fill="transparent" />
        {/* Buffer sections */}
        <path fill={getSectionFill(readings, 'buffer-depth1')} d="M 860,60 Q 860,50 870,50 L 970,50 Q 980,50 980,60 L 980,116 L 860,116 Z" />
        <rect fill={getSectionFill(readings, 'buffer-depth2')}  x="860" y="116" width="120" height="66" />
        <path fill={getSectionFill(readings, 'buffer-depth3')}  d="M 860,182 L 980,182 L 980,240 Q 980,250 970,250 L 870,250 Q 860,250 860,240 Z"/>
        {isSpruce && renderResistiveElement(980, 116)}
        {isSpruce && renderResistiveElement(980, 182)}
        <text x="920" y="90" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'buffer-depth1')}
        </text>
        <text x="920" y="156" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'buffer-depth2')}
        </text>
        <text x="920" y="222" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'buffer-depth3')}
        </text>
        <text x="920" y="270" textAnchor="middle" fill="var(--text-color)" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">Buffer</text>
    </>
}

function renderStaticHouse(houseLeftX: number, houseWidth: number, houseTextX: number, houseRoofLeftX: number, houseRoofRightX: number) {
    return <>
        {/* House (bottom right, left of buffer) */}
        <rect x={houseLeftX} y="335" width={houseWidth} height="90" rx="0" fill="#888" />
        {/* Triangle roof for the house */}
        <polygon points={`${houseRoofLeftX},336 ${houseRoofRightX},336 ${houseTextX},290`} fill="#888" />
        <text x={houseTextX} y="450" textAnchor="middle" fill="var(--text-color)" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">House</text>
        {/* <text id="dashboard-house-drop" x="720" y="375" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="16" fontWeight="600">Drop<tspan x="720" dy="1.2em">-°F</tspan>
                        </text> */}
    </>
}

function renderStorageTank3(readings: Record<string, number>) {
    return <>
        {/* Tank 3 (bottom left) */}
        <rect x="200" y="280" width="120" height="200" rx="10" fill="transparent" />
        {/* Tank 3 sections */}
        <path fill={getSectionFill(readings, 'tank3-depth1')} d="M 200,290 Q 200,280 210,280 L 310,280 Q 320,280 320,290 L 320,346 L 200,346 Z"  />
        <rect fill={getSectionFill(readings, 'tank3-depth2')} x="200" y="346" width="120" height="66"  />
        <path fill={getSectionFill(readings, 'tank3-depth3')} d="M 200,412 L 320,412 L 320,470 Q 320,480 310,480 L 210,480 Q 200,480 200,470 Z"  />
        <text id="dashboard-tank3-depth1" x="260" y="320" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'tank3-depth1')}
        </text>
        <text id="dashboard-tank3-depth2" x="260" y="386" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'tank3-depth2')}
        </text>
        <text id="dashboard-tank3-depth3" x="260" y="452" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'tank3-depth3')}
        </text>
        <text x="260" y="500" textAnchor="middle" fill="var(--text-color)" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">Tank 3</text>
    </>

}

function renderStorageTank2(readings: Record<string, number>) {
    return <>
        {/* Tank 2 (bottom center) */}
        <rect x="330" y="280" width="120" height="200" rx="10" fill="transparent" />
        {/* Tank 2 sections */}
        <path fill={getSectionFill(readings, 'tank2-depth1')} d="M 330,290 Q 330,280 340,280 L 440,280 Q 450,280 450,290 L 450,346 L 330,346 Z"  />
        <rect fill={getSectionFill(readings, 'tank2-depth2')} x="330" y="346" width="120" height="66"  />
        <path fill={getSectionFill(readings, 'tank2-depth3')} d="M 330,412 L 450,412 L 450,470 Q 450,480 440,480 L 340,480 Q 330,480 330,470 Z"  />
        <text x="390" y="320" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'tank2-depth1')}
        </text>
        <text x="390" y="386" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'tank2-depth2')}
        </text>
        <text x="390" y="452" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'tank2-depth3')}
        </text>
        <text x="390" y="500" textAnchor="middle" fill="var(--text-color)" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">Tank 2</text>
    </>
}

function renderStorageTank1(readings: Record<string, number>, tankX: number, textX: number, isSpruce: boolean) {
    const leftX = tankX;
    const innerLeftX = tankX + 10;
    const innerRightX = tankX + 110;
    const rightX = tankX + 120;

    return <>
        {/* Tank 1 (bottom right) */}
        <rect x={tankX} y="280" width="120" height="200" rx="10" fill="transparent" />
        {/* Tank 1 sections */}
        <path fill={getSectionFill(readings, 'tank1-depth1')} d={`M ${leftX},290 Q ${leftX},280 ${innerLeftX},280 L ${innerRightX},280 Q ${rightX},280 ${rightX},290 L ${rightX},346 L ${leftX},346 Z`}  />
        <rect fill={getSectionFill(readings, 'tank1-depth2')} x={tankX} y="346" width="120" height="66"  />
        <path fill={getSectionFill(readings, 'tank1-depth3')} d={`M ${leftX},412 L ${rightX},412 L ${rightX},470 Q ${rightX},480 ${innerRightX},480 L ${innerLeftX},480 Q ${leftX},480 ${leftX},470 Z`}  />
        {isSpruce && renderResistiveElement(rightX, 346)}
        {isSpruce && renderResistiveElement(rightX, 412)}
        <text x={textX} y="320" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'tank1-depth1')}
        </text>
        <text x={textX} y="386" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'tank1-depth2')}
        </text>
        <text x={textX} y="452" textAnchor="middle" fill="white" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">
            {formatTemp(readings, 'tank1-depth3')}
        </text>
        <text x={textX} y="500" textAnchor="middle" fill="var(--text-color)" fontFamily="Montserrat, sans-serif" fontSize="14" fontWeight="600">Tank 1</text>
    </>
}

function renderResistiveElement(rightX: number, boundaryY: number) {
    return (
        <path
            d={`M ${rightX},${boundaryY - 5} L ${rightX - 20},${boundaryY - 5} Q ${rightX - 42},${boundaryY - 5} ${rightX - 42},${boundaryY} Q ${rightX - 42},${boundaryY + 5} ${rightX - 20},${boundaryY + 5} L ${rightX},${boundaryY + 5}`}
            fill="none"
            stroke="#d9d9d9"
            strokeWidth="5"
            strokeLinecap="butt"
            strokeLinejoin="round"
        />
    );
}
