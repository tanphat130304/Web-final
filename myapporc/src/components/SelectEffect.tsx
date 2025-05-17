import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface SelectEffectProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  title?: string;
}

export const SelectEffect: React.FC<SelectEffectProps> = ({
  id,
  value,
  onChange,
  options,
  title
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);
  const rectsRef = useRef<SVGRectElement[]>([]);
  const labelRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (value) {
      animateRects(true);
      gsap.to(labelRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
      });
    } else {
      animateRects(false);
      gsap.to(labelRef.current, {
        opacity: 0.9,
        duration: 0.3,
        ease: "power2.out"
      });
    }
  }, [value]);

  const animateRects = (isSelected: boolean) => {
    if (isSelected) {
      gsap.to(rectsRef.current, {
        duration: 0.4,
        ease: "power2.out",
        x: "100%",
        stagger: 0.01,
        fill: "#883df2",
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
    <div className="select-btn-group relative">
      <select
        ref={selectRef}
        id={id}
        value={value}
        onChange={onChange}
        className="
          absolute inset-0 w-full h-full cursor-pointer
          bg-transparent text-transparent
          border-none outline-none
          appearance-none
          z-10
        "
      >
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            className="
              bg-[#24252c] text-white
              font-mono text-xs font-medium
              py-2 px-3
              hover:bg-[#2a2b32]
              hover:shadow-[0_0_8px_rgba(136,61,242,0.6)]
              focus:bg-[#2a2b32]
              focus:shadow-[0_0_12px_rgba(136,61,242,0.8)]
              opacity-90
              hover:opacity-100
              focus:opacity-100
            "
          >
            {option.label}
          </option>
        ))}
      </select>
      <label
        ref={labelRef}
        htmlFor={id}
        className={`
          relative flex items-center justify-center h-[28px] px-3 cursor-pointer
          font-mono text-xs font-medium text-white min-w-[120px]
          before:content-[''] before:absolute before:inset-0 
          before:bg-[#24252c] before:bg-[repeating-linear-gradient(0deg,#181a29,#181a29_1px,#202436_1px,#202436_2px)]
          before:rounded-md before:transition-all before:duration-300
          before:shadow-none hover:before:shadow-[0_0_8px_rgba(136,61,242,0.6)]
          ${value ? 'before:shadow-[0_0_12px_rgba(136,61,242,0.8)] before:bg-[#2a2b32] opacity-100' : 'opacity-90'}
        `}
      >
        <span className="z-[1] transition-colors duration-300 whitespace-nowrap text-white">
          {options.find(opt => opt.value === value)?.label || title || 'Chọn ngôn ngữ'}
        </span>
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
        <svg
          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white z-20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </label>
    </div>
  );
}; 