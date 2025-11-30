import { useEffect, type DependencyList } from 'react';

/**
 * Custom hook for debounced effects
 * Delays execution until after specified wait time has passed since last dependency change
 */
export function useDebouncedEffect(
    effect: () => void,
    deps: DependencyList,
    delay: number = 300
) {
    useEffect(() => {
        const handler = setTimeout(() => {
            effect();
        }, delay);

        return () => {
            clearTimeout(handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, delay]);
}
