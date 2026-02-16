export function CardSkeleton() {
  return (
    <div className="backdrop-blur-xl bg-white/70 border border-white/40 shadow-depth-lg rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 bg-slate-200 rounded-xl"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded"></div>
        <div className="h-3 bg-slate-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="backdrop-blur-xl bg-white/70 border border-white/40 shadow-depth-lg rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
        <div className="h-8 w-16 bg-slate-200 rounded"></div>
      </div>
      <div className="h-3 bg-slate-200 rounded w-2/3"></div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </>
  );
}
