import { CallbackListener, PlayerRef } from "@remotion/player";
import { useCallback, useSyncExternalStore, useRef } from "react";

// Throttle function to limit frame update frequency
const throttle = (func: Function, limit: number) => {
  let inThrottle: boolean;
  return function(this: any, ...args: any[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const useCurrentPlayerFrame = (ref: React.RefObject<PlayerRef> | null) => {
  const lastFrameRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const maxErrors = 5; // Maximum consecutive errors before stopping updates
  
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!ref || !ref.current) {
        return () => undefined;
      }
      
      const { current } = ref;
      
      // Throttle updates to improve performance (max 30fps)
      const throttledUpdater = throttle(() => {
        try {
          onStoreChange();
          errorCountRef.current = 0; // Reset error count on success
        } catch (error) {
          errorCountRef.current++;
          console.warn("Error in frame update callback:", error);
          
          // Stop listening after too many errors
          if (errorCountRef.current >= maxErrors) {
            console.error("Too many frame update errors, stopping updates");
            return;
          }
        }
      }, 16); // ~60fps max update rate
      
      const updater: CallbackListener<"frameupdate"> = throttledUpdater;
      
      try {
        current.addEventListener("frameupdate", updater);
      } catch (error) {
        console.warn("Error adding frame update listener:", error);
        return () => undefined;
      }
      
      return () => {
        try {
          if (current) {
            current.removeEventListener("frameupdate", updater);
          }
        } catch (error) {
          console.warn("Error removing frame update listener:", error);
        }
      };
    },
    [ref],
  );
  
  const getSnapshot = useCallback(() => {
    if (!ref || !ref.current) {
      return lastFrameRef.current; // Return last known frame instead of 0
    }
    
    try {
      const currentFrame = ref.current.getCurrentFrame();
      if (typeof currentFrame === 'number' && !isNaN(currentFrame)) {
        lastFrameRef.current = currentFrame;
        errorCountRef.current = 0; // Reset error count on success
        return currentFrame;
      } else {
        return lastFrameRef.current;
      }
    } catch (error) {
      errorCountRef.current++;
      console.warn("Error getting current frame:", error);
      
      // Return last known good frame
      return lastFrameRef.current;
    }
  }, [ref]);
  
  const getServerSnapshot = useCallback(() => lastFrameRef.current, []);
  
  const data = useSyncExternalStore<number>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  
  return data;
};
