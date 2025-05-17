import React, { useRef } from 'react';
import gsap from 'gsap';
import useLayoutStore from "../pages/editor/store/use-layout-store";

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  variant: 'tree' | 'pink' | 'green' | 'blue' | 'red';
}

const VARIANTS = {
  tree: {
    fill: '#526613',
    hover: '#36430D',
    shadow: 'rgba(59, 130, 246, 0.6)'
  },
  pink: {
    fill: '#F97316',
    hover: '#EA580C',
    shadow: 'rgba(249, 115, 22, 0.6)'
  },
  green: {
    fill: '#22C55E',
    hover: '#16A34A',
    shadow: 'rgba(34, 197, 94, 0.6)'
  },
  blue: {
    fill: '#0DB0E7',
    hover: '#094559',
    shadow: 'rgba(30, 64, 175, 0.6)'
  },
  red: {
    fill: '#BB1313',
    hover: '#811212',
    shadow: 'rgba(255, 7, 7, 0.6)'
  }
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  variant
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rectsRef = useRef<SVGRectElement[]>([]);
  const colors = VARIANTS[variant];
  const { setActiveMenuItem } = useLayoutStore();

  const handleClick = () => {
    if (label === "Hủy") {
      const container = buttonRef.current?.closest(".modal-container");
      if (container) {
        container.classList.add("closing");
        setTimeout(() => {
          setActiveMenuItem(null);
        }, 150);
      }
    }
    onClick?.();
  };

  const handleMouseEnter = () => {
    gsap.to(rectsRef.current, {
      duration: 0.4,
      ease: "power2.out",
      fill: colors.hover,
      overwrite: true
    });
  };

  const handleMouseLeave = () => {
    gsap.to(rectsRef.current, {
      duration: 0.2,
      ease: "power2.out",
      fill: colors.fill,
      overwrite: true
    });
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors
        relative h-[28px] px-3 font-mono min-w-[80px]
        before:content-[''] before:absolute before:inset-0 
        before:bg-[#24252c] before:bg-[repeating-linear-gradient(0deg,#181a29,#181a29_1px,#202436_1px,#202436_2px)]
        before:rounded-md before:transition-all before:duration-300
        before:shadow-[0_0_8px_${colors.shadow}]
        hover:before:shadow-[0_0_12px_${colors.shadow}]
      `}
    >
      <span className="z-[1] transition-colors duration-300 whitespace-nowrap text-white">{label}</span>
      <svg
        height="100%"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute rounded-md overflow-hidden"
      >
        <g className="left">
          {[...Array(14)].map((_, i) => (
            <rect
              key={i}
              ref={el => {
                if (el) rectsRef.current[i] = el;
              }}
              x="0"
              y={i * 2}
              width="100%"
              height="2"
              fill={colors.fill}
              shapeRendering="crispEdges"
            />
          ))}
        </g>
      </svg>
    </button>
  );
}; 