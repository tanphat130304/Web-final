import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import { Maximize, Minimize, Play, Pause, Volume2, VolumeX, Info, Lock, Unlock } from "lucide-react";
import useStore from "@/pages/editor/store/use-store";
import { useStableVideoProps } from "@/hooks/use-debounced-store";
import Composition from "./composition";
import { useVideoAspectRatio } from "@/hooks/use-video-aspect-ratio";

interface EnhancedPlayerProps {
  className?: string;
  isLocked?: boolean;
  onToggleLock?: () => void;
}

const EnhancedPlayer: React.FC<EnhancedPlayerProps> = ({ 
  className = "", 
  isLocked: externalIsLocked, 
  onToggleLock: externalOnToggleLock 
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [volume, setVolume] = useState(1);
  const [internalIsLocked, setInternalIsLocked] = useState(false);
  
  const { setPlayerRef, duration, fps, size, isMuted, setIsMuted } = useStore();
  
  // Use stable video props to prevent unnecessary re-renders during operations
  const { trackItemsMap } = useStableVideoProps();
  
  // Use external lock state if provided, otherwise use internal state
  const isPlayerLocked = externalIsLocked !== undefined ? externalIsLocked : internalIsLocked;
  
  // Memoize the current video source detection to prevent unnecessary recalculations
  const currentVideoSrc = useMemo(() => {
    try {
      const videoItems = Object.values(trackItemsMap).filter(item => 
        item && 
        item.type === "video" && 
        item.details && 
        item.details.src && 
        typeof item.details.src === 'string' &&
        item.details.src.trim() !== ''
      );
      return videoItems.length > 0 ? videoItems[0].details.src : undefined;
    } catch (error) {
      console.warn('Error getting current video source:', error);
      return undefined;
    }
  }, [trackItemsMap]);

  const { metadata, aspectRatioInfo, getOptimalDimensions } = useVideoAspectRatio(currentVideoSrc);

  // Memoize composition properties to prevent unnecessary re-renders
  const compositionProps = useMemo(() => ({
    durationInFrames: Math.round((duration / 1000) * fps) || 1,
    compositionWidth: size?.width ?? 1920,
    compositionHeight: size?.height ?? 1080,
    fps: fps ?? 30,
  }), [duration, fps, size]);

  useEffect(() => {
    setPlayerRef(playerRef);
    
    // Set up event listeners for play/pause state
    const player = playerRef.current;
    if (player) {
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      
      player.addEventListener('play', handlePlay);
      player.addEventListener('pause', handlePause);
      
      return () => {
        player.removeEventListener('play', handlePlay);
        player.removeEventListener('pause', handlePause);
      };
    }
  }, [setPlayerRef]);

  // Prevent scroll when player is locked
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventScroll = (e: WheelEvent) => {
      if (isPlayerLocked && !isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener('wheel', preventScroll, { passive: false });
    return () => {
      container.removeEventListener('wheel', preventScroll);
    };
  }, [isPlayerLocked, isFullscreen]);

  // Toggle player lock function
  const togglePlayerLock = () => {
    if (externalOnToggleLock) {
      externalOnToggleLock();
    } else {
      setInternalIsLocked(!isPlayerLocked);
    }
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide controls in fullscreen
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeoutId);
      
      if (isFullscreen) {
        timeoutId = setTimeout(() => {
          setShowControls(false);
        }, 3000); // Hide after 3 seconds of inactivity
      }
    };

    if (isFullscreen) {
      document.addEventListener('mousemove', handleMouseMove);
      // Start the timer immediately when entering fullscreen
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted, setIsMuted]);

  // Calculate optimal size while preserving aspect ratio
  const getOptimalPlayerSize = useCallback(() => {
    // Default fallback size
    const fallbackSize = { width: 1920, height: 1080 };
    
    try {
      if (isFullscreen) {
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        
        if (metadata && metadata.width > 0 && metadata.height > 0) {
          // Use detected video aspect ratio for optimal fullscreen display
          try {
            return getOptimalDimensions(screenWidth, screenHeight, true);
          } catch (error) {
            console.warn('Error calculating optimal dimensions:', error);
          }
        }
        
        // Fallback to composition aspect ratio
        const compositionWidth = compositionProps.compositionWidth;
        const compositionHeight = compositionProps.compositionHeight;
        const aspectRatio = compositionWidth / compositionHeight;
        
        let width = screenWidth;
        let height = screenWidth / aspectRatio;
        
        if (height > screenHeight) {
          height = screenHeight;
          width = screenHeight * aspectRatio;
        }
        
        return { width, height };
      }
      
      // For non-fullscreen, use getOptimalDimensions with composition size as target
      const compositionWidth = compositionProps.compositionWidth;
      const compositionHeight = compositionProps.compositionHeight;
      
      if (metadata && metadata.width > 0 && metadata.height > 0) {
        try {
          return getOptimalDimensions(compositionWidth, compositionHeight, true);
        } catch (error) {
          console.warn('Error calculating optimal dimensions for non-fullscreen:', error);
        }
      }
      
      // Fallback to composition size if metadata is not yet available or invalid
      return { width: compositionWidth, height: compositionHeight };
    } catch (error) {
      console.error('Error in getOptimalPlayerSize:', error);
      return fallbackSize;
    }
  }, [isFullscreen, metadata, getOptimalDimensions, compositionProps]);

  const playerSize = useMemo(() => getOptimalPlayerSize(), [getOptimalPlayerSize]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle when the player container is focused or in fullscreen
      if (!isFullscreen && !containerRef.current?.contains(document.activeElement)) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setShowInfo(!showInfo);
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePlayerLock();
          break;
        case 'Escape':
          if (isFullscreen) {
            e.preventDefault();
            document.exitFullscreen().catch(console.error);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, showInfo, togglePlayPause, toggleFullscreen, toggleMute, isPlayerLocked]);

  return (
    <div
      ref={containerRef}
      className={`relative bg-black ${isFullscreen ? 'fixed inset-0 z-[9999] flex items-center justify-center' : 'h-full w-full'} ${className} ${
        isPlayerLocked && !isFullscreen ? 'ring-2 ring-purple-500 ring-opacity-50' : ''
      }`}
      style={{
        cursor: isFullscreen && !showControls ? 'none' : isPlayerLocked && !isFullscreen ? 'not-allowed' : 'default',
      }}
      tabIndex={0} // Make container focusable
      onClick={togglePlayPause}
    >
      {/* Main Video Player */}
      <div
        className="relative"
        style={{
          width: playerSize.width,
          height: playerSize.height,
          maxWidth: isFullscreen ? '100vw' : '100%',
          maxHeight: isFullscreen ? '100vh' : '100%',
        }}
      >
        {/* Error boundary for RemotionPlayer */}
        {(() => {
          try {
            return (
              <RemotionPlayer
                ref={playerRef}
                component={Composition}
                durationInFrames={compositionProps.durationInFrames}
                compositionWidth={compositionProps.compositionWidth}
                compositionHeight={compositionProps.compositionHeight}
                className="w-full h-full remotion-player"
                fps={compositionProps.fps}
                overflowVisible={false} // Important for proper aspect ratio
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain', // Preserve aspect ratio
                }}
              />
            );
          } catch (error) {
            console.error('RemotionPlayer rendering error:', error);
            return (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center text-white">
                <div className="text-center">
                  <div className="text-lg mb-2">Player Error</div>
                  <div className="text-sm text-gray-400">Unable to render video player</div>
                </div>
              </div>
            );
          }
        })()}

        {/* Control Overlay */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            showControls || !isFullscreen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()} // Prevent play/pause when clicking controls
        >
          {/* Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
            <div className="flex items-center justify-between text-white">
              {/* Left Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={togglePlayPause}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                {/* Player Lock Button */}
                <button
                  onClick={togglePlayerLock}
                  className={`p-2 rounded-full transition-colors ${
                    isPlayerLocked 
                      ? 'bg-purple-600 text-white hover:bg-purple-700' 
                      : 'hover:bg-white/20'
                  }`}
                  title={isPlayerLocked ? 'Mở khóa player (P)' : 'Khóa player (P)'}
                >
                  {isPlayerLocked ? (
                    <Unlock className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </button>

                {/* Video Info Display */}
                {aspectRatioInfo && (
                  <div className="text-xs text-white/80 px-2">
                    {aspectRatioInfo.ratio}
                    {metadata && (
                      <span className="ml-2">
                        {metadata.width}x{metadata.height}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title="Video Info (I)"
                >
                  <Info className="w-5 h-5" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                  title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Lock Status Indicator */}
      {isPlayerLocked && !isFullscreen && (
        <div className="absolute top-4 left-4 px-3 py-2 bg-purple-600/90 text-white text-xs rounded-lg flex items-center gap-2 shadow-lg backdrop-blur-sm">
          <Lock size={12} />
          <span>Player đã được khóa</span>
        </div>
      )}

      {/* Video Info Panel */}
      {showInfo && metadata && (
        <div className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-sm">
          <h3 className="font-semibold mb-2">Video Information</h3>
          <div className="space-y-1">
            <div>Resolution: {metadata.width}x{metadata.height}</div>
            <div>Aspect Ratio: {aspectRatioInfo?.ratio}</div>
            <div>Duration: {Math.round(metadata.duration * 100) / 100}s</div>
            <div>Type: {aspectRatioInfo?.isStandard ? 'Standard' : 'Custom'}</div>
          </div>
        </div>
      )}

      {/* Fullscreen Instructions */}
      {isFullscreen && showControls && (
        <div className="absolute top-4 left-4 text-white/80 text-sm">
          ESC: Exit • F: Fullscreen • Space: Play/Pause • M: Mute • I: Info • P: Lock Player
        </div>
      )}
    </div>
  );
};

export default EnhancedPlayer; 