import { cloneElement, type ReactElement } from "react";

interface RealTimeStatusSystemDiagramPipesProps {
    currentState: string | null,
    shouldAnimateHouse: boolean,
    hasPrimFlow: boolean,
    animateBufferDistLoop: boolean,
    /** True for HpOffStoreDischarge, or store-flow with HP off when relays are missing (currentState null). */
    storageDischargePipeAnimation: boolean,
    isSpruce: boolean,
    animateSpruceFloorLoop: boolean,
    animateSpruceUpstairsLoop: boolean,
    tank1X: number,
    houseLeftX: number,
    houseWidth: number,
    /** Negative when Sieg loop shifts the heat pump left; HP-side header horizontals extend from 140 + this. */
    siegHpShiftX: number,
}

const HP_BUFFER_OVERLAY_PIPES = ['dashboard-hp-buffer-top-pipe', 'dashboard-hp-buffer-bottom-pipe'] as const;

/** Non-Spruce HpOffStoreDischarge: paint storage riser ↔ buffer horizontals last so house/HP stubs do not cover the animated segment. */
const STORAGE_BUFFER_HORIZONTAL_OVERLAY_PIPES = [
    'dashboard-tank1-buffer-horizontal-pipe',
    'dashboard-tank3-buffer-horizontal-pipe',
] as const;

/**
 * Non-Spruce “buffer header” rows — every `<rect>` drawn at y=75 or y=215 (height 15) that reads as the
 * long horizontals next to the buffer / HP (plus the house stubs on the same row):
 *
 * TOP (y=75):
 *   dashboard-hp-buffer-top-pipe              x=140  w=720   (full HP→buffer bar)
 *   dashboard-tank1-hp-horizontal-pipe-charge   x=140  (HP side → tank1 riser; charge mode)
 *   dashboard-tank1-buffer-horizontal-pipe      x=tank1Riser → buffer  (restored — not in hide set)
 *   dashboard-house-buffer-top-pipe             house riser → buffer (same row; was missing from earlier debug)
 *
 * BOTTOM (y=215):
 *   dashboard-hp-buffer-bottom-pipe
 *   dashboard-tank3-hp-horizontal-pipe-charge
 *   dashboard-tank3-buffer-horizontal-pipe      storage riser → buffer  (restored — not in hide set)
 *   dashboard-house-buffer-bottom-pipe
 *
 * Spruce: `isSpruce` when houseAlias includes "spruce" (RealTimeStatusPage) — this hide list is skipped.
 *
 * Set false to show pipes again (turn off before merge unless you intend to ship this).
 */
const DEBUG_HIDE_NON_SPRUCE_BUFFER_HEADER_ROW_PIPES = false;

const DEBUG_HIDDEN_NON_SPRUCE_HEADER_PIPE_NAMES = new Set<string>([
    'dashboard-hp-buffer-top-pipe',
    'dashboard-hp-buffer-bottom-pipe',
    'dashboard-tank1-hp-horizontal-pipe-charge',
    'dashboard-tank3-hp-horizontal-pipe-charge',
    // storage riser ↔ buffer (tank1 top loop, tank3 bottom loop): shown again — add back one-by-one
    'dashboard-house-buffer-top-pipe',
    'dashboard-house-buffer-bottom-pipe',
]);

