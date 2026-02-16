import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getMissionDeeplink } from '../lib/shareCode';

interface Mission {
  id: string;
  title?: string;
  description?: string;
  pickup_address?: string;
  delivery_address?: string;
  scheduled_date?: string;
  status?: string;
  [key: string]: any;
}

export default function MissionDetail() {
  const { missionId } = useParams<{ missionId: string }>();
  const navigate = useNavigate();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Détection mobile pour redirection automatique
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!missionId) {
      setError('ID de mission manquant');
      setLoading(false);
      return;
    }

    loadMission();

    // Si mobile, tenter d'ouvrir l'app automatiquement
    if (isMobile) {
      const deeplink = getMissionDeeplink(missionId);
      window.location.href = deeplink;
      
      // Timeout: si l'app ne s'ouvre pas, afficher la page web
      setTimeout(() => {
        setLoading(false);
      }, 2500);
    } else {
      setLoading(false);
    }
  }, [missionId]);

  const loadMission = async () => {
    try {
      const { data, error: err } = await supabase
        .from('missions')
        .select('*')
        .eq('id', missionId!)
        .single();

      if (err) throw err;
      setMission(data);
    } catch (err) {
      console.error('❌ Erreur chargement mission:', err);
      setError('Mission introuvable ou inaccessible');
    }
  };

  const handleOpenInApp = () => {
    if (missionId) {
      window.location.href = getMissionDeeplink(missionId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {isMobile ? 'Ouverture dans l\'application...' : 'Chargement...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mission introuvable</h1>
          <p className="text-gray-600 mb-6">{error || 'Cette mission n\'existe pas ou n\'est plus accessible.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header avec logo CHECKSFLEET */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">CHECKSFLEET</h1>
            <p className="text-gray-600">Gestion de missions professionnelle</p>
          </div>

          {/* Informations mission */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                📦 {mission.title || 'Mission'}
              </h2>
              {mission.status && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  mission.status === 'completed' ? 'bg-green-100 text-green-800' :
                  mission.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  mission.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {mission.status === 'completed' ? '✅ Terminée' :
                   mission.status === 'in_progress' ? '🚗 En cours' :
                   mission.status === 'cancelled' ? '❌ Annulée' :
                   '⏳ En attente'}
                </span>
              )}
            </div>

            {mission.reference && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4">
                <p className="text-sm text-gray-600">Référence</p>
                <p className="font-mono font-semibold text-gray-900">{mission.reference}</p>
              </div>
            )}

            {/* Section Mandataire */}
            {(mission.mandataire_name || mission.mandataire_company) && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">👤</span>
                  <p className="text-sm font-semibold text-purple-900">Mandataire</p>
                </div>
                {mission.mandataire_name && (
                  <p className="text-gray-900 font-medium">{mission.mandataire_name}</p>
                )}
                {mission.mandataire_company && (
                  <p className="text-gray-700 text-sm">{mission.mandataire_company}</p>
                )}
              </div>
            )}

            {(mission.vehicle_brand || mission.vehicle_model || mission.vehicle_plate) && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4 mb-4 border border-teal-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🚗</span>
                  <p className="text-sm font-semibold text-teal-900">Véhicule</p>
                </div>
                <p className="font-semibold text-gray-900">
                  {mission.vehicle_brand} {mission.vehicle_model}
                </p>
                {mission.vehicle_plate && (
                  <p className="text-gray-700 font-mono text-sm mt-1">
                    📋 {mission.vehicle_plate}
                  </p>
                )}
                {mission.vehicle_type && (
                  <span className="inline-block mt-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold">
                    {mission.vehicle_type === 'VL' ? '🚗 Véhicule Léger' :
                     mission.vehicle_type === 'VU' ? '🚐 Véhicule Utilitaire' :
                     mission.vehicle_type === 'PL' ? '🚛 Poids Lourd' :
                     mission.vehicle_type}
                  </span>
                )}
              </div>
            )}
            
            {mission.description && (
              <p className="text-gray-700 mb-4 p-3 bg-gray-50 rounded-lg">{mission.description}</p>
            )}

            <div className="space-y-3 text-sm">
              {mission.pickup_address && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📍</span>
                    <p className="font-semibold text-green-900">Point d'Enlèvement</p>
                  </div>
                  <p className="text-gray-900 font-medium mb-2">{mission.pickup_address}</p>
                  {mission.pickup_contact_name && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm">👤</span>
                      <p className="text-gray-700 text-sm">{mission.pickup_contact_name}</p>
                    </div>
                  )}
                  {mission.pickup_contact_phone && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm">📞</span>
                      <a href={`tel:${mission.pickup_contact_phone}`} className="text-green-700 font-medium text-sm hover:underline">
                        {mission.pickup_contact_phone}
                      </a>
                    </div>
                  )}
                  {mission.pickup_date && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm">📅</span>
                      <p className="text-gray-700 text-sm">
                        {new Date(mission.pickup_date).toLocaleString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {mission.delivery_address && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🎯</span>
                    <p className="font-semibold text-blue-900">Point de Livraison</p>
                  </div>
                  <p className="text-gray-900 font-medium mb-2">{mission.delivery_address}</p>
                  {mission.delivery_contact_name && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm">👤</span>
                      <p className="text-gray-700 text-sm">{mission.delivery_contact_name}</p>
                    </div>
                  )}
                  {mission.delivery_contact_phone && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm">📞</span>
                      <a href={`tel:${mission.delivery_contact_phone}`} className="text-blue-700 font-medium text-sm hover:underline">
                        {mission.delivery_contact_phone}
                      </a>
                    </div>
                  )}
                  {mission.delivery_date && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm">📅</span>
                      <p className="text-gray-700 text-sm">
                        {new Date(mission.delivery_date).toLocaleString('fr-FR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {mission.scheduled_date && (
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                  <span className="text-xl">📅</span>
                  <div>
                    <p className="font-medium text-gray-900">Date prévue</p>
                    <p className="text-gray-700">
                      {new Date(mission.scheduled_date).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}
              {mission.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">📝 Notes</p>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{mission.notes}</p>
                </div>
              )}
              {mission.price && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <span className="text-xl">💰</span>
                  <div>
                    <p className="font-medium text-gray-900">Prix</p>
                    <p className="text-2xl font-bold text-gray-900">{mission.price}€</p>
                  </div>
                </div>
              )}
              {mission.distance_km && (
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                  <span className="text-xl">📏</span>
                  <div>
                    <p className="font-medium text-gray-900">Distance</p>
                    <p className="text-gray-700">{mission.distance_km} km</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA Ouvrir dans l'app */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <button
            onClick={handleOpenInApp}
            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg flex items-center justify-center gap-2 mb-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Ouvrir dans l'application CHECKSFLEET
          </button>

          <p className="text-center text-gray-500 text-sm mb-4">
            {isMobile
              ? 'Touchez le bouton pour ouvrir l\'application'
              : 'Scannez ce lien avec votre téléphone pour ouvrir l\'application'}
          </p>

          {/* Avantages de rejoindre */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-3 text-center">
              Pourquoi rejoindre cette mission ?
            </h3>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700">Gagnez de l'argent en convoyant des véhicules</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-gray-700">Inspections professionnelles avec photos</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-gray-700">Suivi GPS en temps réel</span>
              </div>
            </div>

            <p className="text-center text-gray-600 text-sm mb-4">
              Téléchargez l'application pour accepter cette mission
            </p>
            <a
              href="https://play.google.com/store/apps/details?id=com.checksfleet.app"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all text-center font-semibold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              Télécharger sur Google Play
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
