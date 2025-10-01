import React from 'react';
import { AbsoluteFill } from 'remotion';

export type SlideDirection = 'from-left' | 'from-right' | 'from-top' | 'from-bottom';

// Basic transition implementations
export const fade = () => ({
  enterStyle: { opacity: 0 },
  exitStyle: { opacity: 1 },
});

export const slide = ({ direction = 'from-left' }: { direction?: SlideDirection }) => {
  const transforms = {
    'from-left': 'translateX(-100%)',
    'from-right': 'translateX(100%)',
    'from-top': 'translateY(-100%)',
    'from-bottom': 'translateY(100%)',
  };
  
  return {
    enterStyle: { transform: transforms[direction] },
    exitStyle: { transform: 'translateX(0)' },
  };
};

export const wipe = ({ direction = 'from-left' }: { direction?: SlideDirection }) => {
  return {
    enterStyle: { clipPath: 'inset(0 100% 0 0)' },
    exitStyle: { clipPath: 'inset(0 0 0 0)' },
  };
};

export const flip = () => ({
  enterStyle: { transform: 'rotateY(90deg)' },
  exitStyle: { transform: 'rotateY(0deg)' },
});

export const clockWipe = ({ width, height }: { width: number; height: number }) => ({
  enterStyle: { clipPath: 'polygon(50% 50%, 50% 0%, 50% 0%, 50% 50%)' },
  exitStyle: { clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%, 50% 50%)' },
});

export const star = ({ width, height }: { width: number; height: number }) => ({
  enterStyle: { clipPath: 'polygon(50% 0%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)' },
  exitStyle: { clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' },
});

export const circle = ({ width, height }: { width: number; height: number }) => ({
  enterStyle: { clipPath: 'circle(0% at 50% 50%)' },
  exitStyle: { clipPath: 'circle(100% at 50% 50%)' },
});

export const rectangle = ({ width, height }: { width: number; height: number }) => ({
  enterStyle: { clipPath: 'inset(50% 50% 50% 50%)' },
  exitStyle: { clipPath: 'inset(0% 0% 0% 0%)' },
});

export const slidingDoors = ({ width, height }: { width: number; height: number }) => ({
  enterStyle: { clipPath: 'inset(0 50% 0 50%)' },
  exitStyle: { clipPath: 'inset(0 0% 0 0%)' },
});

export const linearTiming = ({ durationInFrames }: { durationInFrames: number }) => ({
  durationInFrames,
  easing: 'linear' as const,
});

// TransitionSeries component
export const TransitionSeries = {
  Transition: ({ 
    children, 
    presentation, 
    timing 
  }: { 
    children?: React.ReactNode;
    presentation: any;
    timing: any;
  }) => {
    return (
      <AbsoluteFill>
        {children}
      </AbsoluteFill>
    );
  }
}; 