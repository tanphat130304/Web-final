import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';

interface ButtonEffectProps {
  type: 'upload' | 'cancel';
  onClick: () => void;
  disabled?: boolean;
}

export const ButtonEffect: React.FC<ButtonEffectProps> = ({
  type,
  onClick,
  disabled = false
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rectsRef = useRef<SVGRectElement[]>([]);

  useEffect(() => {
    if (disabled) {
      gsap.to(buttonRef.current, {
        opacity: 0.5,
        duration: 0.3,
        ease: "power2.out"
      });
    } else {
      gsap.to(buttonRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
      });
    }
  }, [disabled]);

  const animateRects = (isHover: boolean) => {
    if (isHover) {
      gsap.to(rectsRef.current, {
        duration: 0.4,
        ease: "power2.out",
        x: "100%",
        stagger: 0.01,
        fill: type === 'upload' ? "#883df2" : "#ef4444",
        overwrite: true
      });
    } else {
      gsap.to(rectsRef.current, {
        duration: 0.2,
        ease: "power2.out",
        x: "-100%",
        fill: "#ffffff",
        overwrite: true
      });
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center justify-center h-[32px] px-4 cursor-pointer
        font-mono text-xs font-medium text-white min-w-[100px]
        before:content-[''] before:absolute before:inset-0 
        before:bg-[#24252c] before:bg-[repeating-linear-gradient(0deg,#181a29,#181a29_1px,#202436_1px,#202436_2px)]
        before:rounded-md before:transition-all before:duration-300
        before:shadow-none hover:before:shadow-[0_0_8px_rgba(136,61,242,0.6)]
        ${type === 'upload' ? 'hover:before:shadow-[0_0_8px_rgba(136,61,242,0.6)]' : 'hover:before:shadow-[0_0_8px_rgba(239,68,68,0.6)]'}
        disabled:cursor-not-allowed disabled:opacity-50
      `}
      onMouseEnter={() => !disabled && animateRects(true)}
      onMouseLeave={() => !disabled && animateRects(false)}
    >
      <span className="z-[1] transition-colors duration-300 whitespace-nowrap text-white">
        {type === 'upload' ? 'Tải lên' : 'Huỷ'}
      </span>
      <svg
        height="100%"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute rounded-md overflow-hidden"
      >
        <g className="left">
          {[...Array(16)].map((_, i) => (
            <rect
              key={i}
              ref={el => {
                if (el) rectsRef.current[i] = el;
              }}
              x="-100%"
              y={i * 2}
              width="100%"
              height="2"
              fill="#ffffff"
              shapeRendering="crispEdges"
            />
          ))}
        </g>
      </svg>
    </button>
  );
}; 