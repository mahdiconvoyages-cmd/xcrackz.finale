import { useEffect, useState, useRef } from 'react';

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export default function CountUp({ end, duration = 2000, className = '', suffix = '', prefix = '' }: CountUpProps) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
      countRef.current = Math.floor(easeOutQuart * end);
      setCount(countRef.current);

      if (percentage < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);

    return () => {
      startTimeRef.current = null;
    };
  }, [end, duration]);

  return (
    <span className={className}>
      {prefix}{count.toLocaleString('fr-FR')}{suffix}
    </span>
  );
}
