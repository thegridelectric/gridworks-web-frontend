/**
 * Pure mapping from dashboard inputs to which pipe segments use animated fills (vs static gray).
 * Keep in sync with SVG pattern ids in `RealTimeStatusSystemDiagram.tsx`.
 */

// ---------------------------------------
// PIPE ANIMATIONS
// ---------------------------------------

/**
 * Primitive inputs for pipe fill logic. Buffer↔dist and storage-discharge pipe layouts use the same
 * booleans as `getCurrentState` / `RealTimeStatusSystemDiagram` (see `resolveActivePipeFills` body).
 */
export interface DiagramPipeAnimationInput {
    currentState: string | null;
    hasPrimFlow: boolean;
    hasDistFlow: boolean;
    hasStoreFlow: boolean;
    hasSiegFlow: boolean;
    hasHpPower: boolean;
    isSpruce: boolean;
    animateSpruceFloorLoop: boolean;
    animateSpruceUpstairsLoop: boolean;
}

const RIGHT = 'url(#dashboardRightFlowPattern)';
const LEFT = 'url(#dashboardLeftFlowPattern)';
const UP = 'url(#dashboardUpFlowPattern)';
const DOWN = 'url(#dashboardDownFlowPattern)';

export const PIPES_HEAT_PUMP_BUFFER = {
    'dashboard-hp-buffer-top-pipe': RIGHT,
    'dashboard-hp-buffer-bottom-pipe': LEFT,
} as const;
export const PIPES_CHARGE = {
    'dashboard-tank1-hp-horizontal-pipe-charge': RIGHT,
    'dashboard-tank1-hp-vertical-pipe-charge': DOWN,
    'dashboard-tank1-connection-pipe-charge': LEFT,
    'dashboard-tank3-connection-pipe-charge': LEFT,
    'dashboard-tank3-hp-vertical-pipe-charge': UP,
    'dashboard-tank3-hp-horizontal-pipe-charge': LEFT,
} as const;
export const PIPES_DISCHARGE = {
    'dashboard-tank1-connection-pipe-discharge': RIGHT,
    'dashboard-tank1-hp-vertical-pipe-discharge': UP,
    'dashboard-tank1-buffer-horizontal-pipe-discharge': RIGHT,
    'dashboard-tank3-hp-vertical-pipe-discharge': DOWN,
    'dashboard-tank3-buffer-horizontal-pipe-discharge': LEFT,
    'dashboard-tank3-connection-pipe-discharge': RIGHT,
} as const;
export const PIPES_DIST_VERTICAL = {
    'dashboard-house-right-hp-vertical-pipe': DOWN,
    'dashboard-house-left-hp-vertical-pipe': UP,
} as const;
export const PIPES_DIST_CONNECTORS = {
    'dashboard-house-right-connection-pipe': LEFT,
    'dashboard-house-left-connection-pipe': LEFT,
} as const;
export const PIPES_DIST_FROM_BUFFER = {
    'dashboard-house-buffer-top-pipe': LEFT,
    'dashboard-house-buffer-bottom-pipe': RIGHT,
} as const;
export const PIPES_SPRUCE_FLOOR = {
    'dashboard-house-bridge-pipe': RIGHT,
} as const;
export const PIPES_SIEG_LOOP = {
    'dashboard-sieg-loop-pipe': DOWN,
} as const;

const PIPE_SEGMENT_DEFAULT_DIRECTION_BY_ID = {
    ...PIPES_HEAT_PUMP_BUFFER,
    ...PIPES_CHARGE,
    ...PIPES_DISCHARGE,
    ...PIPES_DIST_VERTICAL,
    ...PIPES_DIST_FROM_BUFFER,
    ...PIPES_SPRUCE_FLOOR,
    ...PIPES_SIEG_LOOP,
} as const;

export type PipeSegmentId = keyof typeof PIPE_SEGMENT_DEFAULT_DIRECTION_BY_ID;

export const PIPE_SEGMENT_IDS = Object.keys(
    PIPE_SEGMENT_DEFAULT_DIRECTION_BY_ID,
) as PipeSegmentId[];

