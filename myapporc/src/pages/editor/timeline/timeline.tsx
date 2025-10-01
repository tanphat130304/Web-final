import { useEffect, useRef, useState, useCallback } from "react";
import Header from "./header";
import Ruler from "./ruler";
import CanvasTimeline, {
  timeMsToUnits,
  unitsToTimeMs,
} from "@designcombo/timeline";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { dispatch, filter, subject } from "@designcombo/events";
import {
  TIMELINE_BOUNDING_CHANGED,
  TIMELINE_PREFIX,
} from "@designcombo/timeline";
import useStore from "@/pages/editor/store/use-store";
import Playhead from "./playhead";
import { useCurrentPlayerFrame } from "@/hooks/use-current-frame";
import { Audio, Image, Text, Video, Caption, Helper, Track } from "./items";
import StateManager, { REPLACE_MEDIA } from "@designcombo/state";
import {
  TIMELINE_OFFSET_CANVAS_LEFT,
  TIMELINE_OFFSET_CANVAS_RIGHT,
} from "../constants/constants";
import { TIMELINE_ITEM_DURATION_CHANGED } from "@/global";
import { ITrackItem } from "@designcombo/types";
import PreviewTrackItem from "./items/preview-drag-item";
import { Lock, Unlock } from "lucide-react"; // Import lock/unlock icons

CanvasTimeline.registerItems({
  Text,
  Image,
  Audio,
  Video,
  Caption,
  Helper,
  Track,
  PreviewTrackItem,
});

const EMPTY_SIZE = { width: 0, height: 0 };

// Utility function for smooth scrolling
const smoothScrollTo = (element: HTMLElement, left: number, behavior: ScrollBehavior = 'smooth') => {
  if (element) {
    element.scrollTo({ left, behavior });
  }
};

