/**
 * Pure mapping from dashboard inputs to which pipe segments use animated fills (vs static gray).
 * Keep in sync with SVG pattern ids in `RealTimeStatusSystemDiagram.tsx`.
 */

export const PIPE_SEGMENT_IDS = [
    // Heat pump to and from buffer
    'dashboard-hp-buffer-top-pipe',
    'dashboard-hp-buffer-bottom-pipe',

    // Tank1
    // [Charge] Heat pump to tank1
    'dashboard-tank1-hp-horizontal-pipe-charge',
    'dashboard-tank1-hp-vertical-pipe-charge',
    'dashboard-tank1-connection-pipe-charge',
    // [Discharge] Tank1 to buffer
    'dashboard-tank1-connection-pipe-discharge',
    'dashboard-tank1-hp-vertical-pipe-discharge',
    'dashboard-tank1-buffer-horizontal-pipe-discharge',

    // Tank3
    // [Charge] Tank3 to heat pump
    'dashboard-tank3-connection-pipe-charge',
    'dashboard-tank3-hp-vertical-pipe-charge',
    'dashboard-tank3-hp-horizontal-pipe-charge',
    // [Discharge] Tank3 to buffer
    'dashboard-tank3-hp-vertical-pipe-discharge',
    'dashboard-tank3-buffer-horizontal-pipe-discharge',
    'dashboard-tank3-connection-pipe-discharge',

    // House distribution
    'dashboard-house-right-hp-vertical-pipe',
    'dashboard-house-right-connection-pipe',
    'dashboard-house-left-connection-pipe',
    'dashboard-house-left-hp-vertical-pipe',
    'dashboard-house-buffer-bottom-pipe',
    'dashboard-house-buffer-top-pipe',

    // Spruce only
    'dashboard-house-bridge-pipe',

    // Sieg loop
    'dashboard-sieg-loop-pipe',
    
    
] as const;

export type PipeSegmentId = (typeof PIPE_SEGMENT_IDS)[number];

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

/**
 * Returns SVG `fill` values for pipes that should animate. Omitted keys stay static (`#888` in the component).
 */
