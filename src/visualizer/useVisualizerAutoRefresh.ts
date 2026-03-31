import { useEffect, useRef } from 'react';

import { getDefaultDate } from '../_util/newYorkTime';

export function useVisualizerAutoRefresh(params: {
    autoRefresh: boolean;
    isBusy: boolean;
    pathRoot: string | undefined;
    onTick: (start: Date, end: Date) => void;
    setDateWindow: (start: Date, end: Date) => void;
}) {
    const { autoRefresh, isBusy, pathRoot, onTick, setDateWindow } = params;
    const isPageFocusedRef = useRef(true);
    const autoRefreshRef = useRef(autoRefresh);
    const blockRefreshRef = useRef(isBusy);

    autoRefreshRef.current = autoRefresh;
    blockRefreshRef.current = isBusy;

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
            if (blockRefreshRef.current) {
                return;
            }
            const start = getDefaultDate(true);
            const end = getDefaultDate(false);
            setDateWindow(start, end);
            onTick(start, end);
        };

        const startAutoRefresh = () => {
            clearTimers();
            timeoutId = setTimeout(maybeAutoRefreshTick, 500);
            intervalId = setInterval(maybeAutoRefreshTick, 60000);
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
    }, [autoRefresh, pathRoot, onTick, setDateWindow]);
}
