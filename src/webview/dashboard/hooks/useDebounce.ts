import { useEffect, useState } from 'react';

/**
 * Custom hook for debouncing values (e.g., search input)
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 */
export const useDebounce = <T,>(value: T, delay: number = 300): T => {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};