// Debounce function for scroll events
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Timeline = ({ 
  stateManager, 
  isLocked: externalIsLocked, 
  onToggleLock: externalOnToggleLock 
}: { 
  stateManager: StateManager;
  isLocked?: boolean;
  onToggleLock?: () => void;
}) => {
  // prevent duplicate scroll events
  const canScrollRef = useRef(false);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<CanvasTimeline | null>(null);
  const verticalScrollbarVpRef = useRef<HTMLDivElement>(null);
  const horizontalScrollbarVpRef = useRef<HTMLDivElement>(null);
  const { scale, playerRef, fps, duration, setState, timeline } = useStore();
  const currentFrame = useCurrentPlayerFrame(playerRef);
  const [canvasSize, setCanvasSize] = useState(EMPTY_SIZE);
  const [size, setSize] = useState<{ width: number; height: number }>(
    EMPTY_SIZE,
  );
  const [internalIsLocked, setInternalIsLocked] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const lastScrollTime = useRef<number>(0);
  const scrollVelocity = useRef<number>(0);
  const lockedScrollPosition = useRef<{ scrollLeft: number; scrollTop: number }>({ scrollLeft: 0, scrollTop: 0 });

  // Use external lock state if provided, otherwise use internal state
  const isLocked = externalIsLocked !== undefined ? externalIsLocked : internalIsLocked;
  
  const { setTimeline } = useStore();

  // Improved scroll handler with momentum and smoothness
  const onScroll = useCallback((v: { scrollTop: number; scrollLeft: number }) => {
    if (isLocked) {
      // Prevent scroll and restore locked position with smoother handling
      if (horizontalScrollbarVpRef.current && verticalScrollbarVpRef.current) {
        // Use a more gentle approach to restore position
        const restorePosition = () => {
          if (verticalScrollbarVpRef.current && horizontalScrollbarVpRef.current) {
            const targetScrollTop = lockedScrollPosition.current.scrollTop;
            const targetScrollLeft = lockedScrollPosition.current.scrollLeft;
            
            // Only restore if position has actually changed
            if (Math.abs(verticalScrollbarVpRef.current.scrollTop - targetScrollTop) > 1) {
              verticalScrollbarVpRef.current.scrollTop = targetScrollTop;
            }
            if (Math.abs(horizontalScrollbarVpRef.current.scrollLeft - targetScrollLeft) > 1) {
              horizontalScrollbarVpRef.current.scrollLeft = targetScrollLeft;
            }
          }
        };
        
        requestAnimationFrame(restorePosition);
      }
      return;
    }
    
    const now = Date.now();
    const deltaTime = now - lastScrollTime.current;
    const deltaX = Math.abs(v.scrollLeft + scrollLeft);
    
    // Calculate scroll velocity
    if (deltaTime > 0) {
      scrollVelocity.current = deltaX / deltaTime;
    }
    
    lastScrollTime.current = now;
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Smooth update of scroll position with better error handling
    if (horizontalScrollbarVpRef.current && verticalScrollbarVpRef.current) {
      requestAnimationFrame(() => {
        try {
          if (verticalScrollbarVpRef.current && horizontalScrollbarVpRef.current && !isLocked) {
            verticalScrollbarVpRef.current.scrollTop = -v.scrollTop;
            horizontalScrollbarVpRef.current.scrollLeft = -v.scrollLeft;
            setScrollLeft(-v.scrollLeft);
          }
        } catch (error) {
          console.warn('Scroll update error:', error);
        }
      });
    }
    
    // Set scrolling state to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      scrollVelocity.current = 0;
    }, 100); // Reduce timeout for better responsiveness
  }, [isLocked, scrollLeft]);

  const toggleLock = () => {
    if (!isLocked) {
      // Store current scroll position before locking
      if (horizontalScrollbarVpRef.current && verticalScrollbarVpRef.current) {
        lockedScrollPosition.current = {
          scrollLeft: horizontalScrollbarVpRef.current.scrollLeft,
          scrollTop: verticalScrollbarVpRef.current.scrollTop
        };
      }
    }
    
    // Use external callback if provided, otherwise use internal state
    if (externalOnToggleLock) {
      externalOnToggleLock();
    } else {
      setInternalIsLocked(!isLocked);
    }
  };

  // Add wheel event prevention when locked
  useEffect(() => {
    const timelineContainer = timelineContainerRef.current;
    if (!timelineContainer) return;

    const preventWheelScroll = (e: WheelEvent) => {
      if (isLocked) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    const preventScroll = (e: Event) => {
      if (isLocked) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }
    };

    // Add both wheel and scroll event listeners with capture
    timelineContainer.addEventListener('wheel', preventWheelScroll, { passive: false, capture: true });
    timelineContainer.addEventListener('scroll', preventScroll, { passive: false, capture: true });
    
    return () => {
      timelineContainer.removeEventListener('wheel', preventWheelScroll, true);
      timelineContainer.removeEventListener('scroll', preventScroll, true);
    };
  }, [isLocked]);

  useEffect(() => {
    if (playerRef?.current) {
      try {
        canScrollRef.current = !isScrolling && !isLocked && playerRef.current.isPlaying();
      } catch (error) {
        console.warn("Error checking player state:", error);
        canScrollRef.current = false;
      }
    } else {
      canScrollRef.current = false;
    }
  }, [playerRef?.current, isScrolling, isLocked]);

  // Improved auto-scroll during playback
  useEffect(() => {
    if (isLocked || isScrolling) return;
    
    const position = timeMsToUnits((currentFrame / fps) * 1000, scale.zoom);
    const canvasBoudingX =
      canvasElRef.current?.getBoundingClientRect().x! +
      canvasElRef.current?.clientWidth!;
    const playHeadPos = position - scrollLeft + 40;
    
    if (playHeadPos >= canvasBoudingX) {
      const scrollElement = horizontalScrollbarVpRef.current;
      if (!scrollElement) return;
      
      const scrollDivWidth = scrollElement.clientWidth;
      const totalScrollWidth = scrollElement.scrollWidth;
      const currentPosScroll = scrollElement.scrollLeft;
      const availableScroll = totalScrollWidth - (scrollDivWidth + currentPosScroll);
      const scaleScroll = availableScroll / scrollDivWidth;
      
      if (scaleScroll >= 0) {
        const targetScrollLeft = scaleScroll > 1 
          ? currentPosScroll + scrollDivWidth 
          : totalScrollWidth - scrollDivWidth;
          
        // Use smooth scrolling for better UX
        smoothScrollTo(scrollElement, targetScrollLeft, 'smooth');
      }
    }
  }, [currentFrame, isLocked, isScrolling]);

  const onResizeCanvas = useCallback((payload: { width: number; height: number }) => {
    // Always allow resize for proper canvas rendering, just prevent scrolling when locked
    setCanvasSize({
      width: payload.width,
      height: payload.height,
    });
  }, []);

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    const timelineContainerEl = timelineContainerRef.current;

    if (!canvasEl || !timelineContainerEl) return;

    const containerWidth = timelineContainerEl.clientWidth - 40;
    const containerHeight = timelineContainerEl.clientHeight - 90;
    
    // Only create canvas if it doesn't exist or if size changed significantly
    if (!canvasRef.current || 
        Math.abs(canvasSize.width - containerWidth) > 10 || 
        Math.abs(canvasSize.height - containerHeight) > 10) {
      
      // Clean up existing canvas
      if (canvasRef.current) {
        canvasRef.current.purge();
      }

      const canvas = new CanvasTimeline(canvasEl, {
        width: containerWidth,
        height: containerHeight,
        bounding: {
          width: containerWidth,
          height: 0,
        },
        selectionColor: "rgba(0, 216, 214,0.1)",
        selectionBorderColor: "rgba(0, 216, 214,1.0)",
        onScroll: onScroll, // Always provide scroll handler, but handle lock inside
        onResizeCanvas: onResizeCanvas,
        scale: scale,
        state: stateManager,
        duration,
        spacing: {
          left: TIMELINE_OFFSET_CANVAS_LEFT,
          right: TIMELINE_OFFSET_CANVAS_RIGHT,
        },
        sizesMap: {
          caption: 32,
          text: 32,
          audio: 36,
          customTrack: 40,
          customTrack2: 40,
          main: 40,
        },
        acceptsMap: {
          text: ["text", "caption"],
          image: ["image", "video"],
          video: ["video", "image"],
          audio: ["audio"],
          caption: ["caption", "text"],
          template: ["template"],
          customTrack: ["video", "image"],
          customTrack2: ["video", "image"],
          main: ["video", "image"],
        },
        guideLineColor: "#ffffff",
      });

      canvasRef.current = canvas;
      setTimeline(canvas);
    }

    setCanvasSize({ width: containerWidth, height: containerHeight });
    setSize({
      width: containerWidth,
      height: 0,
    });

    const resizeDesignSubscription = stateManager.subscribeToSize(
      (newState) => {
        setState(newState);
      },
    );
    const scaleSubscription = stateManager.subscribeToScale((newState) => {
      setState(newState);
    });

    const tracksSubscription = stateManager.subscribeToState((newState) => {
      setState(newState);
    });
    const durationSubscription = stateManager.subscribeToDuration(
      (newState) => {
        setState(newState);
      },
    );

    const updateTrackItemsMap = stateManager.subscribeToUpdateTrackItem(() => {
      const currentState = stateManager.getState();
      setState({
        duration: currentState.duration,
        trackItemsMap: currentState.trackItemsMap,
      });
    });

    const itemsDetailsSubscription = stateManager.subscribeToAddOrRemoveItems(
      () => {
        const currentState = stateManager.getState();
        setState({
          trackItemDetailsMap: currentState.trackItemDetailsMap,
          trackItemsMap: currentState.trackItemsMap,
          trackItemIds: currentState.trackItemIds,
          tracks: currentState.tracks,
        });
      },
    );

    const updateItemDetailsSubscription =
      stateManager.subscribeToUpdateItemDetails(() => {
        const currentState = stateManager.getState();
        setState({
          trackItemDetailsMap: currentState.trackItemDetailsMap,
        });
      });

    return () => {
      scaleSubscription.unsubscribe();
      tracksSubscription.unsubscribe();
      durationSubscription.unsubscribe();
      itemsDetailsSubscription.unsubscribe();
      updateTrackItemsMap.unsubscribe();
      updateItemDetailsSubscription.unsubscribe();
      resizeDesignSubscription.unsubscribe();
    };
  }, [onScroll, onResizeCanvas]); // Remove isLocked dependency to prevent canvas recreation

  // Force canvas refresh when lock state changes
  useEffect(() => {
    // Simply ensure the canvas state is consistent when lock changes
    if (canvasRef.current && !isLocked) {
      // Restore scroll position if needed
      const currentScrollLeft = horizontalScrollbarVpRef.current?.scrollLeft || 0;
      const currentScrollTop = verticalScrollbarVpRef.current?.scrollTop || 0;
      
      if (currentScrollLeft !== lockedScrollPosition.current.scrollLeft || 
          currentScrollTop !== lockedScrollPosition.current.scrollTop) {
        canvasRef.current.scrollTo({ 
          scrollLeft: currentScrollLeft, 
          scrollTop: currentScrollTop 
        });
      }
    }
  }, [isLocked]);

  // Debounced scroll handlers for better performance
  const debouncedHorizontalScroll = useCallback(
    debounce((scrollLeft: number) => {
      if (!canvasRef.current) return;
      
      if (!isLocked && canScrollRef.current) {
        canvasRef.current.scrollTo({ scrollLeft });
        setScrollLeft(scrollLeft);
      }
    }, 5), // Reduce debounce time for better responsiveness
    [isLocked]
  );

  const debouncedVerticalScroll = useCallback(
    debounce((scrollTop: number) => {
      if (!canvasRef.current) return;
      
      if (!isLocked && canScrollRef.current) {
        canvasRef.current.scrollTo({ scrollTop });
      }
    }, 5), // Reduce debounce time for better responsiveness
    [isLocked]
  );

  const handleOnScrollH = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
    if (isLocked) {
      // Restore locked position immediately
      requestAnimationFrame(() => {
        if (e.currentTarget) {
          e.currentTarget.scrollLeft = lockedScrollPosition.current.scrollLeft;
        }
      });
      return;
    }
    
    const newScrollLeft = e.currentTarget.scrollLeft;
    debouncedHorizontalScroll(newScrollLeft);
  };

  const handleOnScrollV = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
    if (isLocked) {
      // Restore locked position immediately
      requestAnimationFrame(() => {
        if (e.currentTarget) {
          e.currentTarget.scrollTop = lockedScrollPosition.current.scrollTop;
        }
      });
      return;
    }
    
    const newScrollTop = e.currentTarget.scrollTop;
    debouncedVerticalScroll(newScrollTop);
  };

  useEffect(() => {
    const addEvents = subject.pipe(
      filter(({ key }) => key.startsWith(TIMELINE_PREFIX)),
    );

    const subscription = addEvents.subscribe((obj) => {
      if (obj.key === TIMELINE_BOUNDING_CHANGED) {
        const bounding = obj.value?.payload?.bounding;
        if (bounding) {
          setSize({
            width: bounding.width,
            height: bounding.height,
          });
        }
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleReplaceItem = (trackItem: Partial<ITrackItem>) => {
    dispatch(REPLACE_MEDIA, {
      payload: {
        [trackItem.id!]: {
          details: {
            src: "https://cdn.designcombo.dev/videos/demo-video-4.mp4",
          },
        },
      },
    });
  };

  useEffect(() => {
    const timelineEvents = subject.pipe(
      filter(({ key }) => key.startsWith(TIMELINE_PREFIX)),
    );

    const subscription = timelineEvents.subscribe((obj) => {
      if (obj.key === TIMELINE_ITEM_DURATION_CHANGED) {
        handleReplaceItem(obj.value?.payload);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [timeline]);

  const onClickRuler = (units: number) => {
    if (isLocked) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const time = unitsToTimeMs(units, scale.zoom);
    playerRef?.current?.seekTo((time * fps) / 1000);
  };

  useEffect(() => {
    const availableScroll = horizontalScrollbarVpRef.current?.scrollWidth;
    if (!availableScroll || !timeline) return;
    const canvasWidth = timeline.width;
    if (availableScroll < canvasWidth + scrollLeft) {
      timeline.scrollTo({ scrollLeft: availableScroll - canvasWidth });
    }
  }, [scale]);

  // Cleanup function for scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Add resize observer to handle container size changes
  useEffect(() => {
    const timelineContainer = timelineContainerRef.current;
    if (!timelineContainer) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const containerWidth = width - 40;
        const containerHeight = height - 90;
        
        // Update canvas size if it exists and size changed significantly
        if (canvasRef.current && 
            (Math.abs(canvasSize.width - containerWidth) > 5 || 
             Math.abs(canvasSize.height - containerHeight) > 5)) {
          
          // Update canvas dimensions
          setCanvasSize({ width: containerWidth, height: containerHeight });
          
          // Update the canvas element size
          const canvasEl = canvasElRef.current;
          if (canvasEl) {
            canvasEl.width = containerWidth;
            canvasEl.height = containerHeight;
            canvasEl.style.width = `${containerWidth}px`;
            canvasEl.style.height = `${containerHeight}px`;
          }
          
          // Notify the canvas about the size change
          try {
            canvasRef.current.resize({ width: containerWidth, height: containerHeight });
          } catch (error) {
            console.warn('Canvas resize error:', error);
            // If resize method doesn't exist, try recreating the canvas
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.purge();
              canvasRef.current = null;
              // Force re-creation on next render
              setCanvasSize({ width: 0, height: 0 });
            }
          }
        }
      }
    });

    resizeObserver.observe(timelineContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasSize.width, canvasSize.height]);

  return (
    <div
      ref={timelineContainerRef}
      id={"timeline-container"}
      className={`relative h-full w-full overflow-hidden bg-background ${
        isLocked ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
      style={{
        cursor: isLocked ? 'not-allowed' : 'default',
      }}
    >
      <Header />
      <Ruler onClick={isLocked ? undefined : onClickRuler} scrollLeft={scrollLeft} />
      <Playhead scrollLeft={scrollLeft} />
      <div className="flex">
        <div className="relative w-10 flex-none"></div>
        <div style={{ height: canvasSize.height }} className="relative flex-1">
          <div
            style={{ height: canvasSize.height }}
            ref={containerRef}
            className="absolute top-0 w-full"
          >
            <canvas id="designcombo-timeline-canvas" ref={canvasElRef} />
          </div>
          <ScrollArea.Root
            type="always"
            style={{
              position: "absolute",
              width: "calc(100vw - 40px)",
              height: "10px",
            }}
            className={`ScrollAreaRootH ${isLocked ? 'pointer-events-none' : ''}`}
            onPointerDown={() => {
              if (!isLocked) canScrollRef.current = true;
            }}
            onPointerUp={() => {
              if (!isLocked) canScrollRef.current = false;
            }}
          >
            <ScrollArea.Viewport
              onScroll={handleOnScrollH}
              className="ScrollAreaViewport"
              id="viewportH"
              ref={horizontalScrollbarVpRef}
              style={{ scrollBehavior: isLocked ? 'auto' : 'smooth' }}
            >
              <div
                style={{
                  width:
                    size.width > canvasSize.width
                      ? size.width + TIMELINE_OFFSET_CANVAS_RIGHT
                      : size.width,
                }}
                className="pointer-events-none h-[10px]"
              ></div>
            </ScrollArea.Viewport>

            <ScrollArea.Scrollbar
              className={`ScrollAreaScrollbar ${isLocked ? 'opacity-50' : ''}`}
              orientation="horizontal"
            >
              <ScrollArea.Thumb
                onMouseDown={() => {
                  if (!isLocked) canScrollRef.current = true;
                }}
                onMouseUp={() => {
                  if (!isLocked) canScrollRef.current = false;
                }}
                className="ScrollAreaThumb"
              />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          <ScrollArea.Root
            type="always"
            style={{
              position: "absolute",
              height: canvasSize.height,
              width: "10px",
            }}
            className={`ScrollAreaRootV ${isLocked ? 'pointer-events-none' : ''}`}
          >
            <ScrollArea.Viewport
              onScroll={handleOnScrollV}
              className="ScrollAreaViewport"
              ref={verticalScrollbarVpRef}
              style={{ scrollBehavior: isLocked ? 'auto' : 'smooth' }}
            >
              <div
                style={{
                  height:
                    size.height > canvasSize.height
                      ? size.height + 40
                      : canvasSize.height,
                }}
                className="pointer-events-none w-[10px]"
              ></div>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className={`ScrollAreaScrollbar ${isLocked ? 'opacity-50' : ''}`}
              orientation="vertical"
            >
              <ScrollArea.Thumb
                onMouseDown={() => {
                  if (!isLocked) canScrollRef.current = true;
                }}
                onMouseUp={() => {
                  if (!isLocked) canScrollRef.current = false;
                }}
                className="ScrollAreaThumb"
              />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </div>
      </div>
      
      {/* Enhanced Lock/Unlock Button */}
      <button
        onClick={toggleLock}
        className={`absolute top-2 right-2 p-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg ${
          isLocked 
            ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-400' 
            : 'bg-gray-800 text-white hover:bg-gray-700'
        }`}
        title={isLocked ? "Mở khóa timeline (L)" : "Khóa timeline (L)"}
      >
        {isLocked ? <Unlock size={16} /> : <Lock size={16} />}
        <span className="text-xs font-medium">
          {isLocked ? 'Đã khóa' : 'Khóa'}
        </span>
      </button>
      
      {/* Enhanced Status Indicators */}
      {isLocked && (
        <div className="absolute top-16 right-2 px-3 py-2 bg-blue-600/90 text-white text-xs rounded-lg flex items-center gap-2 shadow-lg backdrop-blur-sm">
          <Lock size={12} />
          <span>Timeline đã được khóa</span>
        </div>
      )}
      
      {isScrolling && !isLocked && (
        <div className="absolute top-16 right-2 px-3 py-2 bg-gray-600/90 text-white text-xs rounded-lg flex items-center gap-2 shadow-lg backdrop-blur-sm">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span>Đang cuộn...</span>
        </div>
      )}
    </div>
  );
};

export default Timeline;
