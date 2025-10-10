import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, Eye, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Mission {
  id: string;
  reference: string;
  status: string;
  vehicle_brand: string;
  vehicle_model: string;
  vehicle_plate: string;
  pickup_address: string;
  delivery_address: string;
  pickup_date: string;
}

export default function TrackingList() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActiveMissions();
  }, [user]);

  const loadActiveMissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('pickup_date', { ascending: true });

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in_progress':
        return {
          label: 'En cours',
          color: 'from-blue-500 to-cyan-500',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-900',
          icon: Navigation,
        };
      case 'pending':
        return {
          label: 'En attente',
          color: 'from-amber-500 to-orange-500',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-900',
          icon: MapPin,
        };
      default:
        return {
          label: status,
          color: 'from-slate-500 to-slate-600',
          bgColor: 'bg-slate-50',
          textColor: 'text-slate-900',
          icon: MapPin,
        };
    }
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
      <div className="animate-in slide-in-from-left duration-500">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Tracking des missions
        </h1>
        <p className="text-slate-600">Suivez vos missions en temps réel</p>
      </div>

      {missions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center animate-in slide-in-from-bottom duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 rounded-2xl mb-4">
            <Navigation className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune mission active</h3>
          <p className="text-slate-600 mb-6">Toutes vos missions sont terminées ou aucune n'est en cours.</p>
          <Link
            to="/missions/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-teal-500/30 transition-all duration-300"
          >
            <MapPin className="w-5 h-5" />
            Créer une mission
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {missions.map((mission, index) => {
            const statusInfo = getStatusInfo(mission.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={mission.id}
                style={{ animationDelay: `${index * 100}ms` }}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom"
              >
                <div className={`bg-gradient-to-r ${statusInfo.color} p-6 text-white`}>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <StatusIcon className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{mission.reference}</h3>
                        <p className="text-white/90">
                          {mission.vehicle_brand} {mission.vehicle_model} - {mission.vehicle_plate}
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg font-semibold`}>
                      {statusInfo.label}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="relative mb-6">
                    <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gradient-to-b from-green-500 to-red-500"></div>

                    <div className="space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg relative z-10">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-semibold text-green-600 uppercase mb-1">Départ</p>
                          <p className="text-slate-900 font-medium">{mission.pickup_address}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg relative z-10">
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-sm font-semibold text-red-600 uppercase mb-1">Arrivée</p>
                          <p className="text-slate-900 font-medium">{mission.delivery_address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Link
                      to={`/missions/${mission.id}/tracking`}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      <Eye className="w-5 h-5" />
                      Voir le tracking
                    </Link>
                    <Link
                      to="/team-missions"
                      className="px-6 py-3 bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition flex items-center gap-2"
                    >
                      <Share2 className="w-5 h-5" />
                      Missions
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
