import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, delay = 300, position = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<number>();
  const targetRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setShow(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShow(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full mt-2 left-1/2 -translate-x-1/2';
      case 'left':
        return 'right-full mr-2 top-1/2 -translate-y-1/2';
      case 'right':
        return 'left-full ml-2 top-1/2 -translate-y-1/2';
      default:
        return 'bottom-full mb-2 left-1/2 -translate-x-1/2';
    }
  };

  return (
    <div
      ref={targetRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {show && (
        <div
          className={`absolute ${getPositionClasses()} z-50 animate-in fade-in zoom-in duration-200`}
        >
          <div className="backdrop-blur-xl bg-slate-900/95 border border-white/20 text-white text-sm px-3 py-2 rounded-lg shadow-depth-xl whitespace-nowrap">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
