// @ts-nocheck
import { useEffect, useState } from 'react';
import { MapPin, Navigation, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AdminTracking() {
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMissions();
    const ch = supabase
      .channel('admin-tracking-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'missions' }, () => loadMissions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadMissions = async () => {
    try {
      const { data, error } = await supabase
        .from('missions')
        .select(`
          id, reference, status, pickup_address, delivery_address, pickup_date, driver_id, user_id,
          profiles!missions_user_id_fkey(email, full_name)
        `)
        .in('status', ['pending', 'in_progress'])
        .order('pickup_date', { ascending: true });

      if (error) throw error;

      // Batch-fetch all drivers at once instead of N+1 queries
      const driverIds = [...new Set((data || []).map(m => m.driver_id).filter(Boolean))];
      let driversMap = new Map();

      if (driverIds.length > 0) {
        const { data: drivers } = await supabase
          .from('contacts')
          .select('id, first_name, last_name')
          .in('id', driverIds);
        (drivers || []).forEach(d => driversMap.set(d.id, d));
      }

      setMissions((data || []).map(m => ({
        ...m,
        driver: m.driver_id ? driversMap.get(m.driver_id) || null : null,
      })));
    } catch (err) {
      console.error('Error loading tracking missions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Missions GPS</h1>
        <p className="text-slate-500 mt-1">{missions.length} mission{missions.length !== 1 ? 's' : ''} active{missions.length !== 1 ? 's' : ''}</p>
      </div>

      {missions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
          <Navigation className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-xl font-bold text-slate-400">Aucune mission active</p>
          <p className="text-sm text-slate-400 mt-1">Les missions en cours apparaîtront ici</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {missions.map(mission => (
            <div key={mission.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-slate-900 mb-3">{mission.reference || 'Mission sans référence'}</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-500">Départ</p>
                        <p className="text-sm text-slate-700">{mission.pickup_address || 'Non renseignée'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-500">Arrivée</p>
                        <p className="text-sm text-slate-700">{mission.delivery_address || 'Non renseignée'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-xl ${
                  mission.status === 'in_progress' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {mission.status === 'in_progress' ? '🚗 En cours' : '⏳ En attente'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Client</p>
                    <p className="font-semibold text-slate-900">{mission.profiles?.full_name || mission.profiles?.email || 'N/A'}</p>
                  </div>
                  {mission.driver && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Chauffeur</p>
                      <p className="font-semibold text-slate-900">{mission.driver.first_name} {mission.driver.last_name}</p>
                    </div>
                  )}
                  {mission.pickup_date && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Date</p>
                      <p className="font-semibold text-slate-900">{new Date(mission.pickup_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  )}
                </div>
                <Link to={`/missions/${mission.id}/tracking`} className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all text-sm">
                  <Navigation className="w-4 h-4" /> Suivre
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
