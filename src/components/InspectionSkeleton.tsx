export default function InspectionSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 animate-pulse">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="h-10 w-10 bg-slate-700 rounded-xl"></div>
          <div className="h-8 w-48 bg-slate-700 rounded-lg"></div>
        </div>

        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-6 mb-6">
          <div className="h-6 w-32 bg-slate-700 rounded-lg mb-4"></div>
          <div className="grid grid-cols-6 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square bg-slate-700 rounded-xl"></div>
                <div className="h-3 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8">
          <div className="space-y-8">
            <div className="aspect-video bg-slate-700 rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/20 to-transparent animate-shimmer"></div>
            </div>

            <div className="space-y-4">
              <div className="h-4 w-3/4 bg-slate-700 rounded"></div>
              <div className="h-4 w-1/2 bg-slate-700 rounded"></div>
            </div>

            <div className="flex gap-3">
              <div className="h-12 flex-1 bg-slate-700 rounded-xl"></div>
              <div className="h-12 flex-1 bg-slate-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
