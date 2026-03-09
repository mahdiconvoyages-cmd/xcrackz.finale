// @ts-nocheck
import { Users } from 'lucide-react';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
}

export default function UserReferralTab({ user }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200/50">
        <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-500" /> Parrainage
        </h4>

        <div className="space-y-4">
          {/* Referral code */}
          <div className="flex items-center justify-between bg-white/60 rounded-xl p-4">
            <span className="text-sm text-slate-600 font-semibold">Code parrainage</span>
            <span className="font-mono font-bold text-purple-700 bg-purple-100 px-4 py-1.5 rounded-lg text-sm select-all">
              {user.referral_code || '—'}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/60 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-purple-700">{user.referral_count || 0}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Filleul(s) amenés</p>
            </div>
            <div className="bg-white/60 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-amber-600">{(user.referral_count || 0) * 10}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Crédits gagnés</p>
            </div>
          </div>

          {/* Referred by */}
          {user.referred_by_name && (
            <div className="flex items-center justify-between bg-white/60 rounded-xl p-4">
              <span className="text-sm text-slate-600 font-semibold">Parrainé par</span>
              <span className="font-semibold text-indigo-700">{user.referred_by_name}</span>
            </div>
          )}

          {/* Reward info */}
          {(user.referral_count || 0) > 0 && (
            <div className="bg-purple-100/60 rounded-xl p-4 text-sm text-purple-700 space-y-1">
              <p className="font-bold">💰 Récapitulatif des récompenses</p>
              <p>Chaque filleul qui souscrit un abonnement = <strong>+10 crédits</strong> pour le parrain ET le filleul.</p>
              <p>Total estimé : <strong>{(user.referral_count || 0) * 10} crédits</strong> distribués via parrainage.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