export default function RealTimeStatusSystemDiagramPipes({
    currentState,
    shouldAnimateHouse,
    hasPrimFlow,
    animateBufferDistLoop,
    storageDischargePipeAnimation,
    isSpruce,
    animateSpruceFloorLoop,
    animateSpruceUpstairsLoop,
    tank1X,
    houseLeftX,
    houseWidth: _houseWidth,
    siegHpShiftX,
}: RealTimeStatusSystemDiagramPipesProps) {
    /** Left end of HP-buffer header rows (default 140); moves with shifted heat pump. Right end stays at 860. */
    const hpHeaderLeft = 140 + siegHpShiftX;
    const hpBufferFullSpanWidth = 720 - siegHpShiftX;

    const hideNonSpruceHeaderRowPipes =
        DEBUG_HIDE_NON_SPRUCE_BUFFER_HEADER_ROW_PIPES && !isSpruce;

    const hidePipeForHeaderRowDebug = (pipeName: string) =>
        hideNonSpruceHeaderRowPipes && DEBUG_HIDDEN_NON_SPRUCE_HEADER_PIPE_NAMES.has(pipeName);

    // Tank1 vertical sits just right of the tank; stub connects tank top to the vertical (matches RealTimeStatusSystemDiagram layout).
    const tank1PipeX = tank1X + 130;
    const tank1PipeConnectionX = tank1X + 120;
    const tank1HpHorizontalPipeWidth = tank1PipeX + 15 - hpHeaderLeft;
    const tank1BufferHorizontalPipeWidth = 860 - tank1PipeX;
    // Bottom storage return (labeled tank3 in DOM): fixed for 3-tank layout; in Spruce only Tank1 exists so this loop attaches to Tank1's bottom-left.
    const tank3LeftX = 200;
    const storeReturnPipeX = isSpruce ? tank1X - 25 : tank3LeftX - 25;
    const storeReturnPipeConnectionX = storeReturnPipeX;
    const tank3HpHorizontalPipeWidth = storeReturnPipeX + 15 - hpHeaderLeft;
    const tank3BufferHorizontalPipeWidth = 860 - storeReturnPipeX;

    // House pipes use unshifted "base" coordinates inside a translated group so they always move with the house.
    const houseLayoutBaseLeft = isSpruce ? 480 : 660;
    const houseGroupDx = houseLeftX - houseLayoutBaseLeft;
    const houseRiserRightX = isSpruce ? 660 : 790;
    const houseStubRightX = isSpruce ? 650 : 780;
    const houseRiserLeftX = isSpruce ? 455 : 635;
    const houseConnectionPipeRightX = isSpruce ? houseStubRightX : houseStubRightX;
    const houseConnectionPipeRightWidth = isSpruce ? 10 : 25;
    const houseConnectionPipeLeftX = isSpruce ? houseRiserLeftX + 15 : houseRiserLeftX;
    const houseConnectionPipeLeftWidth = isSpruce ? 10 : 25;
    const houseBufferTopPipeWidth = 860 - houseRiserRightX - houseGroupDx;
    const houseBufferBottomPipeWidth = 860 - houseRiserLeftX - houseGroupDx;
    const houseHpVerticalPipeHeight = isSpruce ? 335 : 280;
    const houseHpVerticalPipeBottomHeight = isSpruce ? 195 : 140;
    const houseConnectionPipeY = isSpruce ? 360 : 370;
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
            if (!isSpruce || animateSpruceUpstairsLoop) {
                activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
                activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
            }
            activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardFlowPattern)';
            activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardLeftFlowPattern)';
            if (isSpruce && animateSpruceFloorLoop && houseBridgePipeWidth > 0) {
                activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardFlowPattern)';
            }
        }
    } else if (storageDischargePipeAnimation) {
        // Tank1 → buffer (top), buffer → tank3 (bottom); same as HpOffStoreDischarge when relays resolve,
        // plus when currentState is null but store-flow > 0 and HP is off.
        activePipeColors['dashboard-tank1-hp-vertical-pipe'] = 'url(#dashboardVerticalFlowPattern)';
        activePipeColors['dashboard-tank1-buffer-horizontal-pipe'] = 'url(#dashboardFlowPattern)';
        activePipeColors['dashboard-tank1-connection-pipe'] = 'url(#dashboardFlowPattern)';
        activePipeColors['dashboard-tank3-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
        activePipeColors['dashboard-tank3-buffer-horizontal-pipe'] = 'url(#dashboardLeftFlowPattern)';
        activePipeColors['dashboard-tank3-connection-pipe'] = 'url(#dashboardFlowPattern)';

        if (shouldAnimateHouse) {
            activePipeColors['dashboard-house-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
            activePipeColors['dashboard-house-hp-vertical-pipe-bottom'] = 'url(#dashboardVerticalFlowPattern)';
            if (!isSpruce || animateSpruceUpstairsLoop) {
                activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
                activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
            }
            if (isSpruce && animateSpruceFloorLoop && houseBridgePipeWidth > 0) {
                activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardFlowPattern)';
            }
            // Spruce: same dist-loop stubs to buffer as HpOnStoreOff (this branch had verticals only).
            if (isSpruce) {
                activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardFlowPattern)';
                activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardLeftFlowPattern)';
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
            if (!isSpruce || animateSpruceUpstairsLoop) {
                activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
                activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
            }
            activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardFlowPattern)';
            if (isSpruce && animateSpruceFloorLoop && houseBridgePipeWidth > 0) {
                activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardLeftFlowPattern)';
            }
        }
    } else {
        // Animate House pipes based on distribution flow
        if (shouldAnimateHouse) {

            activePipeColors['dashboard-house-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
            activePipeColors['dashboard-house-hp-vertical-pipe-bottom'] = 'url(#dashboardVerticalFlowPattern)';
            if (!isSpruce || animateSpruceUpstairsLoop) {
                activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
                activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
            }
            if (isSpruce && houseBridgePipeWidth > 0) {
                activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardFlowPattern)';
            }

            // Spruce: original HpOffStoreOff behavior (buffer headers only with primary flow).
            if (isSpruce) {
                if (currentState === 'HpOffStoreOff') {
                    activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardLeftFlowPattern)';
                    activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardFlowPattern)';
                    if (animateSpruceFloorLoop && houseBridgePipeWidth > 0) {
                        activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardLeftFlowPattern)';
                    }
                    if (hasPrimFlow) {
                        activePipeColors['dashboard-hp-buffer-top-pipe'] = 'url(#dashboardFlowPattern)';
                        activePipeColors['dashboard-hp-buffer-bottom-pipe'] = 'url(#dashboardLeftFlowPattern)';
                    }
                } else if (animateBufferDistLoop) {
                    activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardLeftFlowPattern)';
                    activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardFlowPattern)';
                    if (animateSpruceFloorLoop && houseBridgePipeWidth > 0) {
                        activePipeColors['dashboard-house-bridge-pipe'] = 'url(#dashboardLeftFlowPattern)';
                    }
                }
            } else if (animateBufferDistLoop) {
                // Other homes: HP off, storage idle, dist on (includes missing-relay / Unknown).
                // Full-span buffer headers are painted after house pipes so overlapping geometry
                // does not hide them.
                activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardLeftFlowPattern)';
                activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardFlowPattern)';

                activePipeColors['dashboard-hp-buffer-top-pipe'] = 'url(#dashboardFlowPattern)';
                activePipeColors['dashboard-hp-buffer-bottom-pipe'] = 'url(#dashboardLeftFlowPattern)';
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
        'dashboard-hp-buffer-top-pipe': hidePipeForHeaderRowDebug('dashboard-hp-buffer-top-pipe') ? (
            <g data-debug-omit="dashboard-hp-buffer-top-pipe" />
        ) : (
            <rect x={hpHeaderLeft} y="75" width={hpBufferFullSpanWidth} height="15" fill={pipeColors['dashboard-hp-buffer-top-pipe']} />
        ),
        'dashboard-hp-buffer-bottom-pipe': hidePipeForHeaderRowDebug('dashboard-hp-buffer-bottom-pipe') ? (
            <g data-debug-omit="dashboard-hp-buffer-bottom-pipe" />
        ) : (
            <rect x={hpHeaderLeft} y="215" width={hpBufferFullSpanWidth} height="15" fill={pipeColors['dashboard-hp-buffer-bottom-pipe']} />
        ),
        'dashboard-tank1-hp-horizontal-pipe-charge': hidePipeForHeaderRowDebug('dashboard-tank1-hp-horizontal-pipe-charge') ? (
            <g data-debug-omit="dashboard-tank1-hp-horizontal-pipe-charge" />
        ) : (
            <rect x={hpHeaderLeft} y="75" width={tank1HpHorizontalPipeWidth} height="15" fill={pipeColors['dashboard-tank1-hp-horizontal-pipe-charge']} />
        ),
        'dashboard-tank3-hp-horizontal-pipe-charge': hidePipeForHeaderRowDebug('dashboard-tank3-hp-horizontal-pipe-charge') ? (
            <g data-debug-omit="dashboard-tank3-hp-horizontal-pipe-charge" />
        ) : (
            <rect x={hpHeaderLeft} y="215" width={tank3HpHorizontalPipeWidth} height="15" fill={pipeColors['dashboard-tank3-hp-horizontal-pipe-charge']} />
        ),
        'dashboard-tank1-hp-vertical-pipe': <rect x={tank1PipeX} y="90" width="15" height="205" fill={pipeColors['dashboard-tank1-hp-vertical-pipe']} />,
        'dashboard-tank1-buffer-horizontal-pipe': hidePipeForHeaderRowDebug('dashboard-tank1-buffer-horizontal-pipe') ? (
            <g data-debug-omit="dashboard-tank1-buffer-horizontal-pipe" />
        ) : (
            <rect x={tank1PipeX} y="75" width={tank1BufferHorizontalPipeWidth} height="15" fill={pipeColors['dashboard-tank1-buffer-horizontal-pipe']} />
        ),
        'dashboard-tank1-connection-pipe': <rect x={tank1PipeConnectionX} y="295" width="25" height="15" fill={pipeColors['dashboard-tank1-connection-pipe']} />,
        'dashboard-tank3-hp-vertical-pipe': <rect x={storeReturnPipeX} y="220" width="15" height="220" fill={pipeColors['dashboard-tank3-hp-vertical-pipe']} />,
        'dashboard-tank3-buffer-horizontal-pipe': hidePipeForHeaderRowDebug('dashboard-tank3-buffer-horizontal-pipe') ? (
            <g data-debug-omit="dashboard-tank3-buffer-horizontal-pipe" />
        ) : (
            <rect x={storeReturnPipeX} y="215" width={tank3BufferHorizontalPipeWidth} height="15" fill={pipeColors['dashboard-tank3-buffer-horizontal-pipe']} />
        ),
        'dashboard-tank3-connection-pipe': <rect x={storeReturnPipeConnectionX} y="440" width="25" height="15" fill={pipeColors['dashboard-tank3-connection-pipe']} />,
        'dashboard-tank1-hp-vertical-pipe-charge': <rect x={tank1PipeX} y="90" width="15" height="205" fill={pipeColors['dashboard-tank1-hp-vertical-pipe-charge']} />,
        'dashboard-tank3-hp-vertical-pipe-charge': <rect x={storeReturnPipeX} y="220" width="15" height="220" fill={pipeColors['dashboard-tank3-hp-vertical-pipe-charge']} />,
        'dashboard-tank1-connection-pipe-charge': <rect x={tank1PipeConnectionX} y="295" width="25" height="15" fill={pipeColors['dashboard-tank1-connection-pipe-charge']} />,
        'dashboard-tank3-connection-pipe-charge': <rect x={storeReturnPipeConnectionX} y="440" width="25" height="15" fill={pipeColors['dashboard-tank3-connection-pipe-charge']} />,
    };

    // Base layout coords inside translate(houseGroupDx): same as original diagram at houseLeft = 480 / 660.
    const housePipeElements: Record<string, ReactElement> = {
        'dashboard-house-hp-vertical-pipe': <rect x={houseRiserRightX} y="90" width="15" height={houseHpVerticalPipeHeight} fill={pipeColors['dashboard-house-hp-vertical-pipe']} />,
        'dashboard-house-connection-pipe': <rect x={houseConnectionPipeRightX} y={houseConnectionPipeY} width={houseConnectionPipeRightWidth} height="15" fill={pipeColors['dashboard-house-connection-pipe']} />,
        'dashboard-house-hp-vertical-pipe-bottom': <rect x={houseRiserLeftX} y="230" width="15" height={houseHpVerticalPipeBottomHeight} fill={pipeColors['dashboard-house-hp-vertical-pipe-bottom']} />,
        'dashboard-house-connection-pipe-bottom': <rect x={houseConnectionPipeLeftX} y={houseConnectionPipeY} width={houseConnectionPipeLeftWidth} height="15" fill={pipeColors['dashboard-house-connection-pipe-bottom']} />,
        'dashboard-house-buffer-top-pipe': hidePipeForHeaderRowDebug('dashboard-house-buffer-top-pipe') ? (
            <g data-debug-omit="dashboard-house-buffer-top-pipe" />
        ) : (
            <rect x={houseRiserRightX} y="75" width={houseBufferTopPipeWidth} height="15" fill={pipeColors['dashboard-house-buffer-top-pipe']} />
        ),
        'dashboard-house-buffer-bottom-pipe': hidePipeForHeaderRowDebug('dashboard-house-buffer-bottom-pipe') ? (
            <g data-debug-omit="dashboard-house-buffer-bottom-pipe" />
        ) : (
            <rect x={houseRiserLeftX} y="215" width={houseBufferBottomPipeWidth} height="15" fill={pipeColors['dashboard-house-buffer-bottom-pipe']} />
        ),
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

    /** Spruce keeps the original paint order; other layouts defer HP–buffer horizontals above house pipes. */
    const deferHpBufferOverlay = !isSpruce;
    const deferStorageBufferHorizontalOverlay = !isSpruce && storageDischargePipeAnimation;

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
        if (
            activePipeColors[name] &&
            !(deferHpBufferOverlay && HP_BUFFER_OVERLAY_PIPES.includes(name as (typeof HP_BUFFER_OVERLAY_PIPES)[number])) &&
            !(
                deferStorageBufferHorizontalOverlay &&
                STORAGE_BUFFER_HORIZONTAL_OVERLAY_PIPES.includes(
                    name as (typeof STORAGE_BUFFER_HORIZONTAL_OVERLAY_PIPES)[number],
                )
            )
        ) {
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
    if (deferHpBufferOverlay) {
        for (const name of HP_BUFFER_OVERLAY_PIPES) {
            if (activePipeColors[name]) {
                elementsInOrder.push(nonHousePipeElements[name]);
            }
        }
    }
    if (deferStorageBufferHorizontalOverlay) {
        for (const name of STORAGE_BUFFER_HORIZONTAL_OVERLAY_PIPES) {
            if (activePipeColors[name]) {
                elementsInOrder.push(nonHousePipeElements[name]);
            }
        }
    }
    return <>{elementsInOrder}</>;
}