/**
 * Returns SVG `fill` values for pipes that should animate. Omitted keys stay static (`#888` in the component).
 */
export function resolveActivePipeFills(input: DiagramPipeAnimationInput): Partial<Record<PipeSegmentId, string>> {
    const {
        currentState,
        hasPrimFlow,
        hasDistFlow,
        hasSiegFlow,
        isSpruce,
        animateSpruceFloorLoop,
        animateSpruceUpstairsLoop,
    } = input;

    const activePipeColors: Partial<Record<PipeSegmentId, string>> = {};

    let systemState = currentState;
    if (isSpruce) {
        systemState = 'HpOffStoreOff';
    }

    if (hasDistFlow) {
        Object.entries(PIPES_DIST_VERTICAL).forEach(([pipeId, direction]) => {
            activePipeColors[pipeId as PipeSegmentId] = direction;
        });
        if (isSpruce) {
            if (animateSpruceUpstairsLoop) {
                Object.entries(PIPES_DIST_CONNECTORS).forEach(([pipeId, direction]) => {
                    activePipeColors[pipeId as PipeSegmentId] = direction;
                });
            }
            if (animateSpruceFloorLoop) {
                Object.entries(PIPES_SPRUCE_FLOOR).forEach(([pipeId, direction]) => {
                    activePipeColors[pipeId as PipeSegmentId] = direction;
                });
            }
        }
        else {
            Object.entries(PIPES_DIST_CONNECTORS).forEach(([pipeId, direction]) => {
                activePipeColors[pipeId as PipeSegmentId] = direction;
            });
        }
    }

    if (hasSiegFlow) {
        Object.entries(PIPES_SIEG_LOOP).forEach(([pipeId, direction]) => {
            activePipeColors[pipeId as PipeSegmentId] = direction;
        });
    }

    if (systemState === 'HpOnStoreOff') {
        Object.entries(PIPES_HEAT_PUMP_BUFFER).forEach(([pipeId, direction]) => {
            activePipeColors[pipeId as PipeSegmentId] = direction;
        });
    }

    if (systemState === 'HpOnStoreCharge' || systemState === 'HpOffStoreCharge') {
        Object.entries(PIPES_CHARGE).forEach(([pipeId, direction]) => {
            activePipeColors[pipeId as PipeSegmentId] = direction;
        });
        if (hasDistFlow) {
            Object.entries(PIPES_DIST_FROM_BUFFER).forEach(([pipeId, direction]) => {
                activePipeColors[pipeId as PipeSegmentId] = direction;
            });
        }
    }

    if (systemState === 'HpOffStoreOff') {
        if (hasPrimFlow) {
            Object.entries(PIPES_HEAT_PUMP_BUFFER).forEach(([pipeId, direction]) => {
                activePipeColors[pipeId as PipeSegmentId] = direction;
            });
        }
        if (hasDistFlow) {
            Object.entries(PIPES_DIST_FROM_BUFFER).forEach(([pipeId, direction]) => {
                activePipeColors[pipeId as PipeSegmentId] = direction;
            });
        }
    }

    if (systemState === 'HpOffStoreDischarge') {
        Object.entries(PIPES_DISCHARGE).forEach(([pipeId, direction]) => {
            activePipeColors[pipeId as PipeSegmentId] = direction;
        });
    }

    return activePipeColors;
}

// FIRST MAKE IT SO THAT IT WORKS IN ADMIN TOO
// MAYBE IT ALREADY DOES

// ---------------------------------------
// COMPONENT ANIMATIONS
// ---------------------------------------

const BUFFER_HEAT_LINES_TOP_TO_BOTTOM = 'url(#dashboardBufferHeatLinesTopToBottom)';
const BUFFER_HEAT_LINES_BOTTOM_TO_TOP = 'url(#dashboardBufferHeatLinesBottomToTop)';
const TANK_HEAT_LINES_TOP_TO_BOTTOM = 'url(#dashboardTankHeatLinesTopToBottom)';
const TANK_HEAT_LINES_BOTTOM_TO_TOP = 'url(#dashboardTankHeatLinesBottomToTop)';

