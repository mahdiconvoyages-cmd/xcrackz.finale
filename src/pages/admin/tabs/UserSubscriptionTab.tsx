// @ts-nocheck
import { useState } from 'react';
import { Package, Edit3, X, Clock, Zap, Plus } from 'lucide-react';
import { UserProfile, ShopPlan, PLAN_COLORS, STATUS_COLORS, formatDate, getDaysRemaining, getSubStatusLabel } from '../types';

interface Props {
  user: UserProfile;
  shopPlans: ShopPlan[];
  onGrant: (params: { user: UserProfile; plan: string; duration: string; autoRenew: boolean; customCredits: string; shopPlans: ShopPlan[] }) => Promise<boolean>;
  onCancel: (user: UserProfile) => Promise<void>;
  onExpire: (user: UserProfile) => Promise<void>;
  onToggleAutoRenew: (user: UserProfile) => Promise<void>;
}

export default function UserSubscriptionTab({ user, shopPlans, onGrant, onCancel, onExpire, onToggleAutoRenew }: Props) {
  const [editing, setEditing] = useState(false);
  const [subPlan, setSubPlan] = useState(user.subscription?.plan || 'pro');
  const [subDuration, setSubDuration] = useState('365');
  const [subAutoRenew, setSubAutoRenew] = useState(true);
  const [subCustomCredits, setSubCustomCredits] = useState('');
  const [saving, setSaving] = useState(false);

  const daysLeft = getDaysRemaining(user.subscription?.current_period_end);

  const handleGrant = async () => {
    setSaving(true);
    const ok = await onGrant({ user, plan: subPlan, duration: subDuration, autoRenew: subAutoRenew, customCredits: subCustomCredits, shopPlans });
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Current subscription info */}
      {user.subscription ? (
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-6 border border-teal-200/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-teal-500" /> Abonnement actuel
            </h4>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${PLAN_COLORS[user.subscription.plan] || PLAN_COLORS.free}`}>
                {user.subscription.plan.toUpperCase()}
              </span>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${STATUS_COLORS[user.subscription.status] || STATUS_COLORS.expired}`}>
                {getSubStatusLabel(user.subscription.status)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/60 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Début</p>
              <p className="text-sm font-black text-slate-900">{formatDate(user.subscription.current_period_start)}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Expiration</p>
              <p className="text-sm font-black text-slate-900">{formatDate(user.subscription.current_period_end)}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Paiement</p>
              <p className="text-sm font-semibold text-slate-900">{user.subscription.payment_method || '—'}</p>
            </div>
            <div className="bg-white/60 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Auto-renew</p>
              <p className="text-sm font-black text-slate-900">{user.subscription.auto_renew ? '✅ Activé' : '❌ Désactivé'}</p>
            </div>
          </div>

          {daysLeft !== null && (
            <div className={`p-3 rounded-xl text-center font-bold text-sm mb-4 ${daysLeft < 0 ? 'bg-red-100 text-red-700' : daysLeft < 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {daysLeft < 0 ? `Expiré depuis ${-daysLeft} jour${-daysLeft > 1 ? 's' : ''}` : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEditing(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-teal-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-600 transition">
              <Edit3 className="w-4 h-4" /> Modifier
            </button>
            <button onClick={() => onToggleAutoRenew(user)} className="flex items-center gap-1.5 bg-yellow-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-600 transition">
              <Zap className="w-4 h-4" /> {user.subscription.auto_renew ? 'Désact.' : 'Act.'} renew
            </button>
            {user.subscription.status === 'active' && (
              <>
                <button onClick={() => onCancel(user)} className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition">
                  <X className="w-4 h-4" /> Annuler
                </button>
                <button onClick={() => onExpire(user)} className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-red-600 transition">
                  <Clock className="w-4 h-4" /> Expirer
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold mb-4">Aucun abonnement</p>
          <button onClick={() => setEditing(true)} className="bg-gradient-to-r from-teal-500 to-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition">
            <Plus className="w-4 h-4 inline mr-2" /> Attribuer un abonnement
          </button>
        </div>
      )}

      {/* ─── Edit / Grant Form ──────────────────────────────────────────────── */}
      {editing && (
        <div className="bg-white rounded-2xl p-6 border-2 border-teal-300 shadow-lg space-y-4">
          <h4 className="text-lg font-black text-slate-900">
            {user.subscription ? '📦 Modifier l\'abonnement' : '📦 Attribuer un abonnement'}
          </h4>

          {/* Plan selector */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Plan</label>
            <div className="grid grid-cols-2 gap-2">
              {shopPlans.map(p => (
                <button
                  key={p.name}
                  onClick={() => setSubPlan(p.name)}
                  className={`p-3 rounded-xl border-2 text-left transition ${subPlan === p.name
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-black text-slate-900 uppercase">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.name === 'enterprise' ? 'Sur devis' : `${p.credits_amount} cr · ${p.price}€`}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Enterprise custom credits */}
          {subPlan === 'enterprise' && (
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200 space-y-2">
              <label className="block text-sm font-bold text-purple-700">🏢 Crédits sur mesure (obligatoire)</label>
              <input type="number" value={subCustomCredits} onChange={e => setSubCustomCredits(e.target.value)} min="1" placeholder="Ex: 200, 500, 1000..." autoFocus
                className="w-full px-4 py-2.5 border border-purple-300 rounded-xl font-bold text-lg focus:ring-2 focus:ring-purple-300 focus:border-purple-500" />
              <p className="text-xs text-purple-500">Définissez le nombre de crédits personnalisé pour ce client Enterprise.</p>
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Durée</label>
            <div className="flex gap-2">
              {[{ d: 30, l: '1m' }, { d: 90, l: '3m' }, { d: 180, l: '6m' }, { d: 365, l: '1 an' }, { d: 730, l: '2 ans' }].map(({ d, l }) => (
                <button
                  key={d}
                  onClick={() => setSubDuration(String(d))}
                  className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition ${subDuration === String(d)
                    ? 'bg-teal-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={subDuration}
              onChange={e => setSubDuration(e.target.value)}
              min="1"
              className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium mt-2"
              placeholder="Ou saisir un nombre de jours..."
            />
          </div>

          {/* Auto-renew */}
          <label className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition">
            <input type="checkbox" checked={subAutoRenew} onChange={e => setSubAutoRenew(e.target.checked)} className="w-4 h-4 text-yellow-600 rounded" />
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-semibold text-slate-700">Renouvellement automatique</span>
          </label>

          {/* Preview */}
          <div className="bg-teal-50 rounded-xl p-3 space-y-1">
            <p className="text-xs font-bold text-teal-700">Récapitulatif :</p>
            <p className="text-sm text-slate-700">
              Plan <strong>{subPlan.toUpperCase()}</strong> · {subDuration} jours
              {(() => {
                const pi = shopPlans.find(p => p.name === subPlan);
                const cr = subPlan === 'enterprise' ? (parseInt(subCustomCredits) || 0) : (pi?.credits_amount || 0);
                return cr > 0 ? ` · +${cr} crédits` : '';
              })()}
              {subAutoRenew ? ' · Auto-renew' : ''}
            </p>
            <p className="text-xs text-slate-500">Expire le {new Date(Date.now() + parseInt(subDuration || '365') * 86400000).toLocaleDateString('fr-FR')}</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={() => setEditing(false)} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
            <button onClick={handleGrant} disabled={saving} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white font-bold rounded-xl hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'En cours...' : 'Confirmer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
