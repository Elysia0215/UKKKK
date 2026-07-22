import React, { useRef, useState, useEffect } from 'react';

interface HoverScrollTextProps {
  text: string;
  className?: string;
}

export const HoverScrollText: React.FC<HoverScrollTextProps> = ({ text, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowDist, setOverflowDist] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const checkOverflow = () => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      if (textWidth > containerWidth) {
        setOverflowDist(textWidth - containerWidth + 12);
      } else {
        setOverflowDist(0);
      }
    }
  };

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  // Calculate keyframe timing: scroll time based on distance + 3s pause + 0.4s reset
  const scrollTime = Math.max(1.5, overflowDist / 55); // seconds to scroll (slightly faster)
  const pauseTime = 3; // 3 seconds pause at the end
  const resetTime = 0.4; // time to reset
  const totalTime = scrollTime + pauseTime + resetTime;

  const scrollPct = (scrollTime / totalTime) * 100;
  const pausePct = ((scrollTime + pauseTime) / totalTime) * 100;

  const keyframesStyle = `
    @keyframes marqueeHover_${Math.round(overflowDist)} {
      0% { transform: translateX(0px); }
      ${scrollPct.toFixed(1)}% { transform: translateX(-${overflowDist}px); }
      ${pausePct.toFixed(1)}% { transform: translateX(-${overflowDist}px); }
      100% { transform: translateX(0px); }
    }
  `;

  return (
    <div 
      ref={containerRef}
      onMouseEnter={() => {
        checkOverflow();
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className="overflow-hidden whitespace-nowrap relative w-full"
      title={text}
    >
      <style>{keyframesStyle}</style>
      <span
        ref={textRef}
        className={`inline-block ${className} ${overflowDist === 0 ? 'truncate block w-full' : ''}`}
        style={{
          animation: isHovered && overflowDist > 0 
            ? `marqueeHover_${Math.round(overflowDist)} ${totalTime.toFixed(2)}s linear infinite` 
            : 'none',
          transform: isHovered && overflowDist > 0 ? undefined : 'translateX(0px)'
        }}
      >
        {text}
      </span>
    </div>
  );
};
