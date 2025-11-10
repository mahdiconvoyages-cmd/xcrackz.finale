// @ts-nocheck
import { useEffect, useState } from 'react';
import { ShoppingCart, Send, CheckCircle, XCircle, Clock, User, Mail, Phone, MessageCircle, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QuoteRequest {
  id: string;
  user_id: string;
  company_name: string;
  email: string;
  phone: string;
  expected_volume: string;
  message: string;
  status: 'pending' | 'contacted' | 'quoted' | 'closed' | 'rejected';
  admin_notes?: string;
  package_id?: string;
  created_at: string;
  updated_at: string;
  responded_at?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
}

export default function AdminShopRequests() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'contacted' | 'quoted' | 'closed'>('all');

  useEffect(() => {
    loadRequests();

    // Realtime updates
    const channel = supabase
      .channel('admin-shop-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shop_quote_requests' },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const loadRequests = async () => {
    try {
      let query = supabase
        .from('shop_quote_requests')
        .select(`
          *,
          profiles:user_id (first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId: string, newStatus: QuoteRequest['status'], notes?: string) => {
    try {
      const { error } = await supabase
        .from('shop_quote_requests')
        .update({
          status: newStatus,
          admin_notes: notes,
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
      alert('✅ Statut mis à jour');
      loadRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('❌ Erreur lors de la mise à jour');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      contacted: { label: 'Contacté', color: 'bg-blue-100 text-blue-800', icon: Send },
      quoted: { label: 'Devis envoyé', color: 'bg-purple-100 text-purple-800', icon: Package },
      closed: { label: 'Finalisé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Refusé', color: 'bg-red-100 text-red-800', icon: XCircle },
    };
    const { label, color, icon: Icon } = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${color}`}>
        <Icon className="w-4 h-4" />
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    total: requests.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingCart className="w-8 h-8" />
          <h1 className="text-2xl font-bold">Demandes d'Abonnements & Crédits</h1>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/20 backdrop-blur-xl rounded-xl p-4">
            <p className="text-sm text-white/80 mb-1">En attente</p>
            <p className="text-3xl font-bold">{stats.pending}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-xl rounded-xl p-4">
            <p className="text-sm text-white/80 mb-1">Total</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'contacted', 'quoted', 'closed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filter === f
                ? 'bg-teal-500 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {f === 'all' ? 'Toutes' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="grid gap-4">
        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <ShoppingCart className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">Aucune demande trouvée</p>
          </div>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">
                      {request.profiles?.first_name} {request.profiles?.last_name}
                    </h3>
                    <p className="text-sm text-slate-500">{request.company_name}</p>
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-600">{request.email}</span>
                </div>
                {request.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{request.phone}</span>
                  </div>
                )}
              </div>

              {request.expected_volume && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-sm font-semibold text-blue-900 mb-1">Volume demandé :</p>
                  <p className="text-blue-700">{request.expected_volume}</p>
                </div>
              )}

              {request.message && (
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-slate-500" />
                    <p className="text-sm font-semibold text-slate-700">Message :</p>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{request.message}</p>
                </div>
              )}

              {request.admin_notes && (
                <div className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-200">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">📝 Notes admin :</p>
                  <p className="text-sm text-yellow-700">{request.admin_notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Demandé le {new Date(request.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>

                <div className="flex gap-2">
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          const notes = prompt('Notes admin (optionnel) :');
                          updateStatus(request.id, 'contacted', notes || undefined);
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-semibold text-sm"
                      >
                        ✉️ Marquer contacté
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Rejeter cette demande ?')) {
                            const notes = prompt('Raison du rejet (optionnel) :');
                            updateStatus(request.id, 'rejected', notes || undefined);
                          }
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold text-sm"
                      >
                        ❌ Rejeter
                      </button>
                    </>
                  )}
                  {request.status === 'contacted' && (
                    <button
                      onClick={() => {
                        const notes = prompt('Notes sur le devis envoyé :');
                        updateStatus(request.id, 'quoted', notes || undefined);
                      }}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all font-semibold text-sm"
                    >
                      📄 Devis envoyé
                    </button>
                  )}
                  {request.status === 'quoted' && (
                    <button
                      onClick={() => {
                        const notes = prompt('Notes de finalisation :');
                        updateStatus(request.id, 'closed', notes || undefined);
                      }}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-semibold text-sm"
                    >
                      ✅ Finaliser
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
