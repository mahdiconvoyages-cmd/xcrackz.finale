// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Shield, Trash2, Download, CreditCard,
  Package, ChevronLeft, ChevronRight, Eye, X,
  Plus, Minus, Clock, ArrowUpDown, RefreshCw, Filter,
  MapPin, Zap, BadgeCheck
} from 'lucide-react';
import { showToast } from '../../components/Toast';
import { useAdminUsers } from './hooks/useAdminUsers';
import { useSubscriptionActions } from './hooks/useSubscriptionActions';
import { PAGE_SIZES, PLAN_COLORS, STATUS_COLORS, formatDate, getDaysRemaining } from './types';

export default function AdminUserList() {
  const navigate = useNavigate();
  const {
    loading, refreshing, shopPlans,
    filteredUsers, paginatedUsers, totalPages, stats,
    search, setSearch,
    planFilter, setPlanFilter,
    typeFilter, setTypeFilter,
    statusFilter, setStatusFilter,
    toggleSort,
    page, setPage,
    pageSize, setPageSize,
    loadUsers, handleRefresh, exportCSV,
  } = useAdminUsers();

  const { toggleAdmin, toggleVerified, deleteUser, handleCreditAction } = useSubscriptionActions(loadUsers);

  // Credit modal
  const [creditModal, setCreditModal] = useState<{ user: any; mode: 'add' | 'remove' } | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');

  const onCreditAction = async () => {
    if (!creditModal) return;
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) return showToast('warning', 'Montant invalide');
    await handleCreditAction(creditModal.user, creditModal.mode, amount, creditReason);
    setCreditModal(null);
    setCreditAmount('');
    setCreditReason('');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-teal-500" />
            Gestion Utilisateurs
          </h1>
          <p className="text-slate-500 mt-1">
            {stats.total} comptes · {stats.totalCredits} crédits · {stats.activeSubs} abonnements actifs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className={`p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition ${refreshing ? 'animate-spin' : ''}`} title="Actualiser">
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-green-500/25 transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total', value: stats.total, icon: Users, gradient: 'from-slate-600 to-slate-700' },
          { label: 'Crédits', value: stats.totalCredits, icon: CreditCard, gradient: 'from-amber-500 to-orange-500' },
          { label: 'Avec crédits', value: stats.withCredits, icon: Plus, gradient: 'from-blue-500 to-cyan-500' },
          { label: 'Abo. actifs', value: stats.activeSubs, icon: Package, gradient: 'from-emerald-500 to-green-600' },
          { label: 'Expirés', value: stats.expiredSubs, icon: Clock, gradient: 'from-red-500 to-pink-500' },
          { label: 'Admins', value: stats.admins, icon: Shield, gradient: 'from-purple-500 to-indigo-500' },
          { label: 'Vérifiés', value: stats.verified, icon: BadgeCheck, gradient: 'from-teal-500 to-cyan-500' },
          { label: 'Chauffeurs', value: stats.drivers, icon: MapPin, gradient: 'from-sky-500 to-blue-500' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:shadow-md transition-all group">
            <div className={`p-2 bg-gradient-to-br ${c.gradient} rounded-lg w-fit shadow-sm mb-2`}>
              <c.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-black text-slate-900">{c.value}</p>
            <p className="text-[11px] font-semibold text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[280px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, entreprise, téléphone, ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium text-sm"
            />
          </div>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm min-w-[130px]">
            <option value="all">Tous plans</option>
            {shopPlans.map(p => <option key={p.name} value={p.name}>{p.name.toUpperCase()}</option>)}
            <option value="none">Sans plan actif</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
            <option value="all">Tous types</option>
            <option value="client">Clients</option>
            <option value="driver">Chauffeurs</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl bg-white font-medium text-sm">
            <option value="all">Tous statuts</option>
            <option value="verified">Vérifiés</option>
            <option value="admin">Admins</option>
            <option value="with_credits">Avec crédits</option>
            <option value="no_credits">Sans crédits</option>
            <option value="expired">Abo. expiré</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 mt-2 flex items-center gap-2">
          <Filter className="w-3 h-3" />
          {filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">
                  <button onClick={() => toggleSort('full_name')} className="flex items-center gap-1 hover:text-teal-600 transition">
                    Utilisateur <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Type</th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">
                  <button onClick={() => toggleSort('credits')} className="flex items-center gap-1 hover:text-teal-600 transition">
                    Crédits <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Abonnement</th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Badges</th>
                <th className="text-left py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-teal-600 transition">
                    Inscrit <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right py-3.5 px-4 font-bold text-xs text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Users className="w-14 h-14 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-semibold text-lg">Aucun utilisateur</p>
                    <p className="text-sm text-slate-300 mt-1">Modifiez vos filtres</p>
                  </td>
                </tr>
              )}
              {paginatedUsers.map(user => {
                const daysLeft = getDaysRemaining(user.subscription?.current_period_end);
                return (
                  <tr key={user.id} className="hover:bg-teal-50/30 transition-colors cursor-pointer group" onClick={() => navigate(`/admin/users/${user.id}`)}>
                    {/* User */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                          {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">{user.full_name || '—'}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{user.email}</p>
                          {user.company_name && <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{user.company_name}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${user.user_type === 'driver' ? 'bg-sky-100 text-sky-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {user.user_type === 'driver' ? 'CHAUFFEUR' : 'CLIENT'}
                      </span>
                    </td>

                    {/* Credits */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-black ${user.credits > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                          {user.credits}
                        </span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setCreditModal({ user, mode: 'add' })} className="p-1 hover:bg-green-100 rounded-lg transition" title="Ajouter">
                            <Plus className="w-3.5 h-3.5 text-green-600" />
                          </button>
                          <button onClick={() => setCreditModal({ user, mode: 'remove' })} className="p-1 hover:bg-red-100 rounded-lg transition" title="Retirer">
                            <Minus className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Subscription */}
                    <td className="py-3.5 px-4">
                      {user.subscription?.status === 'active' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${PLAN_COLORS[user.subscription.plan] || PLAN_COLORS.free}`}>
                              {user.subscription.plan.toUpperCase()}
                            </span>
                            {user.subscription.auto_renew && (
                              <Zap className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          {daysLeft !== null && (
                            <p className={`text-[10px] font-semibold ${daysLeft < 0 ? 'text-red-500' : daysLeft < 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {daysLeft < 0 ? `Expiré il y a ${-daysLeft}j` : `${daysLeft}j restants`}
                            </p>
                          )}
                        </div>
                      ) : user.subscription?.status === 'expired' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-600">EXPIRÉ</span>
                      ) : user.subscription?.status === 'canceled' ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-600">ANNULÉ</span>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">—</span>
                      )}
                    </td>

                    {/* Badges */}
                    <td className="py-3.5 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {user.is_admin && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-red-100 text-red-700">ADMIN</span>}
                        {user.is_verified && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-green-100 text-green-700">VÉRIFIÉ</span>}
                        {user.fcm_token && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-blue-100 text-blue-700">PUSH</span>}
                        {(user.referral_count || 0) > 0 && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-purple-100 text-purple-700" title={`${user.referral_count} filleul(s)`}>🤝 {user.referral_count}</span>}
                        {user.referred_by_name && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-indigo-100 text-indigo-700" title={`Parrainé par ${user.referred_by_name}`}>PARRAINÉ</span>}
                      </div>
                    </td>

                    {/* Created */}
                    <td className="py-3.5 px-4">
                      <p className="text-xs text-slate-600 font-medium">{formatDate(user.created_at)}</p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/admin/users/${user.id}`)} className="p-1.5 hover:bg-teal-50 rounded-lg transition" title="Détails">
                          <Eye className="w-4 h-4 text-teal-600" />
                        </button>
                        <button onClick={() => toggleAdmin(user)} className={`p-1.5 rounded-lg transition ${user.is_admin ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'hover:bg-slate-100 text-slate-400'}`} title={user.is_admin ? 'Retirer admin' : 'Rendre admin'}>
                          <Shield className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleVerified(user)} className={`p-1.5 rounded-lg transition ${user.is_verified ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'hover:bg-slate-100 text-slate-400'}`} title={user.is_verified ? 'Retirer vérification' : 'Vérifier'}>
                          <BadgeCheck className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteUser(user)} className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-400 hover:text-red-600" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="font-medium">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredUsers.length)} sur {filteredUsers.length}</span>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="px-2 py-1 border border-slate-200 rounded-lg text-xs font-medium bg-white">
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}/page</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition text-xs font-bold text-slate-500">1</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pn;
              if (totalPages <= 5) pn = i + 1;
              else if (page <= 3) pn = i + 1;
              else if (page >= totalPages - 2) pn = totalPages - 4 + i;
              else pn = page - 2 + i;
              return (
                <button key={pn} onClick={() => setPage(pn)} className={`w-8 h-8 rounded-lg text-xs font-bold transition ${page === pn ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'hover:bg-slate-200 text-slate-600'}`}>{pn}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition text-xs font-bold text-slate-500">{totalPages}</button>
          </div>
        </div>
      </div>

      {/* ─── Credit Modal ───────────────────────────────────────────────────── */}
      {creditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setCreditModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 mb-1">
              {creditModal.mode === 'add' ? '➕ Ajouter des crédits' : '➖ Retirer des crédits'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">{creditModal.user.email} — Solde actuel: <strong>{creditModal.user.credits}</strong></p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Montant</label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={e => setCreditAmount(e.target.value)}
                  min="1"
                  placeholder="10"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium text-lg"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Raison (optionnel)</label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={e => setCreditReason(e.target.value)}
                  placeholder="Ex: Bonus fidélité, correction erreur..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium text-sm"
                />
              </div>
              {creditAmount && !isNaN(parseInt(creditAmount)) && (
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-sm text-slate-600">Nouveau solde: <strong className="text-lg">{creditModal.mode === 'add' ? creditModal.user.credits + parseInt(creditAmount) : Math.max(0, creditModal.user.credits - parseInt(creditAmount))}</strong></p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setCreditModal(null); setCreditAmount(''); setCreditReason(''); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
              <button
                onClick={onCreditAction}
                className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl hover:shadow-lg transition ${creditModal.mode === 'add' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}
              >
                {creditModal.mode === 'add' ? 'Ajouter' : 'Retirer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
