import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, MapPin, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface AssignedMission {
  id: string;
  mission_id: string;
  status: string;
  payment_ht: number;
  commission: number;
  notes: string;
  assigned_at: string;
  mission: {
    id: string;
    reference: string;
    client_name: string;
    departure_address: string;
    arrival_address: string;
    departure_date: string;
    vehicle_brand: string;
    vehicle_model: string;
    status: string;
  };
}

export default function MyAssignedMissions() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<AssignedMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'in_progress' | 'completed'>('all');

  useEffect(() => {
    if (user) {
      loadMyMissions();
    }
  }, [user]);

  const loadMyMissions = async () => {
    try {
      setLoading(true);

      // 1. Trouver le contact lié à l'utilisateur connecté
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id')
        .eq('user_id', user!.id)
        .single();

      if (contactError) {
        console.error('Erreur chargement contact:', contactError);
        setMissions([]);
        return;
      }

      if (!contact) {
        console.log('Aucun contact lié à cet utilisateur');
        setMissions([]);
        return;
      }

      // 2. Charger les missions assignées à ce contact
      const { data, error } = await supabase
        .from('mission_assignments')
        .select(`
          id,
          mission_id,
          status,
          payment_ht,
          commission,
          notes,
          assigned_at,
          mission:missions (
            id,
            reference,
            client_name,
            departure_address,
            arrival_address,
            departure_date,
            vehicle_brand,
            vehicle_model,
            status
          )
        `)
        .eq('contact_id', contact.id)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement missions:', error);
        return;
      }

      console.log('✅ Missions assignées chargées:', data);
      setMissions(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      assigned: { label: 'Assignée', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      in_progress: { label: 'En cours', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      completed: { label: 'Terminée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.assigned;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const filteredMissions = filter === 'all' 
    ? missions 
    : missions.filter(m => m.status === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement de vos missions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Mes Missions Assignées
          </h1>
          <p className="text-slate-600">
            Retrouvez toutes les missions qui vous ont été attribuées
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Toutes ({missions.length})
          </button>
          <button
            onClick={() => setFilter('assigned')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'assigned'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Assignées ({missions.filter(m => m.status === 'assigned').length})
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'in_progress'
                ? 'bg-yellow-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            En cours ({missions.filter(m => m.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Terminées ({missions.filter(m => m.status === 'completed').length})
          </button>
        </div>

        {/* Liste des missions */}
        {filteredMissions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Aucune mission {filter !== 'all' ? getStatusBadge(filter).props.children[1].toLowerCase() : ''}
            </h3>
            <p className="text-slate-600">
              {filter === 'all' 
                ? "Vous n'avez pas encore de missions assignées."
                : `Vous n'avez pas de missions avec ce statut.`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredMissions.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {assignment.mission.reference}
                      </h3>
                      {getStatusBadge(assignment.status)}
                    </div>
                    <p className="text-lg text-slate-700 font-semibold">
                      Client: {assignment.mission.client_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Assignée le</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {new Date(assignment.assigned_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Départ */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Départ</p>
                      <p className="text-slate-900">{assignment.mission.departure_address}</p>
                    </div>
                  </div>

                  {/* Arrivée */}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-600 mt-1" />
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Arrivée</p>
                      <p className="text-slate-900">{assignment.mission.arrival_address}</p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  {/* Date */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="text-sm text-slate-600">Date mission</p>
                      <p className="font-semibold text-slate-900">
                        {new Date(assignment.mission.departure_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  {/* Véhicule */}
                  <div>
                    <p className="text-sm text-slate-600">Véhicule</p>
                    <p className="font-semibold text-slate-900">
                      {assignment.mission.vehicle_brand} {assignment.mission.vehicle_model}
                    </p>
                  </div>

                  {/* Paiement */}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-slate-600">Paiement HT</p>
                      <p className="font-semibold text-green-700 text-lg">
                        {assignment.payment_ht.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {assignment.notes && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Notes:</p>
                    <p className="text-slate-900">{assignment.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
