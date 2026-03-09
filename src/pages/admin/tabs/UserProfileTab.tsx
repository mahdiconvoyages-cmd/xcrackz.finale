// @ts-nocheck
import { useState } from 'react';
import { UserProfile, ShopPlan, PLAN_COLORS, STATUS_COLORS, formatDate, getDaysRemaining, getSubStatusLabel } from '../types';
import { Phone, Building2, Hash, MapPin, Calendar, Clock, Zap } from 'lucide-react';

interface Props {
  user: UserProfile;
}

export default function UserProfileTab({ user }: Props) {
  const formatDateTime = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-teal-500/20">
          {user.full_name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-900">{user.full_name || '—'}</h3>
          <p className="text-sm text-slate-500">{user.email}</p>
          <div className="flex gap-1.5 mt-2">
            {user.is_admin && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">ADMIN</span>}
            {user.is_verified && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-100 text-green-700">VÉRIFIÉ</span>}
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${user.user_type === 'driver' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {user.user_type === 'driver' ? 'CHAUFFEUR' : 'CLIENT'}
            </span>
            {user.fcm_token && <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">PUSH</span>}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Hash, label: 'ID', value: user.id.slice(0, 8) + '…', full: user.id },
          { icon: Phone, label: 'Téléphone', value: user.phone || '—' },
          { icon: Building2, label: 'Entreprise', value: user.company_name || '—' },
          { icon: Hash, label: 'SIRET', value: user.company_siret || '—' },
          { icon: MapPin, label: 'Ville', value: user.base_city || '—' },
          { icon: Calendar, label: 'Inscrit', value: formatDate(user.created_at) },
          { icon: Clock, label: 'Dernière MAJ', value: formatDateTime(user.updated_at) },
          { icon: Zap, label: 'Push FCM', value: user.fcm_token ? 'Activé' : 'Non' },
        ].map((item, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex items-center gap-1.5 mb-1">
              <item.icon className="w-3 h-3 text-slate-400" />
              <p className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</p>
            </div>
            <p className="text-sm font-semibold text-slate-900 truncate" title={item.full || item.value}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Subscription quick view */}
      {user.subscription && (
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-5 border border-teal-200/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-900">Abonnement actuel</h4>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${PLAN_COLORS[user.subscription.plan] || PLAN_COLORS.free}`}>
                {user.subscription.plan.toUpperCase()}
              </span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${STATUS_COLORS[user.subscription.status] || STATUS_COLORS.expired}`}>
                {getSubStatusLabel(user.subscription.status)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Crédits</p>
              <p className="text-2xl font-black text-amber-600">{user.credits}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Début</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(user.subscription.current_period_start)}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Expiration</p>
              <p className="text-sm font-semibold text-slate-900">{formatDate(user.subscription.current_period_end)}</p>
            </div>
          </div>
          {(() => {
            const dl = getDaysRemaining(user.subscription.current_period_end);
            if (dl === null) return null;
            return (
              <div className={`mt-3 p-3 rounded-xl text-center font-bold text-sm ${dl < 0 ? 'bg-red-100 text-red-700' : dl < 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {dl < 0 ? `Expiré depuis ${-dl} jour${-dl > 1 ? 's' : ''}` : `${dl} jour${dl > 1 ? 's' : ''} restant${dl > 1 ? 's' : ''}`}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
