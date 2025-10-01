import useStore from "@/pages/editor/store/use-store";
import { useEffect, useRef } from "react";
import { filter, subject } from "@designcombo/events";
import {
  PLAYER_PAUSE,
  PLAYER_PLAY,
  PLAYER_PREFIX,
  PLAYER_SEEK,
  PLAYER_SEEK_BY,
  PLAYER_TOGGLE_PLAY,
} from "@/global";
import { LAYER_PREFIX, LAYER_SELECTION } from "@designcombo/state";
import { TIMELINE_SEEK, TIMELINE_PREFIX } from "@designcombo/timeline";

const useTimelineEvents = () => {
  const { playerRef, fps, timeline, setState } = useStore();
  const isProcessingRef = useRef(false);

  // Handle player events with improved error handling
  useEffect(() => {
    const playerEvents = subject.pipe(
      filter(({ key }) => key.startsWith(PLAYER_PREFIX)),
    );
    const timelineEvents = subject.pipe(
      filter(({ key }) => key.startsWith(TIMELINE_PREFIX)),
    );

    const timelineEventsSubscription = timelineEvents.subscribe((obj) => {
      if (obj.key === TIMELINE_SEEK) {
        const { time } = obj.value?.payload;
        if (playerRef?.current && typeof time === 'number') {
          try {
            playerRef.current.seekTo((time / 1000) * fps);
          } catch (error) {
            console.warn("Error seeking timeline:", error);
          }
        }
      }
    });

    const playerEventsSubscription = playerEvents.subscribe((obj) => {
      // Prevent duplicate processing of events
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;

      try {
        if (obj.key === PLAYER_SEEK) {
          const { time } = obj.value?.payload;
          if (playerRef?.current && typeof time === 'number') {
            playerRef.current.seekTo((time / 1000) * fps);
          }
        } else if (obj.key === PLAYER_PLAY) {
          if (playerRef?.current) {
            playerRef.current.play();
          }
        } else if (obj.key === PLAYER_PAUSE) {
          if (playerRef?.current) {
            playerRef.current.pause();
          }
        } else if (obj.key === PLAYER_TOGGLE_PLAY) {
          if (playerRef?.current) {
            try {
              const isCurrentlyPlaying = playerRef.current.isPlaying();
              if (isCurrentlyPlaying) {
                playerRef.current.pause();
              } else {
                playerRef.current.play();
              }
            } catch (error) {
              console.warn("Error toggling player:", error);
              // Fallback: try to play if checking state fails
              try {
                playerRef.current.play();
              } catch (playError) {
                console.warn("Error playing video:", playError);
              }
            }
          }
        } else if (obj.key === PLAYER_SEEK_BY) {
          const { frames } = obj.value?.payload;
          if (playerRef?.current && typeof frames === 'number') {
            try {
              const currentFrame = playerRef.current.getCurrentFrame();
              const targetFrame = Math.max(0, Math.round(currentFrame) + frames);
              playerRef.current.seekTo(targetFrame);
            } catch (error) {
              console.warn("Error seeking by frames:", error);
            }
          }
        }
      } catch (error) {
        console.warn("Error processing player event:", error);
      } finally {
        // Use requestAnimationFrame to ensure smooth processing
        requestAnimationFrame(() => {
          isProcessingRef.current = false;
        });
      }
    });

    return () => {
      playerEventsSubscription.unsubscribe();
      timelineEventsSubscription.unsubscribe();
    };
  }, [playerRef, fps]);

  // Handle selection events with improved performance
  useEffect(() => {
    const selectionEvents = subject.pipe(
      filter(({ key }) => key.startsWith(LAYER_PREFIX)),
    );

    const selectionSubscription = selectionEvents.subscribe((obj) => {
      if (obj.key === LAYER_SELECTION) {
        const activeIds = obj.value?.payload?.activeIds;
        if (Array.isArray(activeIds)) {
          // Use requestAnimationFrame for smooth state updates
          requestAnimationFrame(() => {
            setState({
              activeIds: activeIds,
            });
          });
        }
      }
    });

    return () => selectionSubscription.unsubscribe();
  }, [timeline, setState]);

  // Add cleanup for processing ref
  useEffect(() => {
    return () => {
      isProcessingRef.current = false;
    };
  }, []);
};

export default useTimelineEvents;
