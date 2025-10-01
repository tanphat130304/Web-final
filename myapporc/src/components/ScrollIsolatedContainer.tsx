import React, { useRef, useCallback, useState, useEffect } from 'react';
import './ScrollIsolatedContainer.css';

interface ScrollIsolatedContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (e: React.UIEvent) => void;
}

const ScrollIsolatedContainer: React.FC<ScrollIsolatedContainerProps> = ({
  children,
  className = '',
  style = {},
  onScroll
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Register wheel event listener with passive: false using useEffect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtTop = scrollTop <= 0;
      const isAtBottom = scrollTop >= scrollHeight - clientHeight - 1;
      
      // Prevent scroll propagation completely
      e.stopPropagation();
      
      // Only prevent default if trying to scroll beyond boundaries
      if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
        e.preventDefault();
        return;
      }
      
      // For internal scrolling, handle manually to ensure isolation
      e.preventDefault();
      container.scrollTop += e.deltaY;
    };

    // Add event listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);
  
  // Handle scroll events with isolation
  const handleScrollEvent = useCallback((e: React.UIEvent) => {
    e.stopPropagation();
    setIsScrolling(true);
    
    // Call parent onScroll if provided
    if (onScroll) {
      onScroll(e);
    }
    
    // Clear scrolling state after scroll ends
    const timer = setTimeout(() => setIsScrolling(false), 150);
    return () => clearTimeout(timer);
  }, [onScroll]);
  
  // Lock body scroll when scrolling in this container
  /*
  useEffect(() => {
    if (isScrolling) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = ''; // Ensure it's reset on unmount
    };
  }, [isScrolling]);
  */

  // Handle mouse enter/leave for scroll context
  const handleMouseEnter = useCallback(() => {
    setIsScrolling(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsScrolling(false);
  }, []);

  const containerStyle: React.CSSProperties = {
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'thin',
    scrollbarColor: '#6b7280 #1f2937',
    isolation: 'isolate',
    contain: 'layout style paint',
    ...style
  };

  return (
    <div 
      ref={scrollContainerRef}
      className={`overflow-y-auto overflow-x-hidden scroll-isolated-container ${className}`}
      style={containerStyle}
      onScroll={handleScrollEvent}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};

export default ScrollIsolatedContainer; 