/** Shared by `resolveAnimatedComponents` only (pipe fills keep their own locals in `resolveActivePipeFills`). */
function getDerivedFlowFlags(input: DiagramPipeAnimationInput) {
    const { currentState, hasDistFlow, hasStoreFlow, hasHpPower } = input;
    const animateBufferDistLoop =
        hasDistFlow && !hasHpPower && !hasStoreFlow;
    const storageDischargePipeAnimation =
        hasStoreFlow &&
        !hasHpPower &&
        (currentState === 'HpOffStoreDischarge' || currentState === null);
    return { animateBufferDistLoop, storageDischargePipeAnimation };
}

/** Overlay / volume animation decisions for `RealTimeStatusSystemDiagram` (buffer, tanks, house, HP). */
export interface DiagramAnimatedComponents {
    showHeatPumpAnimation: boolean;
    showBufferHeatLinesOverlay: boolean;
    bufferHeatLinesFill: string;
    /** Tank 1 overlay (all layouts). Mirrors former `showStorageTankOverlay`. */
    showStorageTank1Overlay: boolean;
    /** Tanks 2–3 only exist in the non-Spruce three-tank layout. */
    showStorageTank2Overlay: boolean;
    showStorageTank3Overlay: boolean;
    /** Pattern fill when any storage-tank overlay is shown; same for each tank rect. */
    storageTankAnimationFill: string;
    showHouseAnimation: boolean;
    /** Spruce: extra static rects over floor band when no floor-zone heating animation. */
    spruceHouseFloorStaticMask: boolean;
}

/**
 * Buffer/tank/house/HP animated overlays — same rules as the previous inline logic in
 * `RealTimeStatusSystemDiagram.tsx`.
 */
export function resolveAnimatedComponents(input: DiagramPipeAnimationInput): DiagramAnimatedComponents {
    const {
        currentState,
        hasDistFlow,
        isSpruce,
        animateSpruceFloorLoop,
    } = input;

    const { animateBufferDistLoop, storageDischargePipeAnimation } = getDerivedFlowFlags(input);

    const showHeatPumpAnimation =
        currentState === 'HpOnStoreOff' || currentState === 'HpOnStoreCharge';

    const showBufferHeatLinesOverlay =
        currentState === 'HpOnStoreOff' ||
        storageDischargePipeAnimation ||
        (hasDistFlow && (currentState === 'HpOffStoreOff' || animateBufferDistLoop));

    const bufferHeatLinesFill =
        isSpruce && hasDistFlow ? BUFFER_HEAT_LINES_BOTTOM_TO_TOP : BUFFER_HEAT_LINES_TOP_TO_BOTTOM;

    const showStorageTank1Overlay =
        storageDischargePipeAnimation || currentState === 'HpOnStoreCharge';
    const showStorageTank2Overlay = showStorageTank1Overlay && !isSpruce;
    const showStorageTank3Overlay = showStorageTank1Overlay && !isSpruce;

    let storageTankAnimationFill = TANK_HEAT_LINES_TOP_TO_BOTTOM;
    if (storageDischargePipeAnimation) {
        storageTankAnimationFill = TANK_HEAT_LINES_BOTTOM_TO_TOP;
    } else if (currentState === 'HpOnStoreCharge') {
        storageTankAnimationFill = TANK_HEAT_LINES_TOP_TO_BOTTOM;
    }

    const showHouseAnimation = hasDistFlow;

    const spruceHouseFloorStaticMask = isSpruce && !animateSpruceFloorLoop;

    return {
        showHeatPumpAnimation,
        showBufferHeatLinesOverlay,
        bufferHeatLinesFill,
        showStorageTank1Overlay,
        showStorageTank2Overlay,
        showStorageTank3Overlay,
        storageTankAnimationFill,
        showHouseAnimation,
        spruceHouseFloorStaticMask,
    };
}