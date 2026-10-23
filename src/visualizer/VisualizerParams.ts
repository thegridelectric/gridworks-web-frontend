import type { DateTime } from "luxon";

export interface VisualizerParams {
    startDate: DateTime,
    endDate: DateTime,
    installationGNode: string,
}