export function resolveActivePipeFills(input: DiagramPipeAnimationInput): Partial<Record<PipeSegmentId, string>> {
    const {
        currentState,
        hasPrimFlow,
        hasDistFlow,
        hasStoreFlow,
        hasSiegFlow,
        hasHpPower,
        isSpruce,
        animateSpruceFloorLoop,
        animateSpruceUpstairsLoop,
    } = input;

    const animateBufferDistLoop =
        hasDistFlow && !hasHpPower && !hasStoreFlow;
    const storageDischargePipeAnimation =
        hasStoreFlow &&
        !hasHpPower &&
        (currentState === 'HpOffStoreDischarge' || currentState === null);

    const bridgeOk = hasSiegFlow;

    const activePipeColors: Partial<Record<PipeSegmentId, string>> = {};

    if (currentState === 'HpOnStoreOff') {
        activePipeColors['dashboard-hp-buffer-top-pipe'] = RIGHT;
        activePipeColors['dashboard-hp-buffer-bottom-pipe'] = LEFT;

        if (hasDistFlow) {
            activePipeColors['dashboard-house-right-hp-vertical-pipe'] = DOWN;
            activePipeColors['dashboard-house-left-hp-vertical-pipe'] = UP;
            if (!isSpruce || animateSpruceUpstairsLoop) {
                activePipeColors['dashboard-house-right-connection-pipe'] = LEFT;
                activePipeColors['dashboard-house-left-connection-pipe'] = LEFT;
            }
            activePipeColors['dashboard-house-buffer-top-pipe'] = RIGHT;
            activePipeColors['dashboard-house-buffer-bottom-pipe'] = LEFT;
            if (isSpruce && animateSpruceFloorLoop && bridgeOk) {
                activePipeColors['dashboard-house-bridge-pipe'] = RIGHT;
            }
        }
    } else if (storageDischargePipeAnimation) {
        activePipeColors['dashboard-tank1-hp-vertical-pipe-discharge'] = UP;
        activePipeColors['dashboard-tank1-buffer-horizontal-pipe-discharge'] = RIGHT;
        activePipeColors['dashboard-tank1-connection-pipe-discharge'] = RIGHT;
        activePipeColors['dashboard-tank3-hp-vertical-pipe-discharge'] = DOWN;
        activePipeColors['dashboard-tank3-buffer-horizontal-pipe-discharge'] = LEFT;
        activePipeColors['dashboard-tank3-connection-pipe-discharge'] = RIGHT;

        if (hasDistFlow) {
            activePipeColors['dashboard-house-right-hp-vertical-pipe'] = DOWN;
            activePipeColors['dashboard-house-left-hp-vertical-pipe'] = UP;
            if (!isSpruce || animateSpruceUpstairsLoop) {
                activePipeColors['dashboard-house-right-connection-pipe'] = LEFT;
                activePipeColors['dashboard-house-left-connection-pipe'] = LEFT;
            }
            if (isSpruce && animateSpruceFloorLoop && bridgeOk) {
                activePipeColors['dashboard-house-bridge-pipe'] = RIGHT;
            }
            if (isSpruce) {
                activePipeColors['dashboard-house-buffer-top-pipe'] = RIGHT;
                activePipeColors['dashboard-house-buffer-bottom-pipe'] = LEFT;
            }
        }
    } else if (currentState === 'HpOnStoreCharge') {
        activePipeColors['dashboard-tank1-hp-vertical-pipe-charge'] = DOWN;
        activePipeColors['dashboard-tank3-hp-vertical-pipe-charge'] = UP;
        activePipeColors['dashboard-tank1-connection-pipe-charge'] = LEFT;
        activePipeColors['dashboard-tank3-connection-pipe-charge'] = LEFT;
        activePipeColors['dashboard-tank1-hp-horizontal-pipe-charge'] = RIGHT;
        activePipeColors['dashboard-tank3-hp-horizontal-pipe-charge'] = LEFT;

        if (hasDistFlow) {
            activePipeColors['dashboard-house-right-hp-vertical-pipe'] = DOWN;
            activePipeColors['dashboard-house-left-hp-vertical-pipe'] = LEFT;
            if (!isSpruce || animateSpruceUpstairsLoop) {
                activePipeColors['dashboard-house-right-connection-pipe'] = LEFT;
                activePipeColors['dashboard-house-left-connection-pipe'] = LEFT;
            }
            activePipeColors['dashboard-house-buffer-top-pipe'] = LEFT;
            activePipeColors['dashboard-house-buffer-bottom-pipe'] = RIGHT;
            if (isSpruce && animateSpruceFloorLoop && bridgeOk) {
                activePipeColors['dashboard-house-bridge-pipe'] = LEFT;
            }
        }
    } else {
        if (hasDistFlow) {
            activePipeColors['dashboard-house-right-hp-vertical-pipe'] = DOWN;
            activePipeColors['dashboard-house-left-hp-vertical-pipe'] = UP;
            if (!isSpruce || animateSpruceUpstairsLoop) {
                activePipeColors['dashboard-house-right-connection-pipe'] = LEFT;
                activePipeColors['dashboard-house-left-connection-pipe'] = LEFT;
            }
            if (isSpruce && bridgeOk) {
                activePipeColors['dashboard-house-bridge-pipe'] = RIGHT;
            }

            if (isSpruce) {
                if (currentState === 'HpOffStoreOff') {
                    activePipeColors['dashboard-house-buffer-top-pipe'] = LEFT;
                    activePipeColors['dashboard-house-buffer-bottom-pipe'] = RIGHT;
                    if (animateSpruceFloorLoop && bridgeOk) {
                        activePipeColors['dashboard-house-bridge-pipe'] = LEFT;
                    }
                    if (hasPrimFlow) {
                        activePipeColors['dashboard-hp-buffer-top-pipe'] = RIGHT;
                        activePipeColors['dashboard-hp-buffer-bottom-pipe'] = LEFT;
                    }
                } else if (animateBufferDistLoop) {
                    activePipeColors['dashboard-house-buffer-top-pipe'] = LEFT;
                    activePipeColors['dashboard-house-buffer-bottom-pipe'] = RIGHT;
                    if (animateSpruceFloorLoop && bridgeOk) {
                        activePipeColors['dashboard-house-bridge-pipe'] = LEFT;
                    }
                }
            } else if (animateBufferDistLoop) {
                activePipeColors['dashboard-house-buffer-top-pipe'] = LEFT;
                activePipeColors['dashboard-house-buffer-bottom-pipe'] = RIGHT;

                activePipeColors['dashboard-hp-buffer-top-pipe'] = RIGHT;
                activePipeColors['dashboard-hp-buffer-bottom-pipe'] = LEFT;
            }
        } else {
            if (hasPrimFlow) {
                activePipeColors['dashboard-hp-buffer-top-pipe'] = RIGHT;
                activePipeColors['dashboard-hp-buffer-bottom-pipe'] = LEFT;
            }
        }
    }

    if (hasSiegFlow) {
        activePipeColors['dashboard-sieg-loop-pipe'] = DOWN;
    }

    return activePipeColors;
}

/** Per-segment booleans: true iff that pipe uses an animated pattern (not static gray). */
export function getPipeAnimationActive(input: DiagramPipeAnimationInput): Record<PipeSegmentId, boolean> {
    const fills = resolveActivePipeFills(input);
    return Object.fromEntries(
        PIPE_SEGMENT_IDS.map((id) => [id, fills[id] !== undefined]),
    ) as Record<PipeSegmentId, boolean>;
}
