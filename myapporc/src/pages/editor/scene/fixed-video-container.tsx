import React, { useRef, useEffect, useState, useCallback } from 'react';

interface FixedVideoContainerProps {
  children: React.ReactNode;
  videoSize: { width: number; height: number };
  isLocked?: boolean;
  className?: string;
}

const FixedVideoContainer: React.FC<FixedVideoContainerProps> = ({
  children,
  videoSize,
  isLocked = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [playerDimensions, setPlayerDimensions] = useState({ width: 0, height: 0, scale: 1 });

  // Calculate optimal player size
  const calculatePlayerSize = useCallback(() => {
    if (!containerDimensions.width || !containerDimensions.height) {
      return { width: videoSize.width, height: videoSize.height, scale: 1 };
    }

    const containerAspect = containerDimensions.width / containerDimensions.height;
    const videoAspect = videoSize.width / videoSize.height;
    
    // Calculate scale to fit 80% of container while maintaining aspect ratio
    const maxWidth = containerDimensions.width * 0.8;
    const maxHeight = containerDimensions.height * 0.8;
    
    let scale = 1;
    
    if (videoAspect > containerAspect) {
      // Video is wider - scale based on width
      scale = Math.min(maxWidth / videoSize.width, 1);
    } else {
      // Video is taller - scale based on height  
      scale = Math.min(maxHeight / videoSize.height, 1);
    }

    // Ensure minimum size
    scale = Math.max(scale, 0.3);

    return {
      width: videoSize.width * scale,
      height: videoSize.height * scale,
      scale,
    };
  }, [containerDimensions, videoSize]);

  // Update container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();

    // Use native ResizeObserver for accurate tracking
    let resizeObserver: ResizeObserver | null = null;
    
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(containerRef.current);
    }

    // Fallback for window resize
    window.addEventListener('resize', updateDimensions);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Update player dimensions when container or video size changes
  useEffect(() => {
    const newDimensions = calculatePlayerSize();
    setPlayerDimensions(newDimensions);
  }, [calculatePlayerSize]);

  // Prevent scroll propagation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventScroll = (e: WheelEvent) => {
      // Always stop propagation to prevent parent scroll
      e.stopPropagation();
      
      // If locked, prevent default scroll behavior
      if (isLocked) {
        e.preventDefault();
      }
    };

    const preventTouch = (e: TouchEvent) => {
      if (isLocked && e.touches.length === 1) {
        e.preventDefault();
      }
    };

    container.addEventListener('wheel', preventScroll, { passive: false });
    container.addEventListener('touchmove', preventTouch, { passive: false });

    return () => {
      container.removeEventListener('wheel', preventScroll);
      container.removeEventListener('touchmove', preventTouch);
    };
  }, [isLocked]);

  return (
    <div
      ref={containerRef}
      className={`fixed-video-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Fixed Video Player - Completely transparent */}
      <div
        className={`fixed-video-player ${isLocked ? 'locked' : ''}`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: playerDimensions.width,
          height: playerDimensions.height,
          zIndex: 10,
          borderRadius: '0px',
          overflow: 'hidden',
          boxShadow: 'none',
          border: 'none',
          background: 'transparent',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'default',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FixedVideoContainer; 