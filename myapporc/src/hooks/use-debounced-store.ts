import { useState, useEffect, useRef } from 'react';
import useStore from '@/pages/editor/store/use-store';

/**
 * Custom hook that provides a debounced version of the store state
 * to prevent rapid re-renders during operations like audio deletion or cloning
 */
export const useDebouncedStore = (delay: number = 100) => {
  const store = useStore();
  const [debouncedStore, setDebouncedStore] = useState(store);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedStore(store);
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [store, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedStore;
};

/**
 * Hook to get stable video properties for rendering optimization
 */
export const useStableVideoProps = () => {
  const { trackItemsMap, isMuted, fps } = useStore();
  const [stableProps, setStableProps] = useState({ trackItemsMap, isMuted, fps });
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setStableProps({ trackItemsMap, isMuted, fps });
    }, 50); // Shorter delay for video-specific props

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [trackItemsMap, isMuted, fps]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return stableProps;
}; 