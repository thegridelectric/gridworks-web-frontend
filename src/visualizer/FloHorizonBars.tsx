import { elecPriceHighlightFillColor } from "./floElecPriceHighlight";
import type { FloSummaryXAxisMetrics } from "./floPlotXAxisMetrics";

export type FloHorizonBarSelections = {
    top: boolean[];
    bottom: boolean[];
};

const FLO_HORIZON_USER_HIGHLIGHT = {
    green: {
        light: "rgba(46, 160, 67, 0.72)",
        dark: "rgba(63, 185, 80, 0.55)",
    },
    red: {
        light: "rgba(218, 54, 51, 0.72)",
        dark: "rgba(248, 81, 73, 0.55)",
    },
} as const;

function floHorizonUserHighlightFill(kind: "green" | "red", isDarkMode: boolean): string {
    const palette = FLO_HORIZON_USER_HIGHLIGHT[kind];
    return isDarkMode ? palette.dark : palette.light;
}

export function emptyFloHorizonBarSelections(stepCount: number): FloHorizonBarSelections {
    const empty = Array.from({ length: stepCount }, () => false);
    return { top: empty, bottom: [...empty] };
}

/** 1-based horizon positions for each selected step. */
export function floHorizonSelectedPositions(selected: boolean[]): number[] {
    const positions: number[] = [];
    for (let i = 0; i < selected.length; i++) {
        if (selected[i]) {
            positions.push(i + 1);
        }
    }
    return positions;
}

export function formatFloPenForcedHoursList(positions: number[]): string {
    if (positions.length === 0) {
        return "[]";
    }
    return `[${positions.join(", ")}]`;
}

function segmentBackground(
    userSelected: boolean,
    highPrice: boolean,
    userFill: string,
    priceFill: string,
): string | undefined {
    if (userSelected) {
        return userFill;
    }
    if (highPrice) {
        return priceFill;
    }
    return undefined;
}

function FloHorizonBar(props: {
    stepCount: number;
    highPriceSteps: boolean[];
    priceHighlightFill: string;
    userHighlightFill: string;
    userSelectedSteps: boolean[];
    onToggleStep: (index: number) => void;
    ariaLabel: string;
}) {
    const {
        stepCount,
        highPriceSteps,
        priceHighlightFill,
        userHighlightFill,
        userSelectedSteps,
        onToggleStep,
        ariaLabel,
    } = props;
    return (
        <div className="flo-horizon-bar" role="group" aria-label={ariaLabel}>
            {Array.from({ length: stepCount }, (_, i) => {
                const selected = userSelectedSteps[i] === true;
                const backgroundColor = segmentBackground(
                    selected,
                    highPriceSteps[i] === true,
                    userHighlightFill,
                    priceHighlightFill,
                );
                return (
                    <button
                        key={i}
                        type="button"
                        className={`flo-horizon-bar__segment${selected ? " is-user-selected" : ""}`}
                        style={backgroundColor ? { backgroundColor } : undefined}
                        aria-pressed={selected}
                        aria-label={`Horizon step ${i + 1}`}
                        onClick={() => onToggleStep(i)}
                    />
                );
            })}
        </div>
    );
}

export function FloHorizonBars(props: {
    metrics: FloSummaryXAxisMetrics | null;
    highPriceSteps: boolean[];
    isDarkMode: boolean;
    barSelectedSteps: FloHorizonBarSelections;
    onBarSelectedStepsChange: (next: FloHorizonBarSelections) => void;
}) {
    const { metrics, highPriceSteps, isDarkMode, barSelectedSteps, onBarSelectedStepsChange } = props;

    if (!metrics || metrics.stepCount <= 0) {
        return null;
    }

    const { stepCount, offsetPx, lengthPx } = metrics;

    const trackStyle = {
        marginLeft: offsetPx,
        width: lengthPx,
    };
    const priceHighlightFill = elecPriceHighlightFillColor(isDarkMode);
    const greenFill = floHorizonUserHighlightFill("green", isDarkMode);
    const redFill = floHorizonUserHighlightFill("red", isDarkMode);

    function toggleStep(bar: "top" | "bottom", index: number) {
        const empty = emptyFloHorizonBarSelections(stepCount);
        const prev = barSelectedSteps;
        const top = prev.top.length === stepCount ? [...prev.top] : [...empty.top];
        const bottom = prev.bottom.length === stepCount ? [...prev.bottom] : [...empty.bottom];
        if (bar === "top") {
            const willSelect = !top[index];
            top[index] = willSelect;
            if (willSelect) {
                bottom[index] = false;
            }
        } else {
            const willSelect = !bottom[index];
            bottom[index] = willSelect;
            if (willSelect) {
                top[index] = false;
            }
        }
        onBarSelectedStepsChange({ top, bottom });
    }

    return (
        <div className="flo-horizon-bars-wrap">
            <div className="flo-horizon-bars-track" style={trackStyle}>
                <FloHorizonBar
                    stepCount={stepCount}
                    highPriceSteps={highPriceSteps}
                    priceHighlightFill={priceHighlightFill}
                    userHighlightFill={greenFill}
                    userSelectedSteps={barSelectedSteps.top}
                    onToggleStep={(index) => toggleStep("top", index)}
                    ariaLabel="First horizon bar"
                />
                <FloHorizonBar
                    stepCount={stepCount}
                    highPriceSteps={highPriceSteps}
                    priceHighlightFill={priceHighlightFill}
                    userHighlightFill={redFill}
                    userSelectedSteps={barSelectedSteps.bottom}
                    onToggleStep={(index) => toggleStep("bottom", index)}
                    ariaLabel="Second horizon bar"
                />
            </div>
        </div>
    );
}
