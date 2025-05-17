import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface RadioButtonEffectProps {
  id: string;
  name: string;
  value: string;
  label: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  fontSize?: string;
}

export const RadioButtonEffect: React.FC<RadioButtonEffectProps> = ({
  id,
  name,
  value,
  label,
  checked,
  onChange,
  disabled,
  fontSize = '14px'
}) => {
  const radioRef = useRef<HTMLInputElement>(null);
  const rectsRef = useRef<SVGRectElement[]>([]);
  const labelRef = useRef<HTMLLabelElement>(null);

  useEffect(() => {
    if (checked) {
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
  }, [checked]);

  const animateRects = (isChecked: boolean) => {
    if (isChecked) {
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
        fill: "#76b3fa",
        overwrite: true
      });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange?.(e);
    }
  };

  return (
    <div className="radio-btn-group relative">
      <input
        ref={radioRef}
        type="radio"
        name={name}
        value={value}
        id={id}
        className="opacity-0 absolute"
        onChange={handleChange}
        checked={checked}
        disabled={disabled}
      />
      <label
        ref={labelRef}
        htmlFor={id}
        className={`
          relative flex items-center justify-center h-[28px] px-3 cursor-pointer
          font-mono text-xs font-medium text-white min-w-[80px]
          before:content-[''] before:absolute before:inset-0 
          before:bg-[#24252c] before:bg-[repeating-linear-gradient(0deg,#181a29,#181a29_1px,#202436_1px,#202436_2px)]
          before:rounded-md before:transition-all before:duration-300
          before:shadow-none hover:before:shadow-[0_0_8px_rgba(136,61,242,0.6)]
          ${checked ? 'before:shadow-[0_0_12px_rgba(136,61,242,0.8)] before:bg-[#2a2b32] opacity-100' : 'opacity-90'}
          ${disabled ? 'opacity-30 cursor-not-allowed hover:before:shadow-none' : ''}
        `}
        style={{ fontSize }}
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
                x="-100%"
                y={i * 2}
                width="100%"
                height="2"
                fill="#76b3fa"
                shapeRendering="crispEdges"
              />
            ))}
          </g>
        </svg>
      </label>
    </div>
  );
}; 