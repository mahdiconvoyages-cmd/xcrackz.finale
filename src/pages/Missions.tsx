import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Truck, Calendar, MapPin, Package, TrendingUp, Sparkles, Download, Mail, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Mission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  vehicle_image_url: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
  price: number;
  created_at: string;
}

export default function Missions() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadMissions();
  }, [user]);

  const loadMissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (missionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      window.open(`/api/missions/${missionId}/pdf`, '_blank');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Erreur lors du téléchargement du PDF');
    }
  };

  const handleSendEmail = async (mission: Mission, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const subject = encodeURIComponent(`Rapport de mission ${mission.reference}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint le rapport de mission ${mission.reference}.\n\nVéhicule: ${mission.vehicle_brand} ${mission.vehicle_model}\nImmatriculation: ${mission.vehicle_plate || 'N/A'}\n\nCordialement`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const openInbox = () => {
    if (user?.email) {
      const domain = user.email.split('@')[1];
      const inboxUrls: { [key: string]: string } = {
        'gmail.com': 'https://mail.google.com',
        'outlook.com': 'https://outlook.live.com',
        'hotmail.com': 'https://outlook.live.com',
        'yahoo.com': 'https://mail.yahoo.com',
        'icloud.com': 'https://www.icloud.com/mail',
      };

      const inboxUrl = inboxUrls[domain] || `https://${domain}`;
      window.open(inboxUrl, '_blank');
    }
  };

  const filteredMissions = missions.filter((mission) => {
    const matchesSearch =
      mission.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.vehicle_brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.vehicle_model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mission.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-500/10 border-green-500/30';
      case 'in_progress': return 'text-blue-600 bg-blue-500/10 border-blue-500/30';
      case 'pending': return 'text-amber-600 bg-amber-500/10 border-amber-500/30';
      case 'cancelled': return 'text-red-600 bg-red-500/10 border-red-500/30';
      default: return 'text-slate-600 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Terminée';
      case 'in_progress': return 'En cours';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const stats = {
    total: missions.length,
    pending: missions.filter(m => m.status === 'pending').length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    completed: missions.filter(m => m.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-teal-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="animate-in slide-in-from-left duration-500">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm animate-gradient text-shadow flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-teal-500 animate-float" />
            Mes Missions
          </h1>
          <p className="text-slate-600 text-lg">Missions créées par vous</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openInbox}
            className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-right duration-500"
          >
            <Inbox className="w-5 h-5" />
            Inbox
          </button>
          <Link
            to="/missions/create"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-glow-teal px-6 py-3 rounded-xl font-bold hover:shadow-depth-xl hover:shadow-depth-xl hover:shadow-teal-500/60 transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-right duration-500"
          >
            <Plus className="w-5 h-5" />
            Nouvelle mission
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom duration-700">
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 shadow-depth-lg rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 hover-lift noise-texture inner-glow hover:-translate-y-1 group hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-slate-500/10 backdrop-blur rounded-xl group-hover:scale-110 transition">
              <Package className="w-6 h-6 text-slate-700" />
            </div>
            <span className="text-3xl font-black text-slate-800">{stats.total}</span>
          </div>
          <p className="text-sm font-bold text-slate-600">Total des missions</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/40 shadow-xl shadow-lg shadow-amber-300/50 rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1 group hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-amber-500/20 backdrop-blur rounded-xl group-hover:scale-110 transition">
              <Calendar className="w-6 h-6 text-amber-700" />
            </div>
            <span className="text-3xl font-black text-amber-700">{stats.pending}</span>
          </div>
          <p className="text-sm font-bold text-amber-800">En attente</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/40 shadow-xl shadow-lg shadow-blue-300/50 rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1 group hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-500/20 backdrop-blur rounded-xl group-hover:scale-110 transition">
              <TrendingUp className="w-6 h-6 text-blue-700" />
            </div>
            <span className="text-3xl font-black text-blue-700">{stats.inProgress}</span>
          </div>
          <p className="text-sm font-bold text-blue-800">En cours</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-white/40 shadow-xl shadow-lg shadow-green-300/50 rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-1 group hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-green-500/20 backdrop-blur rounded-xl group-hover:scale-110 transition">
              <Truck className="w-6 h-6 text-green-700" />
            </div>
            <span className="text-3xl font-black text-green-700">{stats.completed}</span>
          </div>
          <p className="text-sm font-bold text-green-800">Terminées</p>
        </div>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 shadow-depth-lg rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300 hover-lift noise-texture inner-glow animate-in slide-in-from-bottom duration-700 delay-100">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition" />
            <input
              type="text"
              placeholder="Rechercher par référence, véhicule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl pl-10 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 transition"
            />
          </div>
          <div className="relative group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-500 transition" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl pl-10 pr-8 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white/80 appearance-none cursor-pointer transition"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminées</option>
              <option value="cancelled">Annulées</option>
            </select>
          </div>
        </div>

        {filteredMissions.length === 0 ? (
          <div className="text-center py-16 animate-in fade-in duration-500">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur rounded-2xl mb-4">
              <Truck className="w-10 h-10 text-teal-600" />
            </div>
            <p className="text-slate-600 mb-4 text-lg font-medium">
              {searchQuery || statusFilter !== 'all'
                ? 'Aucune mission trouvée'
                : 'Aucune mission pour le moment'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Link
                to="/missions/create"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-glow-teal px-6 py-3 rounded-xl font-bold hover:shadow-depth-xl hover:shadow-depth-xl hover:shadow-teal-500/60 transition-all duration-300 hover:-translate-y-1"
              >
                <Plus className="w-5 h-5" />
                Créer une mission
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredMissions.map((mission, index) => (
              <Link
                key={mission.id}
                to="/team-missions"
                style={{ animationDelay: `${index * 50}ms` }}
                className="block backdrop-blur-sm bg-white/50 border border-white/60 rounded-xl p-6 hover:bg-white/80 hover:shadow-depth-xl hover:border-teal-500/50 transition-all duration-300 group hover-lift animate-in slide-in-from-bottom"
              >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                    {mission.vehicle_image_url ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg border-2 border-teal-500/50">
                        <img
                          src={mission.vehicle_image_url}
                          alt="Véhicule"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-lg shadow-teal-500/50">
                        <Truck className="w-7 h-7 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-bold text-lg text-slate-900">{mission.reference}</h3>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur animate-pulse-glow ${getStatusColor(mission.status)}`}>
                          {getStatusLabel(mission.status)}
                        </span>
                      </div>
                      <p className="text-slate-700 mb-3 font-medium">
                        {mission.vehicle_brand} {mission.vehicle_model}
                        {mission.vehicle_plate && <span className="text-slate-500"> • {mission.vehicle_plate}</span>}
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                          <span className="text-slate-600">{mission.pickup_address}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                          <span className="text-slate-600">{mission.delivery_address}</span>
                        </div>
                      </div>
                    </div>
                    </div>
                    <div className="flex lg:flex-col items-end gap-3 lg:gap-2 text-right">
                      {mission.pickup_date && (
                        <div className="flex items-center gap-2 text-sm text-slate-700 backdrop-blur bg-slate-500/10 px-3 py-1.5 rounded-xl border border-slate-500/20 font-medium">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(mission.pickup_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                      {mission.price > 0 && (
                        <p className="text-2xl font-black bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm animate-gradient text-shadow">
                          {mission.price.toLocaleString('fr-FR')}€
                        </p>
                      )}
                    </div>
                  </div>

                {mission.status === 'completed' && (
                  <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-slate-600 font-semibold">Actions :</p>
                    <button
                      onClick={(e) => handleDownloadPDF(mission.id, e)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger PDF
                    </button>
                    <button
                      onClick={(e) => handleSendEmail(mission, e)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm"
                    >
                      <Mail className="w-4 h-4" />
                      Envoyer par email
                    </button>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
