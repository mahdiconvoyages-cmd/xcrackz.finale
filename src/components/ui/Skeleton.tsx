interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

/**
 * 🎨 Skeleton - Placeholder de chargement
 */
export default function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'shimmer'
}: SkeletonProps) {
  
  const variants: Record<string, string> = {
    text: 'rounded-md h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl'
  };
  
  const animations: Record<string, string> = {
    pulse: 'animate-pulse bg-slate-200',
    shimmer: 'bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] animate-shimmer',
    none: 'bg-slate-200'
  };
  
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? (variant === 'circular' ? width : undefined)
  };

  return (
    <div
      className={`
        ${variants[variant]}
        ${animations[animation]}
        ${className}
      `}
      style={style}
    />
  );
}

// Preset skeletons
Skeleton.Card = function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-6 border border-slate-100 ${className}`}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton height={80} variant="rounded" className="mb-4" />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} variant="rounded" />
        <Skeleton width={80} height={32} variant="rounded" />
      </div>
    </div>
  );
};

Skeleton.List = function SkeletonList({ 
  count = 5,
  className = '' 
}: { 
  count?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={10} />
          </div>
          <Skeleton width={60} height={28} variant="rounded" />
        </div>
      ))}
    </div>
  );
};

Skeleton.Stats = function SkeletonStats({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100">
          <Skeleton width={100} height={14} className="mb-3" />
          <Skeleton width={80} height={32} className="mb-2" />
          <Skeleton width={60} height={10} />
        </div>
      ))}
    </div>
  );
};
