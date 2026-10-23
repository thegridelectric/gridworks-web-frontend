import type { PropsWithChildren } from "react";
import { PLOT_CONTAINER_CSS } from "./plot-configs";

export function PlotlyWrapper(props: PropsWithChildren) {
    
    return <div className="plot-div" style={PLOT_CONTAINER_CSS} >
        {props.children}
    </div>

}