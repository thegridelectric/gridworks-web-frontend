import type { ReactElement } from "react";

interface RealTimeStatusSystemDiagramPipesProps {
    currentState: string | null,
    shouldAnimateHouse: boolean,
    hasPrimFlow: boolean
}

export default function RealTimeStatusSystemDiagramPipes({ currentState, shouldAnimateHouse, hasPrimFlow }: RealTimeStatusSystemDiagramPipesProps) {

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

        }
    } else if (currentState === 'HpOffStoreDischarge') {
        activePipeColors['dashboard-tank1-hp-vertical-pipe'] = 'url(#dashboardVerticalFlowPattern)';
        activePipeColors['dashboard-tank1-buffer-horizontal-pipe'] = 'url(#dashboardVerticalFlowPattern)';
        activePipeColors['dashboard-tank1-connection-pipe'] = 'url(#dashboardFlowPattern)';
        activePipeColors['dashboard-tank3-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
        activePipeColors['dashboard-tank3-buffer-horizontal-pipe'] = 'url(#dashboardLeftFlowPattern)';
        activePipeColors['dashboard-tank3-connection-pipe'] = 'url(#dashboardFlowPattern)';

        if (shouldAnimateHouse) {
            activePipeColors['dashboard-house-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
            activePipeColors['dashboard-house-hp-vertical-pipe-bottom'] = 'url(#dashboardVerticalFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';
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
        }
    } else {
        // Animate House pipes based on distribution flow
        if (shouldAnimateHouse) {

            activePipeColors['dashboard-house-hp-vertical-pipe'] = 'url(#dashboardVerticalDownFlowPattern)';
            activePipeColors['dashboard-house-hp-vertical-pipe-bottom'] = 'url(#dashboardVerticalFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe'] = 'url(#dashboardLeftFlowPattern)';
            activePipeColors['dashboard-house-connection-pipe-bottom'] = 'url(#dashboardLeftFlowPattern)';

            // Special logic for HpOffStoreOff: House to Buffer pipes when dist flow is active
            // (same as HpOnStoreCharge)
            if (currentState === 'HpOffStoreOff') {
                activePipeColors['dashboard-house-buffer-top-pipe'] = 'url(#dashboardLeftFlowPattern)';
                activePipeColors['dashboard-house-buffer-bottom-pipe'] = 'url(#dashboardFlowPattern)';

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
        'dashboard-house-buffer-bottom-pipe'
    ]
    const pipeColors = {
        ...Object.fromEntries(allPipeNames.map(p => [p, '#888'])),
        ...activePipeColors
    };

    const pipeElements: Record<string, ReactElement> = {
        // {/* Top pipe (from top of heat pump to top of buffer) */}
        'dashboard-hp-buffer-top-pipe': <rect x="140" y="75" width="720" height="15" fill={pipeColors['dashboard-hp-buffer-top-pipe']} />,

        // {/* Bottom pipe (from bottom of heat pump to bottom of buffer) */}
        'dashboard-hp-buffer-bottom-pipe': <rect x="140" y="215" width="720" height="15" fill={pipeColors['dashboard-hp-buffer-bottom-pipe']} />,

        // {/* Horizontal pipe from Tank1 vertical pipe to heat pump top (HpOnStoreCharge) */}
        'dashboard-tank1-hp-horizontal-pipe-charge': <rect x="140" y="75" width="465" height="15" fill={pipeColors['dashboard-tank1-hp-horizontal-pipe-charge']} />,

        // {/* Horizontal pipe from Tank3 vertical pipe to heat pump bottom (HpOnStoreCharge) */ }
        'dashboard-tank3-hp-horizontal-pipe-charge': <rect x="140" y="215" width="50" height="15" fill={pipeColors['dashboard-tank3-hp-horizontal-pipe-charge']} />,

        // {/* Vertical pipe from Tank 1 to heat pump top pipe (HpOffStoreDischarge) */ }
        'dashboard-tank1-hp-vertical-pipe': <rect x="590" y="90" width="15" height="205" fill={pipeColors['dashboard-tank1-hp-vertical-pipe']} />,

        // {/* Horizontal pipe from Tank1-HP vertical pipe to buffer top (HpOffStoreDischarge) */ }
        'dashboard-tank1-buffer-horizontal-pipe': <rect x="590" y="75" width="270" height="15" fill={pipeColors['dashboard-tank1-buffer-horizontal-pipe']} />,

        // {/* Small horizontal pipe from bottom of vertical pipe to top of Tank1 (HpOffStoreDischarge) */ }
        'dashboard-tank1-connection-pipe': <rect x="580" y="295" width="25" height="15" fill={pipeColors['dashboard-tank1-connection-pipe']} />,

        // {/* Vertical pipe from bottom left of Tank3 to HP-Buffer bottom pipe (HpOffStoreDischarge) */ }
        'dashboard-tank3-hp-vertical-pipe': <rect x="175" y="220" width="15" height="220" fill={pipeColors['dashboard-tank3-hp-vertical-pipe']} />,

        // {/* Horizontal pipe from top of Tank3 vertical pipe to bottom of buffer (HpOffStoreDischarge) */ }
        'dashboard-tank3-buffer-horizontal-pipe': <rect x="175" y="215" width="685" height="15" fill={pipeColors['dashboard-tank3-buffer-horizontal-pipe']} />,

        // {/* Small horizontal pipe from Tank3 vertical pipe to bottom of Tank3 (HpOffStoreDischarge) */ }
        'dashboard-tank3-connection-pipe': <rect x="175" y="440" width="25" height="15" fill={pipeColors['dashboard-tank3-connection-pipe']} />,

        // {/* Vertical pipe from Tank1 to heat pump top pipe (HpOnStoreCharge) */ }
        'dashboard-tank1-hp-vertical-pipe-charge': <rect x="590" y="90" width="15" height="205" fill={pipeColors['dashboard-tank1-hp-vertical-pipe-charge']} />,

        // {/* Vertical pipe from bottom left of Tank3 to HP-Buffer bottom pipe (HpOnStoreCharge) */ }
        'dashboard-tank3-hp-vertical-pipe-charge': <rect x="175" y="220" width="15" height="220" fill={pipeColors['dashboard-tank3-hp-vertical-pipe-charge']} />,

        // {/* Small horizontal pipe from Tank1 vertical pipe to top of Tank1 (HpOnStoreCharge) */ }
        'dashboard-tank1-connection-pipe-charge': <rect x="580" y="295" width="25" height="15" fill={pipeColors['dashboard-tank1-connection-pipe-charge']} />,

        // {/* Small horizontal pipe from Tank3 vertical pipe to bottom of Tank3 (HpOnStoreCharge) */ }
        'dashboard-tank3-connection-pipe-charge': <rect x="175" y="440" width="25" height="15" fill={pipeColors['dashboard-tank3-connection-pipe-charge']} />,

        // {/* Vertical pipe from House to heat pump top pipe */ }
        'dashboard-house-hp-vertical-pipe': <rect x="790" y="90" width="15" height="280" fill={pipeColors['dashboard-house-hp-vertical-pipe']} />,

        // {/* Small horizontal pipe from House vertical pipe to top of House */ }
        'dashboard-house-connection-pipe': <rect x="780" y="370" width="25" height="15" fill={pipeColors['dashboard-house-connection-pipe']} />,

        // {/* Vertical pipe from House bottom to heat pump bottom pipe */ }
        'dashboard-house-hp-vertical-pipe-bottom': <rect x="635" y="230" width="15" height="140" fill={pipeColors['dashboard-house-hp-vertical-pipe-bottom']} />,

        // {/* Small horizontal pipe from House vertical pipe to bottom of House */ }
        'dashboard-house-connection-pipe-bottom': <rect x="635" y="370" width="25" height="15" fill={pipeColors['dashboard-house-connection-pipe-bottom']} />,

        // {/* Horizontal pipe from top of right House vertical to buffer top */ }
        'dashboard-house-buffer-top-pipe': <rect x="790" y="75" width="70" height="15" fill={pipeColors['dashboard-house-buffer-top-pipe']} />,

        // {/* Horizontal pipe from top of left House vertical to buffer bottom */ }
        'dashboard-house-buffer-bottom-pipe': <rect x="635" y="215" width="225" height="15" fill={pipeColors['dashboard-house-buffer-bottom-pipe']} />
    };

    const elementsInOrder: ReactElement[] = [];

    for (const [name, el] of Object.entries(pipeElements)) {
        if (!activePipeColors[name]) {
            elementsInOrder.push(el);
        }
    }
    for (const [name, el] of Object.entries(pipeElements)) {
        if (activePipeColors[name]) {
            elementsInOrder.push(el);
        }
    }
    return <>
        {elementsInOrder}
    </>;
}