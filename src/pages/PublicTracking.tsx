import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Navigation, Eye, Share2, Clock, Truck, Activity, Search, Calendar, Route as RouteIcon, Maximize2, Package, AlertCircle, CheckCircle, XCircle, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LeafletTracking from '../components/LeafletTracking';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  delivery_date?: string;
  driver_id?: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_lat?: number;
  delivery_lng?: number;
  price?: number;
  notes?: string;
  created_at: string;
}

interface GPSPosition {
  lat: number;
  lng: number;
  timestamp: string;
  bearing?: number;
  speed?: number; // km/h
  accuracy?: number; // meters
}

export default function PublicTracking() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showMap, setShowMap] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const [currentPosition, setCurrentPosition] = useState<GPSPosition | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const missionsChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    loadActiveMissions();
    
    // S'abonner aux changements de missions en temps réel
    const missionsChannel = supabase
      .channel('missions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missions',
          filter: user ? `user_id=eq.${user.id}` : undefined,
        },
        (payload) => {
          console.log('Mission change detected:', payload);
          loadActiveMissions();
        }
      )
      .subscribe();

    missionsChannelRef.current = missionsChannel;

    return () => {
      if (missionsChannelRef.current) {
        missionsChannelRef.current.unsubscribe();
      }
    };
  }, [user]);

  // Écouter les positions GPS en temps réel pour la mission sélectionnée
  useEffect(() => {
    if (!selectedMission || selectedMission.status !== 'in_progress') {
      // Nettoyer le canal si la mission n'est pas en cours
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setCurrentPosition(null);
      return;
    }

    // S'abonner au canal GPS pour cette mission
    const channel = supabase.channel(`mission:${selectedMission.id}:gps`);
    
    channel.on('broadcast', { event: 'gps_update' }, (payload) => {
      const position = payload.payload as GPSPosition;
      console.log('🚗 GPS update received:', {
        lat: position.lat,
        lng: position.lng,
        speed: position.speed,
        timestamp: new Date(position.timestamp).toLocaleTimeString('fr-FR')
      });
      
      setCurrentPosition(position);
    });

    channel.subscribe((status) => {
      console.log('Realtime channel status:', status);
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [selectedMission]);

  const loadActiveMissions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Charger missions créées OU assignées
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .or(`user_id.eq.${user.id},driver_id.eq.${user.id}`)
        .in('status', ['pending', 'in_progress'])
        .order('pickup_date', { ascending: true });

      if (error) throw error;
      setMissions(data || []);
      
      if (data && data.length > 0 && !selectedMission) {
        setSelectedMission(data[0]);
      }
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in_progress':
        return {
          label: 'En cours',
          color: 'text-blue-600',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          icon: PlayCircle,
          pulseColor: 'bg-blue-500'
        };
      case 'pending':
        return {
          label: 'En attente',
          color: 'text-amber-600',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          icon: Clock,
          pulseColor: 'bg-amber-500'
        };
      case 'completed':
        return {
          label: 'Terminée',
          color: 'text-green-600',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          icon: CheckCircle,
          pulseColor: 'bg-green-500'
        };
      case 'cancelled':
        return {
          label: 'Annulée',
          color: 'text-red-600',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          icon: XCircle,
          pulseColor: 'bg-red-500'
        };
      default:
        return {
          label: 'Inconnu',
          color: 'text-slate-600',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/30',
          icon: AlertCircle,
          pulseColor: 'bg-slate-500'
        };
    }
  };

  const calculateDistance = (lat1?: number, lon1?: number, lat2?: number, lon2?: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return Math.round(distance);
  };

  const stats = {
    total: missions.length,
    inProgress: missions.filter(m => m.status === 'in_progress').length,
    pending: missions.filter(m => m.status === 'pending').length,
    totalDistance: missions.reduce((acc, m) => acc + calculateDistance(m.pickup_lat, m.pickup_lng, m.delivery_lat, m.delivery_lng), 0)
  };

  const copyTrackingLink = (mission: Mission) => {
    const trackingUrl = `${window.location.origin}/missions/${mission.id}/tracking`;
    navigator.clipboard.writeText(trackingUrl);
    alert('✅ Lien de tracking copié !');
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
    <div className="space-y-6">
      {/* HEADER REFONTE */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-cyan-600 to-blue-600 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                <Navigation className="w-8 h-8 text-white animate-pulse" />
              </div>
              <h1 className="text-4xl font-black text-white">
                Suivi GPS Temps Réel
              </h1>
            </div>
            <p className="text-white/90 text-lg font-medium ml-[60px]">
              Suivez vos missions avec vitesse, ETA et position en direct 🚗
            </p>
          </div>
          <button
            onClick={() => setShowMap(!showMap)}
            className="inline-flex items-center gap-2 bg-white text-teal-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all hover:scale-105"
          >
            <Maximize2 className="w-5 h-5" />
            {showMap ? 'Masquer' : 'Afficher'} carte
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-slate-500/10 backdrop-blur rounded-xl">
              <Truck className="w-6 h-6 text-slate-700" />
            </div>
            <span className="text-3xl font-black text-slate-800">{stats.total}</span>
          </div>
          <p className="text-sm font-bold text-slate-600">Missions actives</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/40 shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-500/20 backdrop-blur rounded-xl">
              <Activity className="w-6 h-6 text-blue-700" />
            </div>
            <span className="text-3xl font-black text-blue-700">{stats.inProgress}</span>
          </div>
          <p className="text-sm font-bold text-blue-800">En cours</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-white/40 shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-amber-500/20 backdrop-blur rounded-xl">
              <Clock className="w-6 h-6 text-amber-700" />
            </div>
            <span className="text-3xl font-black text-amber-700">{stats.pending}</span>
          </div>
          <p className="text-sm font-bold text-amber-800">En attente</p>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-white/40 shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-green-500/20 backdrop-blur rounded-xl">
              <RouteIcon className="w-6 h-6 text-green-700" />
            </div>
            <span className="text-3xl font-black text-green-700">{stats.totalDistance}</span>
          </div>
          <p className="text-sm font-bold text-green-800">Km total</p>
        </div>
      </div>

      {/* CARTE + LISTE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LISTE DES MISSIONS */}
        <div className="lg:col-span-1 space-y-4">
          <div className="backdrop-blur-xl bg-white/70 border border-slate-200 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Missions actives</h3>
            
            {/* FILTRES */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="in_progress">En cours</option>
                <option value="pending">En attente</option>
              </select>
            </div>

            {/* LISTE */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredMissions.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Aucune mission active</p>
                </div>
              ) : (
                filteredMissions.map((mission) => {
                  const statusInfo = getStatusInfo(mission.status);
                  const StatusIcon = statusInfo.icon;
                  const isSelected = selectedMission?.id === mission.id;
                  
                  return (
                    <div
                      key={mission.id}
                      onClick={() => setSelectedMission(mission)}
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 shadow-lg'
                          : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900">{mission.reference}</h4>
                          <p className="text-sm text-slate-600 mt-1">
                            {mission.vehicle_brand} {mission.vehicle_model}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.color}`}>
                            {mission.status === 'in_progress' && (
                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${statusInfo.pulseColor} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${statusInfo.pulseColor}`}></span>
                              </span>
                            )}
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusInfo.label}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                          <span>{mission.pickup_address}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                          <span>{mission.delivery_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{new Date(mission.pickup_date).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                        <Link
                          to={`/missions/${mission.id}/tracking`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition text-xs font-semibold"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyTrackingLink(mission);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-xs font-semibold"
                        >
                          <Share2 className="w-4 h-4" />
                          Partager
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* CARTE + DÉTAILS */}
        <div className="lg:col-span-2 space-y-4">
          {/* STATISTIQUES TEMPS RÉEL - TOUJOURS VISIBLE */}
          {showMap && selectedMission && selectedMission.status === 'in_progress' && (
            <div className="backdrop-blur-xl bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/30 border-2 border-teal-200 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-teal-600 animate-pulse" />
                  Données en temps réel
                </h3>
                {currentPosition && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    GPS ACTIF
                  </div>
                )}
                {!currentPosition && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-full text-xs font-bold">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                    En attente GPS...
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* VITESSE ACTUELLE */}
                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-2 border-blue-300 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-500/20 backdrop-blur rounded-xl">
                        <Activity className="w-7 h-7 text-blue-700" />
                      </div>
                      {currentPosition?.speed !== undefined && currentPosition.speed > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 rounded-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-bold text-green-700">En mouvement</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-blue-800 uppercase tracking-wide">Vitesse actuelle</p>
                      <p className="text-5xl font-black text-blue-700">
                        {currentPosition?.speed !== undefined ? Math.round(currentPosition.speed) : '--'}
                        <span className="text-xl ml-2">km/h</span>
                      </p>
                      {currentPosition && (
                        <p className="text-xs text-blue-600 mt-2">
                          ⏰ MAJ: {new Date(currentPosition.timestamp).toLocaleTimeString('fr-FR')}
                        </p>
                      )}
                      {!currentPosition && (
                        <p className="text-xs text-blue-600 mt-2">
                          En attente de données GPS...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* DISTANCE RESTANTE */}
                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-300 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-amber-500/20 backdrop-blur rounded-xl">
                        <RouteIcon className="w-7 h-7 text-amber-700" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Distance restante</p>
                      <p className="text-5xl font-black text-amber-700">
                        {currentPosition ? 
                          calculateDistance(currentPosition.lat, currentPosition.lng, selectedMission.delivery_lat, selectedMission.delivery_lng)
                          : calculateDistance(selectedMission.pickup_lat, selectedMission.pickup_lng, selectedMission.delivery_lat, selectedMission.delivery_lng)
                        }
                        <span className="text-xl ml-2">km</span>
                      </p>
                      <p className="text-xs text-amber-600 mt-2">
                        📍 Total: {calculateDistance(selectedMission.pickup_lat, selectedMission.pickup_lng, selectedMission.delivery_lat, selectedMission.delivery_lng)} km
                      </p>
                    </div>
                  </div>
                </div>

                {/* ETA */}
                <div className="relative overflow-hidden backdrop-blur-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-300 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-500/20 backdrop-blur rounded-xl">
                        <Clock className="w-7 h-7 text-green-700" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-green-800 uppercase tracking-wide">Arrivée estimée</p>
                      {(() => {
                        if (!currentPosition) {
                          return (
                            <>
                              <p className="text-3xl font-black text-green-700">
                                En attente
                              </p>
                              <p className="text-xs text-green-600 mt-2">
                                GPS en cours d'activation...
                              </p>
                            </>
                          );
                        }
                        
                        const distanceKm = calculateDistance(currentPosition.lat, currentPosition.lng, selectedMission.delivery_lat, selectedMission.delivery_lng);
                        const speedKmh = currentPosition.speed || 0;
                        
                        if (speedKmh > 5 && distanceKm > 0) {
                          const hoursRemaining = distanceKm / speedKmh;
                          const minutesRemaining = Math.round(hoursRemaining * 60);
                          const etaDate = new Date(Date.now() + minutesRemaining * 60 * 1000);
                          
                          if (minutesRemaining < 60) {
                            return (
                              <>
                                <p className="text-5xl font-black text-green-700">
                                  {minutesRemaining}
                                  <span className="text-xl ml-2">min</span>
                                </p>
                                <p className="text-xs text-green-600 mt-2">
                                  🎯 Vers {etaDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </>
                            );
                          } else {
                            const hours = Math.floor(hoursRemaining);
                            const mins = Math.round((hoursRemaining - hours) * 60);
                            return (
                              <>
                                <p className="text-4xl font-black text-green-700">
                                  {hours}h{mins > 0 ? ` ${mins}min` : ''}
                                </p>
                                <p className="text-xs text-green-600 mt-2">
                                  🎯 Vers {etaDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </>
                            );
                          }
                        } else if (distanceKm < 0.5) {
                          return (
                            <>
                              <p className="text-3xl font-black text-green-700">
                                🎯 Arrivé
                              </p>
                              <p className="text-xs text-green-600 mt-2">
                                À destination
                              </p>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <p className="text-3xl font-black text-green-600">
                                Calcul...
                              </p>
                              <p className="text-xs text-green-600 mt-2">
                                En attente de vitesse GPS
                              </p>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showMap && selectedMission && selectedMission.status === 'in_progress' && (
            <div className="relative backdrop-blur-xl bg-gradient-to-br from-white via-slate-50 to-slate-100 border-2 border-slate-300 rounded-3xl p-6 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="relative">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl">
                      <Navigation className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Carte GPS Interactive</h3>
                      <p className="text-sm text-slate-600">Suivi en temps réel avec route optimisée</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-green-500 text-white rounded-xl shadow-lg">
                    <Activity className="w-5 h-5 animate-pulse" />
                    <span className="font-bold text-sm">LIVE</span>
                  </div>
                </div>
                <div className="w-full h-[600px] rounded-2xl overflow-hidden border-4 border-slate-200 shadow-inner">
                  {selectedMission.pickup_lat && selectedMission.pickup_lng && 
                   selectedMission.delivery_lat && selectedMission.delivery_lng ? (
                    <LeafletTracking
                      pickupLat={selectedMission.pickup_lat}
                      pickupLng={selectedMission.pickup_lng}
                      pickupAddress={selectedMission.pickup_address}
                      deliveryLat={selectedMission.delivery_lat}
                      deliveryLng={selectedMission.delivery_lng}
                      deliveryAddress={selectedMission.delivery_address}
                      driverLat={currentPosition?.lat}
                      driverLng={currentPosition?.lng}
                      driverName="Chauffeur"
                      vehiclePlate={selectedMission.vehicle_plate}
                      status={getStatusInfo(selectedMission.status).label}
                      height="600px"
                      showControls={true}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <p className="text-slate-700 font-semibold text-lg">Coordonnées GPS manquantes</p>
                        <p className="text-slate-500 text-sm mt-2">
                          Cette mission n'a pas de coordonnées GPS définies
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {showMap && selectedMission && selectedMission.status !== 'in_progress' && (
            <div className="backdrop-blur-xl bg-white/70 border border-slate-200 rounded-2xl p-6 shadow-xl">
              <div
                ref={mapRef}
                className="w-full h-96 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwMDAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50"></div>
                <div className="relative text-center z-10">
                  <Clock className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <p className="text-slate-700 font-semibold text-lg">Mission en attente</p>
                  <p className="text-slate-500 text-sm mt-2">
                    La carte s'affichera lorsque la mission sera en cours
                  </p>
                  {selectedMission && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg shadow-lg">
                      <Package className="w-5 h-5" />
                      <span className="font-semibold">{selectedMission.reference}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DÉTAILS DE LA MISSION SÉLECTIONNÉE */}
          {selectedMission && (
            <div className="backdrop-blur-xl bg-white/70 border border-slate-200 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedMission.reference}</h3>
                  <p className="text-slate-600 mt-1">
                    {selectedMission.vehicle_brand} {selectedMission.vehicle_model} 
                    {selectedMission.vehicle_plate && <span className="text-slate-500"> • {selectedMission.vehicle_plate}</span>}
                  </p>
                </div>
                {(() => {
                  const statusInfo = getStatusInfo(selectedMission.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.color}`}>
                      <StatusIcon className="w-5 h-5" />
                      {statusInfo.label}
                    </div>
                  );
                })()}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-500" />
                      Point de départ
                    </h4>
                    <p className="text-slate-900 font-medium">{selectedMission.pickup_address}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(selectedMission.pickup_date).toLocaleString('fr-FR')}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      Point d'arrivée
                    </h4>
                    <p className="text-slate-900 font-medium">{selectedMission.delivery_address}</p>
                    {selectedMission.delivery_date && (
                      <p className="text-sm text-slate-600 mt-1">
                        {new Date(selectedMission.delivery_date).toLocaleString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedMission.price && (
                    <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl">
                      <h4 className="text-sm font-semibold text-teal-700 mb-1">Prix</h4>
                      <p className="text-2xl font-black text-teal-600">{selectedMission.price.toFixed(2)}€</p>
                    </div>
                  )}

                  {calculateDistance(selectedMission.pickup_lat, selectedMission.pickup_lng, selectedMission.delivery_lat, selectedMission.delivery_lng) > 0 && (
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                      <h4 className="text-sm font-semibold text-blue-700 mb-1">Distance estimée</h4>
                      <p className="text-2xl font-black text-blue-600">
                        {calculateDistance(selectedMission.pickup_lat, selectedMission.pickup_lng, selectedMission.delivery_lat, selectedMission.delivery_lng)} km
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedMission.notes && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Notes
                  </h4>
                  <p className="text-slate-700">{selectedMission.notes}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                <Link
                  to={`/missions/${selectedMission.id}/tracking`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold hover:shadow-xl transition-all"
                >
                  <Eye className="w-5 h-5" />
                  Vue détaillée
                </Link>
                <button
                  onClick={() => copyTrackingLink(selectedMission)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-teal-500 text-teal-600 rounded-xl font-bold hover:bg-teal-50 transition-all"
                >
                  <Share2 className="w-5 h-5" />
                  Partager le lien
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
