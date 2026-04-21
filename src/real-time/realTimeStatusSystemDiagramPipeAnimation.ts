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
    'dashboard-tank3-buffer-horizontal-pipe-discharge': LEFT,
    'dashboard-tank3-hp-vertical-pipe-discharge': DOWN,
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
    'dashboard-house-bridge-pipe': LEFT,
} as const;
export const PIPES_SIEG_LOOP = {
    'dashboard-sieg-loop-top-connector-pipe': RIGHT,
    'dashboard-sieg-loop-bottom-connector-pipe': LEFT,
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
    if (isSpruce && currentState === null) {
        systemState = 'HpOffStoreOff'; // TODO: eventually remove when heat pump/storage is installed
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

// ---------------------------------------
// COMPONENT ANIMATIONS
// ---------------------------------------

const COMPONENT_HEAT_PUMP_GRADIENT = 'url(#dashboardHeatGradient)';
const COMPONENT_HEAT_PUMP_LINES = 'url(#dashboardHeatLinesPattern)';
const COMPONENT_HOUSE_GRADIENT = 'url(#dashboardHouseHeatGradient)';
const COMPONENT_HOUSE_LINES = 'url(#dashboardHouseHeatLinesPattern)';
const COMPONENT_DOWN = 'url(#dashboardVerticalHeatLinesDownPattern)';
const COMPONENT_UP = 'url(#dashboardVerticalHeatLinesUpPattern)';

export interface DiagramAnimatedComponent {
    gradientFill?: string;
    animationFill: string;
}

export const COMPONENTS_HEAT_PUMP = {
    'dashboard-hp-animation': {
        gradientFill: COMPONENT_HEAT_PUMP_GRADIENT,
        animationFill: COMPONENT_HEAT_PUMP_LINES,
    },
} as const;
export const COMPONENTS_BUFFER_TOP_TO_BOTTOM = {
    'dashboard-buffer-animation': {
        animationFill: COMPONENT_DOWN,
    },
} as const;
export const COMPONENTS_BUFFER_BOTTOM_TO_TOP = {
    'dashboard-buffer-animation': {
        animationFill: COMPONENT_UP,
    },
} as const;
export const COMPONENTS_STORAGE_CHARGE = {
    'dashboard-tank1-animation': {
        animationFill: COMPONENT_DOWN,
    },
    'dashboard-tank2-animation': {
        animationFill: COMPONENT_DOWN,
    },
    'dashboard-tank3-animation': {
        animationFill: COMPONENT_DOWN,
    },
} as const;
export const COMPONENTS_STORAGE_CHARGE_SPRUCE = {
    'dashboard-tank1-animation': {
        animationFill: COMPONENT_DOWN,
    },
} as const;
export const COMPONENTS_STORAGE_DISCHARGE = {
    'dashboard-tank1-animation': {
        animationFill: COMPONENT_UP,
    },
    'dashboard-tank2-animation': {
        animationFill: COMPONENT_UP,
    },
    'dashboard-tank3-animation': {
        animationFill: COMPONENT_UP,
    },
} as const;
export const COMPONENTS_STORAGE_DISCHARGE_SPRUCE = {
    'dashboard-tank1-animation': {
        animationFill: COMPONENT_UP,
    },
} as const;
export const COMPONENTS_HOUSE = {
    'dashboard-house-animation': {
        gradientFill: COMPONENT_HOUSE_GRADIENT,
        animationFill: COMPONENT_HOUSE_LINES,
    },
} as const;
export const COMPONENTS_SPRUCE_HOUSE_FLOOR_STATIC_MASK = {
    'dashboard-house-floor-static-mask': true,
} as const;

const COMPONENT_FILL_DEFAULT_VALUE_BY_ID = {
    ...COMPONENTS_HEAT_PUMP,
    ...COMPONENTS_BUFFER_TOP_TO_BOTTOM,
    ...COMPONENTS_STORAGE_CHARGE,
    ...COMPONENTS_HOUSE,
} as const;
const COMPONENT_FLAG_DEFAULT_VALUE_BY_ID = {
    ...COMPONENTS_SPRUCE_HOUSE_FLOOR_STATIC_MASK,
} as const;

export type ComponentFillId = keyof typeof COMPONENT_FILL_DEFAULT_VALUE_BY_ID;
export type ComponentFlagId = keyof typeof COMPONENT_FLAG_DEFAULT_VALUE_BY_ID;
export type DiagramActiveComponentFills = Partial<Record<ComponentFillId, DiagramAnimatedComponent>>;
export type DiagramActiveComponentFlags = Partial<Record<ComponentFlagId, true>>;

/**
 * Returns SVG `fill` values for animated components. Omitted keys stay static (`#888` / off).
 */
export function resolveActiveComponentFills(input: DiagramPipeAnimationInput): DiagramActiveComponentFills {
    const {
        currentState,
        hasDistFlow,
        hasHpPower,
        isSpruce,
    } = input;

    const activeComponentFills: DiagramActiveComponentFills = {};

    if (hasHpPower) {
        Object.entries(COMPONENTS_HEAT_PUMP).forEach(([componentId, fill]) => {
            activeComponentFills[componentId as ComponentFillId] = fill;
        });
    }

    if (hasDistFlow) {
        Object.entries(COMPONENTS_HOUSE).forEach(([componentId, fill]) => {
            activeComponentFills[componentId as ComponentFillId] = fill;
        });
    }

    if (currentState === 'HpOffStoreDischarge') {
        Object.entries(
            isSpruce ? COMPONENTS_STORAGE_DISCHARGE_SPRUCE : COMPONENTS_STORAGE_DISCHARGE,
        ).forEach(([componentId, fill]) => {
            activeComponentFills[componentId as ComponentFillId] = fill;
        });
        Object.entries(COMPONENTS_BUFFER_TOP_TO_BOTTOM).forEach(([componentId, fill]) => {
            activeComponentFills[componentId as ComponentFillId] = fill;
        });
    } 
    
    else if (currentState === 'HpOnStoreCharge') {
        Object.entries(
            isSpruce ? COMPONENTS_STORAGE_CHARGE_SPRUCE : COMPONENTS_STORAGE_CHARGE,
        ).forEach(([componentId, fill]) => {
            activeComponentFills[componentId as ComponentFillId] = fill;
        });
    }

    else if (currentState === 'HpOnStoreOff') {
        Object.entries(
            isSpruce ? COMPONENTS_STORAGE_CHARGE_SPRUCE : COMPONENTS_STORAGE_CHARGE,
        ).forEach(([componentId, fill]) => {
            activeComponentFills[componentId as ComponentFillId] = fill;
        });
    }

    if (currentState == 'HpOnStoreCharge' || currentState == 'HpOffStoreOff') {
        if (hasDistFlow) {
            Object.entries(COMPONENTS_BUFFER_BOTTOM_TO_TOP).forEach(([componentId, fill]) => {
                activeComponentFills[componentId as ComponentFillId] = fill;
            });
        }
    }

    return activeComponentFills;
}

export function resolveActiveComponentFlags(input: DiagramPipeAnimationInput): DiagramActiveComponentFlags {
    const { isSpruce, animateSpruceFloorLoop } = input;
    const activeComponentFlags: DiagramActiveComponentFlags = {};

    if (isSpruce && !animateSpruceFloorLoop) {
        Object.keys(COMPONENTS_SPRUCE_HOUSE_FLOOR_STATIC_MASK).forEach((componentId) => {
            activeComponentFlags[componentId as ComponentFlagId] = true;
        });
    }

    return activeComponentFlags;
}
