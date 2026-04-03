import { cloneElement, type ReactElement } from "react";

interface RealTimeStatusSystemDiagramPipesProps {
    currentState: string | null,
    shouldAnimateHouse: boolean,
    hasPrimFlow: boolean,
    isSpruce: boolean,
    tank1X: number,
    houseLeftX: number,
    houseWidth: number,
}

export default function RealTimeStatusSystemDiagramPipes({ currentState, shouldAnimateHouse, hasPrimFlow, isSpruce, tank1X, houseLeftX, houseWidth }: RealTimeStatusSystemDiagramPipesProps) {

    // Tank1 vertical sits just right of the tank; stub connects tank top to the vertical (matches RealTimeStatusSystemDiagram layout).
    const tank1PipeX = tank1X + 130;
    const tank1PipeConnectionX = tank1X + 120;
    const tank1HpHorizontalPipeWidth = tank1PipeX + 15 - 140;
    const tank1BufferHorizontalPipeWidth = 860 - tank1PipeX;
    // Bottom storage return (labeled tank3 in DOM): fixed for 3-tank layout; in Spruce only Tank1 exists so this loop attaches to Tank1's bottom-left.
    const tank3LeftX = 200;
    const storeReturnPipeX = isSpruce ? tank1X - 25 : tank3LeftX - 25;
    const storeReturnPipeConnectionX = storeReturnPipeX;
    const tank3HpHorizontalPipeWidth = storeReturnPipeX + 15 - 140;
    const tank3BufferHorizontalPipeWidth = 860 - storeReturnPipeX;

    // House pipes use unshifted "base" coordinates inside a translated group so they always move with the house.
    const houseLayoutBaseLeft = isSpruce ? 480 : 660;
    const houseGroupDx = houseLeftX - houseLayoutBaseLeft;
    const houseRiserRightX = isSpruce ? 660 : 790;
    const houseStubRightX = isSpruce ? 650 : 780;
    const houseRiserLeftX = isSpruce ? 455 : 635;
    const houseBufferTopPipeWidth = 860 - houseRiserRightX - houseGroupDx;
    const houseBufferBottomPipeWidth = 860 - houseRiserLeftX - houseGroupDx;
    const houseHpVerticalPipeHeight = isSpruce ? 335 : 280;
    const houseHpVerticalPipeBottomHeight = isSpruce ? 195 : 140;
    const houseBridgePipeX = isSpruce ? houseRiserLeftX + 15 : 0;
    const houseBridgePipeY = 410;
    const houseBridgePipeWidth = isSpruce ? houseRiserRightX - houseBridgePipeX : 0;

    // The pipes overlap with each other.
    // Inactive (gray) pipes need to be rendered before active (animated) pipes for visibility to be correct.

    const activePipeColors: Record<string, string> = {};
    if (currentState === 'HpOnStoreOff') {
        activePipeColors['dashboard-hp-buffer-top-pipe'] = 'url(#dashboardFlowPattern)';
        activePipeColors['dashboard-hp-buffer-bottom-pipe'] = 'url(#dashboardLeftFlowPattern)';

        if (shouldAnimateHouse) {
            activePipeColors['dashboard-house-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
            activePipeColors['dashboard-house-hp-vertical-pipe-bottom'] = 'url(#dashboardVerticalFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardFlowPattern)';
            activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardLeftFlowPattern)';
            if (isSpruce && houseBridgePipeWidth > 0) {
                activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardFlowPattern)';
            }
        }
    } else if (currentState === 'HpOffStoreDischarge') {
        activePipeColors['dashboard-tank1-hp-vertical-pipe'] = 'url(#dashboardVerticalFlowPattern)';
        activePipeColors['dashboard-tank1-buffer-horizontal-pipe'] = 'url(#dashboardFlowPattern)';
        activePipeColors['dashboard-tank1-connection-pipe'] = 'url(#dashboardFlowPattern)';
        activePipeColors['dashboard-tank3-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
        activePipeColors['dashboard-tank3-buffer-horizontal-pipe'] = 'url(#dashboardLeftFlowPattern)';
        activePipeColors['dashboard-tank3-connection-pipe'] = 'url(#dashboardFlowPattern)';

        if (shouldAnimateHouse) {
            activePipeColors['dashboard-house-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
            activePipeColors['dashboard-house-hp-vertical-pipe-bottom'] = 'url(#dashboardVerticalFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
            if (isSpruce && houseBridgePipeWidth > 0) {
                activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardFlowPattern)';
            }
        }

    } else if (currentState === 'HpOnStoreCharge') {
        activePipeColors['dashboard-tank1-hp-vertical-pipe-charge'] = 'url(#dashboardVerticalDownFlowPattern)';
        activePipeColors['dashboard-tank3-hp-vertical-pipe-charge'] = 'url(#dashboardVerticalFlowPattern)';
        activePipeColors['dashboard-tank1-connection-pipe-charge'] = 'url(#dashboardLeftFlowPattern)';
        activePipeColors['dashboard-tank3-connection-pipe-charge'] = 'url(#dashboardLeftFlowPattern)';
        activePipeColors['dashboard-tank1-hp-horizontal-pipe-charge'] = 'url(#dashboardFlowPattern)';
        activePipeColors['dashboard-tank3-hp-horizontal-pipe-charge'] = 'url(#dashboardLeftFlowPattern)';


        if (shouldAnimateHouse) {
            activePipeColors['dashboard-house-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
            activePipeColors['dashboard-house-hp-vertical-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardFlowPattern)';
            if (isSpruce && houseBridgePipeWidth > 0) {
                activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardLeftFlowPattern)';
            }
        }
    } else {
        // Animate House pipes based on distribution flow
        if (shouldAnimateHouse) {

            activePipeColors['dashboard-house-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
            activePipeColors['dashboard-house-hp-vertical-pipe-bottom'] = 'url(#dashboardVerticalFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
            if (isSpruce && houseBridgePipeWidth > 0) {
                activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardFlowPattern)';
            }

            // Special logic for HpOffStoreOff: House to Buffer pipes when dist flow is active
            // (same as HpOnStoreCharge)
            if (currentState === 'HpOffStoreOff') {
                activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardLeftFlowPattern)';
                activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardFlowPattern)';
                if (isSpruce && houseBridgePipeWidth > 0) {
                    activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardLeftFlowPattern)';
                }

                if (hasPrimFlow) {
                    activePipeColors['dashboard-hp-buffer-top-pipe'] = 'url(#dashboardFlowPattern)';
                    activePipeColors['dashboard-hp-buffer-bottom-pipe'] = 'url(#dashboardLeftFlowPattern)';
                }
            }
        } else {
            if (hasPrimFlow) {
                activePipeColors['dashboard-hp-buffer-top-pipe'] = 'url(#dashboardFlowPattern)';
                activePipeColors['dashboard-hp-buffer-bottom-pipe'] = 'url(#dashboardLeftFlowPattern)';
            }
        }

    }

    const allPipeNames = [
        'dashboard-hp-buffer-top-pipe',
        'dashboard-hp-buffer-bottom-pipe',
        'dashboard-tank1-hp-vertical-pipe',
        'dashboard-tank1-buffer-horizontal-pipe',
        'dashboard-tank1-connection-pipe',
        'dashboard-tank3-hp-vertical-pipe',
        'dashboard-tank3-buffer-horizontal-pipe',
        'dashboard-tank3-connection-pipe',
        'dashboard-tank1-hp-vertical-pipe-charge',
        'dashboard-tank3-hp-vertical-pipe-charge',
        'dashboard-tank1-connection-pipe-charge',
        'dashboard-tank3-connection-pipe-charge',
        'dashboard-tank1-hp-horizontal-pipe-charge',
        'dashboard-tank3-hp-horizontal-pipe-charge',
        'dashboard-house-hp-vertical-pipe',
        'dashboard-house-connection-pipe',
        'dashboard-house-hp-vertical-pipe-bottom',
        'dashboard-house-connection-pipe-bottom',
        'dashboard-house-buffer-top-pipe',
        'dashboard-house-buffer-bottom-pipe',
        'dashboard-house-bridge-pipe'
    ]
    const pipeColors = {
        ...Object.fromEntries(allPipeNames.map(p => [p, '#888'])),
        ...activePipeColors
    };

    const nonHousePipeElements: Record<string, ReactElement> = {
        'dashboard-hp-buffer-top-pipe': <rect x="140" y="75" width="720" height="15" fill={pipeColors['dashboard-hp-buffer-top-pipe']} />,
        'dashboard-hp-buffer-bottom-pipe': <rect x="140" y="215" width="720" height="15" fill={pipeColors['dashboard-hp-buffer-bottom-pipe']} />,
        'dashboard-tank1-hp-horizontal-pipe-charge': <rect x="140" y="75" width={tank1HpHorizontalPipeWidth} height="15" fill={pipeColors['dashboard-tank1-hp-horizontal-pipe-charge']} />,
        'dashboard-tank3-hp-horizontal-pipe-charge': <rect x="140" y="215" width={tank3HpHorizontalPipeWidth} height="15" fill={pipeColors['dashboard-tank3-hp-horizontal-pipe-charge']} />,
        'dashboard-tank1-hp-vertical-pipe': <rect x={tank1PipeX} y="90" width="15" height="205" fill={pipeColors['dashboard-tank1-hp-vertical-pipe']} />,
        'dashboard-tank1-buffer-horizontal-pipe': <rect x={tank1PipeX} y="75" width={tank1BufferHorizontalPipeWidth} height="15" fill={pipeColors['dashboard-tank1-buffer-horizontal-pipe']} />,
        'dashboard-tank1-connection-pipe': <rect x={tank1PipeConnectionX} y="295" width="25" height="15" fill={pipeColors['dashboard-tank1-connection-pipe']} />,
        'dashboard-tank3-hp-vertical-pipe': <rect x={storeReturnPipeX} y="220" width="15" height="220" fill={pipeColors['dashboard-tank3-hp-vertical-pipe']} />,
        'dashboard-tank3-buffer-horizontal-pipe': <rect x={storeReturnPipeX} y="215" width={tank3BufferHorizontalPipeWidth} height="15" fill={pipeColors['dashboard-tank3-buffer-horizontal-pipe']} />,
        'dashboard-tank3-connection-pipe': <rect x={storeReturnPipeConnectionX} y="440" width="25" height="15" fill={pipeColors['dashboard-tank3-connection-pipe']} />,
        'dashboard-tank1-hp-vertical-pipe-charge': <rect x={tank1PipeX} y="90" width="15" height="205" fill={pipeColors['dashboard-tank1-hp-vertical-pipe-charge']} />,
        'dashboard-tank3-hp-vertical-pipe-charge': <rect x={storeReturnPipeX} y="220" width="15" height="220" fill={pipeColors['dashboard-tank3-hp-vertical-pipe-charge']} />,
        'dashboard-tank1-connection-pipe-charge': <rect x={tank1PipeConnectionX} y="295" width="25" height="15" fill={pipeColors['dashboard-tank1-connection-pipe-charge']} />,
        'dashboard-tank3-connection-pipe-charge': <rect x={storeReturnPipeConnectionX} y="440" width="25" height="15" fill={pipeColors['dashboard-tank3-connection-pipe-charge']} />,
    };

    // Base layout coords inside translate(houseGroupDx): same as original diagram at houseLeft = 480 / 660.
    const housePipeElements: Record<string, ReactElement> = {
        'dashboard-house-hp-vertical-pipe': <rect x={houseRiserRightX} y="90" width="15" height={houseHpVerticalPipeHeight} fill={pipeColors['dashboard-house-hp-vertical-pipe']} />,
        'dashboard-house-connection-pipe': <rect x={houseStubRightX} y="370" width="25" height="15" fill={pipeColors['dashboard-house-connection-pipe']} />,
        'dashboard-house-hp-vertical-pipe-bottom': <rect x={houseRiserLeftX} y="230" width="15" height={houseHpVerticalPipeBottomHeight} fill={pipeColors['dashboard-house-hp-vertical-pipe-bottom']} />,
        'dashboard-house-connection-pipe-bottom': <rect x={houseRiserLeftX} y="370" width="25" height="15" fill={pipeColors['dashboard-house-connection-pipe-bottom']} />,
        'dashboard-house-buffer-top-pipe': <rect x={houseRiserRightX} y="75" width={houseBufferTopPipeWidth} height="15" fill={pipeColors['dashboard-house-buffer-top-pipe']} />,
        'dashboard-house-buffer-bottom-pipe': <rect x={houseRiserLeftX} y="215" width={houseBufferBottomPipeWidth} height="15" fill={pipeColors['dashboard-house-buffer-bottom-pipe']} />,
        'dashboard-house-bridge-pipe': houseBridgePipeWidth > 0
            ? <rect x={houseBridgePipeX} y={houseBridgePipeY} width={houseBridgePipeWidth} height="15" fill={pipeColors['dashboard-house-bridge-pipe']} />
            : <></>,
    };

    const nonHousePipeOrder = [
        'dashboard-hp-buffer-top-pipe',
        'dashboard-hp-buffer-bottom-pipe',
        'dashboard-tank1-hp-horizontal-pipe-charge',
        'dashboard-tank3-hp-horizontal-pipe-charge',
        'dashboard-tank1-hp-vertical-pipe',
        'dashboard-tank1-buffer-horizontal-pipe',
        'dashboard-tank1-connection-pipe',
        'dashboard-tank3-hp-vertical-pipe',
        'dashboard-tank3-buffer-horizontal-pipe',
        'dashboard-tank3-connection-pipe',
        'dashboard-tank1-hp-vertical-pipe-charge',
        'dashboard-tank3-hp-vertical-pipe-charge',
        'dashboard-tank1-connection-pipe-charge',
        'dashboard-tank3-connection-pipe-charge',
    ] as const;

    const housePipeOrder = [
        'dashboard-house-hp-vertical-pipe',
        'dashboard-house-connection-pipe',
        'dashboard-house-hp-vertical-pipe-bottom',
        'dashboard-house-connection-pipe-bottom',
        'dashboard-house-buffer-top-pipe',
        'dashboard-house-buffer-bottom-pipe',
        'dashboard-house-bridge-pipe',
    ] as const;

    const housePipeGroupTransform = `translate(${houseGroupDx}, 0)`;

    const elementsInOrder: ReactElement[] = [];

    for (const name of nonHousePipeOrder) {
        if (!activePipeColors[name]) {
            elementsInOrder.push(nonHousePipeElements[name]);
        }
    }
    elementsInOrder.push(
        <g key="dashboard-house-pipes-inactive" transform={housePipeGroupTransform}>
            {housePipeOrder.map((name) =>
                !activePipeColors[name] ? cloneElement(housePipeElements[name], { key: name }) : null,
            )}
        </g>,
    );
    for (const name of nonHousePipeOrder) {
        if (activePipeColors[name]) {
            elementsInOrder.push(nonHousePipeElements[name]);
        }
    }
    elementsInOrder.push(
        <g key="dashboard-house-pipes-active" transform={housePipeGroupTransform}>
            {housePipeOrder.map((name) =>
                activePipeColors[name] ? cloneElement(housePipeElements[name], { key: name }) : null,
            )}
        </g>,
    );
    return <>{elementsInOrder}</>;
}
