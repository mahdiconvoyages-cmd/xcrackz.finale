export const glassCard = "backdrop-blur-xl bg-white/70 border border-white/40 shadow-xl shadow-slate-200/50 rounded-2xl hover:shadow-2xl transition-all duration-300";

export const glassInput = "backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition";

export const glassButton = "backdrop-blur-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-teal-500/50 transition-all duration-300 hover:-translate-y-1";

export const glassModal = "backdrop-blur-2xl bg-white/90 border border-white/60 shadow-2xl shadow-slate-300/50 rounded-2xl";

export const glassStatCard = (colorFrom: string, colorTo: string) =>
  `backdrop-blur-xl bg-gradient-to-br ${colorFrom} ${colorTo} border border-white/40 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`;

export const glassTitle = "text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent";

export const glassSubtitle = "text-slate-600 text-lg";

export const glassListItem = "backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl hover:bg-white/80 hover:shadow-xl transition-all duration-300 hover:-translate-y-1";
