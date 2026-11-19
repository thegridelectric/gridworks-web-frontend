import { useEffect, useRef, type RefObject } from 'react';

import { getDefaultDate } from '../_util/newYorkTime';

/** Moves the window's end to now every 30 s while the page is focused
 *  and the plots are not loading. A zoomed plot (`isZoomedRef`) holds
 *  the tick: a refresh redraws every plot at the full window, which
 *  would throw the zoom away. The flag is a ref so that a drag renders
 *  nothing; a re-render alone hands every plot a fresh layout and
 *  resets its zoom. */
export function useVisualizerAutoRefresh(params: {
    autoRefresh: boolean;
    isBusy: boolean;
    isZoomedRef: RefObject<boolean>;
    pathRoot: string | undefined;
    onTick: (end: Date) => void;
    setEndDateTime: (end: Date) => void;
}) {
    const { autoRefresh, isBusy, isZoomedRef, pathRoot, onTick, setEndDateTime } = params;
    const isPageFocusedRef = useRef(true);
    const autoRefreshRef = useRef(autoRefresh);
    const blockRefreshRef = useRef(isBusy);
    const onTickRef = useRef(onTick);
    const setEndDateTimeRef = useRef(setEndDateTime);

    useEffect(() => {
        autoRefreshRef.current = autoRefresh;
    }, [autoRefresh]);

    useEffect(() => {
        blockRefreshRef.current = isBusy;
    }, [isBusy]);

    useEffect(() => {
        onTickRef.current = onTick;
        setEndDateTimeRef.current = setEndDateTime;
    });

    useEffect(() => {
        if (!autoRefresh || pathRoot !== 'visualizer') {
            return;
        }

        let intervalId: ReturnType<typeof setInterval> | undefined;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const clearTimers = () => {
            if (intervalId !== undefined) {
                clearInterval(intervalId);
                intervalId = undefined;
            }
            if (timeoutId !== undefined) {
                clearTimeout(timeoutId);
                timeoutId = undefined;
            }
        };

        const maybeAutoRefreshTick = () => {
            if (!autoRefreshRef.current || document.hidden || !isPageFocusedRef.current) {
                return;
            }
            if (pathRoot !== 'visualizer') {
                return;
            }
            if (blockRefreshRef.current || isZoomedRef.current) {
                return;
            }
            const end = getDefaultDate(false);
            setEndDateTimeRef.current(end);
            onTickRef.current(end);
        };

        const startAutoRefresh = () => {
            clearTimers();
            timeoutId = setTimeout(maybeAutoRefreshTick, 500);
            intervalId = setInterval(maybeAutoRefreshTick, 30000);
        };

        const checkPageFocus = () => {
            isPageFocusedRef.current = document.hasFocus();
            const onVisualizerRoute = pathRoot === 'visualizer';
            const allow =
                isPageFocusedRef.current &&
                !document.hidden &&
                autoRefreshRef.current &&
                onVisualizerRoute;
            if (allow) {
                startAutoRefresh();
            } else if (!isPageFocusedRef.current || document.hidden || !onVisualizerRoute) {
                clearTimers();
            }
        };

        isPageFocusedRef.current = document.hasFocus();
        if (isPageFocusedRef.current && !document.hidden) {
            startAutoRefresh();
        }

        window.addEventListener('focus', checkPageFocus);
        window.addEventListener('blur', checkPageFocus);
        const onVisibilityChange = () => {
            if (!document.hidden) {
                setTimeout(checkPageFocus, 100);
            } else {
                isPageFocusedRef.current = false;
                clearTimers();
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.removeEventListener('focus', checkPageFocus);
            window.removeEventListener('blur', checkPageFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            clearTimers();
        };
    }, [autoRefresh, pathRoot, isZoomedRef]);
}
