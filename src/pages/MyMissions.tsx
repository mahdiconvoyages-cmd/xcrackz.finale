import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Calendar, DollarSign, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MissionAssignment {
  id: string;
  mission_id: string;
  contact_id: string;
  payment_ht: number;
  commission: number;
  status: string;
  notes: string;
  assigned_at: string;
  mission: {
    reference: string;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate: string;
    pickup_address: string;
    pickup_date: string;
    delivery_address: string;
    delivery_date: string;
    distance: number;
    status: string;
    notes: string;
  };
}

export default function MyMissions() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<MissionAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactId, setContactId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadMyMissions();
    }
  }, [user]);

  const loadMyMissions = async () => {
    try {
      setLoading(true);

      // 1. Trouver le contact lié à cet utilisateur
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (contactError) {
        console.error('Erreur chargement contact:', contactError);
        return;
      }

      if (!contact) {
        console.log('Aucun contact lié à cet utilisateur');
        return;
      }

      setContactId(contact.id);

      // 2. Charger toutes les missions assignées à ce contact
      const { data, error } = await supabase
        .from('mission_assignments')
        .select(`
          *,
          mission:missions (
            reference,
            vehicle_brand,
            vehicle_model,
            vehicle_plate,
            pickup_address,
            pickup_date,
            delivery_address,
            delivery_date,
            distance,
            status,
            notes
          )
        `)
        .eq('contact_id', contact.id)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement missions:', error);
        return;
      }

      console.log('✅ Missions chargées:', data);
      setAssignments(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      assigned: { icon: AlertCircle, text: 'Assignée', color: 'bg-blue-100 text-blue-700' },
      in_progress: { icon: Clock, text: 'En cours', color: 'bg-yellow-100 text-yellow-700' },
      completed: { icon: CheckCircle, text: 'Terminée', color: 'bg-green-100 text-green-700' },
      cancelled: { icon: XCircle, text: 'Annulée', color: 'bg-red-100 text-red-700' },
    };

    const badge = badges[status as keyof typeof badges] || badges.assigned;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement de vos missions...</p>
        </div>
      </div>
    );
  }

  if (!contactId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Aucun Contact Lié</h2>
            <p className="text-slate-600">
              Votre compte n'est pas encore lié à un contact dans l'équipe.
              <br />
              Contactez l'administrateur pour être ajouté.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            🚗 Mes Missions Assignées
          </h1>
          <p className="text-slate-600">
            {assignments.length} mission{assignments.length > 1 ? 's' : ''} au total
          </p>
        </div>

        {/* Liste des missions */}
        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Package className="w-20 h-20 text-slate-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Aucune Mission Assignée
            </h2>
            <p className="text-slate-600">
              Vous n'avez pas encore de missions assignées.
              <br />
              Dès qu'une mission vous sera attribuée, elle apparaîtra ici.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                {/* En-tête */}
                <div className="bg-gradient-to-r from-teal-500 to-blue-500 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold mb-1">
                        {assignment.mission.reference}
                      </h3>
                      <p className="text-teal-100">
                        {assignment.mission.vehicle_brand} {assignment.mission.vehicle_model}
                        {assignment.mission.vehicle_plate && ` • ${assignment.mission.vehicle_plate}`}
                      </p>
                    </div>
                    {getStatusBadge(assignment.status)}
                  </div>
                </div>

                {/* Contenu */}
                <div className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Départ */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-2 bg-green-100 rounded-lg">
                          <MapPin className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-500 mb-1">
                            📍 Point de départ
                          </p>
                          <p className="text-slate-900 font-medium">
                            {assignment.mission.pickup_address}
                          </p>
                          {assignment.mission.pickup_date && (
                            <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(assignment.mission.pickup_date), 'PPP à HH:mm', { locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Arrivée */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 p-2 bg-red-100 rounded-lg">
                          <MapPin className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-500 mb-1">
                            🏁 Destination
                          </p>
                          <p className="text-slate-900 font-medium">
                            {assignment.mission.delivery_address}
                          </p>
                          {assignment.mission.delivery_date && (
                            <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(assignment.mission.delivery_date), 'PPP à HH:mm', { locale: fr })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informations complémentaires */}
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {assignment.mission.distance && (
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                          <p className="text-2xl font-bold text-slate-900">
                            {Math.round(assignment.mission.distance)} km
                          </p>
                          <p className="text-sm text-slate-600">Distance</p>
                        </div>
                      )}

                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-teal-600">
                          {assignment.payment_ht.toFixed(2)} €
                        </p>
                        <p className="text-sm text-slate-600">Paiement HT</p>
                      </div>

                      {assignment.commission > 0 && (
                        <div className="text-center p-3 bg-slate-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600">
                            {assignment.commission.toFixed(2)} €
                          </p>
                          <p className="text-sm text-slate-600">Commission</p>
                        </div>
                      )}

                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600 mb-1">Assignée le</p>
                        <p className="text-sm font-medium text-slate-900">
                          {format(new Date(assignment.assigned_at), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {(assignment.notes || assignment.mission.notes) && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-semibold text-slate-700 mb-2">📝 Notes</p>
                      {assignment.notes && (
                        <p className="text-sm text-slate-600 mb-2">
                          <span className="font-medium">Assignation:</span> {assignment.notes}
                        </p>
                      )}
                      {assignment.mission.notes && (
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Mission:</span> {assignment.mission.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
