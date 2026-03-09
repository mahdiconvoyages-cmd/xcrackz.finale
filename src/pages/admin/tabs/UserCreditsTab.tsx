// @ts-nocheck
import { useState, useEffect } from 'react';
import { CreditCard, Plus, Minus, ArrowUpDown, Clock } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { UserProfile, formatDate } from '../types';

interface Props {
  user: UserProfile;
  onCreditAction: (user: UserProfile, mode: 'add' | 'remove', amount: number, reason: string) => Promise<void>;
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  balance_after: number;
  created_at: string;
}

export default function UserCreditsTab({ user, onCreditAction }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'remove' | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [user.id]);

  const loadTransactions = async () => {
    const { data } = await supabase
      .from('credit_transactions')
      .select('id, amount, transaction_type, description, balance_after, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!mode) return;
    const a = parseInt(amount);
    if (isNaN(a) || a <= 0) return;
    await onCreditAction(user, mode, a, reason);
    setMode(null);
    setAmount('');
    setReason('');
    loadTransactions();
  };

  return (
    <div className="space-y-6">
      {/* Balance */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200/50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" /> Solde actuel
          </h4>
          <span className="text-4xl font-black text-amber-600">{user.credits}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('add')}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-green-600 transition"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
          <button
            onClick={() => setMode('remove')}
            className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-red-600 transition"
          >
            <Minus className="w-4 h-4" /> Retirer
          </button>
        </div>
      </div>

      {/* Add/Remove form */}
      {mode && (
        <div className="bg-white rounded-2xl p-5 border-2 border-teal-300 shadow-lg space-y-3">
          <h4 className="text-lg font-black text-slate-900">
            {mode === 'add' ? '➕ Ajouter des crédits' : '➖ Retirer des crédits'}
          </h4>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Montant</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" placeholder="10" autoFocus
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium text-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Raison (optionnel)</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Bonus fidélité..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-200 focus:border-teal-500 font-medium text-sm" />
          </div>
          {amount && !isNaN(parseInt(amount)) && (
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <p className="text-sm text-slate-600">Nouveau solde: <strong className="text-lg">{mode === 'add' ? user.credits + parseInt(amount) : Math.max(0, user.credits - parseInt(amount))}</strong></p>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => { setMode(null); setAmount(''); setReason(''); }} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition">Annuler</button>
            <button onClick={handleSubmit} className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl hover:shadow-lg transition ${mode === 'add' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-pink-600'}`}>
              {mode === 'add' ? 'Ajouter' : 'Retirer'}
            </button>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" /> Historique des transactions
          </h4>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent mx-auto" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Aucune transaction</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{tx.description}</p>
                  <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-[10px] text-slate-400">Solde: {tx.balance_after}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
