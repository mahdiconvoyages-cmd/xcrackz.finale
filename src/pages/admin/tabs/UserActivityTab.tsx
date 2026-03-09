// @ts-nocheck
import { useState, useEffect } from 'react';
import { Truck, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
}

interface Mission {
  id: string;
  title: string;
  status: string;
  created_at: string;
  pickup_city?: string;
  delivery_city?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  created_at: string;
}

export default function UserActivityTab({ user }: Props) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'missions' | 'invoices'>('missions');

  useEffect(() => {
    loadActivity();
  }, [user.id]);

  const loadActivity = async () => {
    const [missionsRes, invoicesRes] = await Promise.all([
      supabase.from('missions').select('id, reference, title, status, created_at, pickup_city, delivery_city, vehicle_brand, vehicle_model').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('invoices').select('id, invoice_number, total, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    ]);
    setMissions(missionsRes.data || []);
    setInvoices(invoicesRes.data || []);
    setLoading(false);
  };

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s === 'in_progress') return <Clock className="w-4 h-4 text-blue-500" />;
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
          <p className="text-2xl font-black text-blue-700">{missions.length}</p>
          <p className="text-xs font-semibold text-slate-500">Missions</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
          <p className="text-2xl font-black text-green-700">{missions.filter(m => m.status === 'completed').length}</p>
          <p className="text-xs font-semibold text-slate-500">Terminées</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
          <p className="text-2xl font-black text-amber-700">{invoices.length}</p>
          <p className="text-xs font-semibold text-slate-500">Factures</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setTab('missions')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition ${tab === 'missions' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Truck className="w-4 h-4" /> Missions ({missions.length})
        </button>
        <button
          onClick={() => setTab('invoices')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition ${tab === 'invoices' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText className="w-4 h-4" /> Factures ({invoices.length})
        </button>
      </div>

      {/* Content */}
      {tab === 'missions' ? (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {missions.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Aucune mission</p>
          ) : missions.map(m => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
              <div className="flex items-center gap-3">
                {statusIcon(m.status)}
                <div>
                  <p className="text-sm font-semibold text-slate-900">{m.title || 'Mission sans titre'}</p>
                  <p className="text-xs text-slate-500">
                    {[m.pickup_city, m.delivery_city].filter(Boolean).join(' → ') || '—'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  m.status === 'completed' ? 'bg-green-100 text-green-700' :
                  m.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{m.status?.toUpperCase()}</span>
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(m.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {invoices.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Aucune facture</p>
          ) : invoices.map(inv => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition">
              <div>
                <p className="text-sm font-semibold text-slate-900">{inv.invoice_number || 'N/A'}</p>
                <p className="text-xs text-slate-500">{new Date(inv.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900">{Number(inv.total || 0).toFixed(2)}€</p>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                  inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                  inv.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>{inv.status?.toUpperCase() || 'DRAFT'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
