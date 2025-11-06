import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, MapPin, Star, Calendar, Car, Shield, Award, 
  MessageCircle, Phone, Mail, CheckCircle, Clock, TrendingUp,
  Users, Navigation, Fuel, Heart
} from 'lucide-react';

interface DriverProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  photo_url: string;
  bio: string;
  languages: string[];
  experience_years: number;
  total_missions_completed: number;
  total_km_driven: number;
  member_since: string;
  vehicles: any[];
  is_available: boolean;
  availability_status: string;
  current_location: any;
  is_identity_verified: boolean;
  is_license_verified: boolean;
  badges: string[];
  average_rating: number;
  total_reviews: number;
  reliability_score: number;
  response_time_minutes: number;
  preferences: any;
}

interface Review {
  id: string;
  reviewer_id: string;
  overall_rating: number;
  punctuality_rating: number;
  driving_rating: number;
  communication_rating: number;
  vehicle_cleanliness_rating: number;
  comment: string;
  badges: string[];
  created_at: string;
  reviewer: {
    full_name: string;
    photo_url: string;
  };
}

interface Statistics {
  total_rides_as_driver: number;
  total_rides_as_passenger: number;
  total_km_as_driver: number;
  total_earnings: number;
  on_time_percentage: number;
  response_rate: number;
  co2_saved_kg: number;
}

const DriverProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [activeTab, setActiveTab] = useState<'about' | 'reviews' | 'stats'>('about');
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (userId) {
      fetchDriverProfile();
      fetchReviews();
      fetchStatistics();
      checkIfFavorite();
    }
  }, [userId]);

  const fetchDriverProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('ride_reviews')
        .select(`
          *,
          reviewer:reviewer_id (
            full_name,
            photo_url
          )
        `)
        .eq('reviewed_user_id', userId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Erreur chargement avis:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_statistics')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setStatistics(data);
    } catch (error) {
      console.error('Erreur chargement statistiques:', error);
    }
  };

  const checkIfFavorite = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('favorite_type', 'contact')
        .eq('favorite_user_id', userId)
        .single();

      setIsFavorite(!!data);
    } catch (error) {
      // Pas encore favori
    }
  };

  const toggleFavorite = async () => {
    if (!user) return;

    try {
      if (isFavorite) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('favorite_user_id', userId);
        setIsFavorite(false);
      } else {
        await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            favorite_type: 'contact',
            favorite_user_id: userId,
            notify_new_rides: true
          });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Erreur toggle favori:', error);
    }
  };

  const startConversation = async () => {
    if (!user || !userId) return;

    try {
      // Créer ou récupérer conversation
      const { data: existingConv } = await supabase
        .from('ride_conversations')
        .select('id')
        .contains('participants', [user.id, userId])
        .single();

      if (existingConv) {
        navigate(`/messages/${existingConv.id}`);
      } else {
        const { data: newConv, error } = await supabase
          .from('ride_conversations')
          .insert({
            participants: [user.id, userId],
            is_group_chat: false
          })
          .select()
          .single();

        if (error) throw error;
        navigate(`/messages/${newConv.id}`);
      }
    } catch (error) {
      console.error('Erreur création conversation:', error);
    }
  };

  const getBadgeIcon = (badge: string) => {
    const icons: { [key: string]: JSX.Element } = {
      professional: <Award className="w-4 h-4 text-blue-500" />,
      verified: <CheckCircle className="w-4 h-4 text-green-500" />,
      top_rated: <Star className="w-4 h-4 text-yellow-500" />,
      eco_driver: <Fuel className="w-4 h-4 text-green-600" />
    };
    return icons[badge] || <Award className="w-4 h-4" />;
  };

  const getBadgeLabel = (badge: string) => {
    const labels: { [key: string]: string } = {
      professional: 'Professionnel',
      verified: 'Vérifié',
      top_rated: 'Top Noté',
      eco_driver: 'Éco-conducteur'
    };
    return labels[badge] || badge;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <User className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Profil non trouvé</h2>
        <button
          onClick={() => navigate('/covoiturage')}
          className="text-blue-600 hover:underline"
        >
          Retour aux trajets
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* En-tête du profil */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          
          <div className="px-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16">
              <div className="flex items-end space-x-4">
                <img
                  src={profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}`}
                  alt={profile.full_name}
                  className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                />
                
                <div className="mb-2">
                  <div className="flex items-center space-x-2">
                    <h1 className="text-3xl font-bold text-gray-900">{profile.full_name}</h1>
                    {profile.is_identity_verified && (
                      <CheckCircle className="w-6 h-6 text-blue-500" title="Identité vérifiée" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-2 text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{profile.average_rating.toFixed(1)}</span>
                      <span className="text-sm">({profile.total_reviews} avis)</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        Membre depuis {new Date(profile.member_since).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  {profile.badges && profile.badges.length > 0 && (
                    <div className="flex items-center space-x-2 mt-3">
                      {profile.badges.map((badge) => (
                        <div
                          key={badge}
                          className="flex items-center space-x-1 bg-gray-100 px-3 py-1 rounded-full"
                          title={getBadgeLabel(badge)}
                        >
                          {getBadgeIcon(badge)}
                          <span className="text-xs font-medium text-gray-700">{getBadgeLabel(badge)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!isOwnProfile && (
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                  <button
                    onClick={toggleFavorite}
                    className={`p-3 rounded-full ${
                      isFavorite ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    } hover:bg-opacity-80 transition`}
                    title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  
                  <button
                    onClick={startConversation}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Envoyer un message</span>
                  </button>
                </div>
              )}

              {isOwnProfile && (
                <button
                  onClick={() => navigate('/profile/edit')}
                  className="mt-4 md:mt-0 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition"
                >
                  Modifier le profil
                </button>
              )}
            </div>

            {/* Statut de disponibilité */}
            <div className="mt-4 flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                profile.availability_status === 'available' ? 'bg-green-500' :
                profile.availability_status === 'busy' ? 'bg-orange-500' : 'bg-gray-400'
              }`}></div>
              <span className="text-sm font-medium text-gray-700">
                {profile.availability_status === 'available' ? 'Disponible' :
                 profile.availability_status === 'busy' ? 'Occupé' : 'Hors ligne'}
              </span>
            </div>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Trajets effectués</p>
                <p className="text-2xl font-bold text-gray-900">{profile.total_missions_completed}</p>
              </div>
              <Navigation className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kilomètres parcourus</p>
                <p className="text-2xl font-bold text-gray-900">{profile.total_km_driven.toLocaleString()}</p>
              </div>
              <MapPin className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fiabilité</p>
                <p className="text-2xl font-bold text-gray-900">{profile.reliability_score}%</p>
              </div>
              <Shield className="w-10 h-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Temps de réponse</p>
                <p className="text-2xl font-bold text-gray-900">{profile.response_time_minutes}min</p>
              </div>
              <Clock className="w-10 h-10 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('about')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'about'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                À propos
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reviews'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Avis ({profile.total_reviews})
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Statistiques
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Tab: À propos */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                {/* Bio */}
                {profile.bio && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Biographie</h3>
                    <p className="text-gray-700">{profile.bio}</p>
                  </div>
                )}

                {/* Expérience */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Expérience</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-blue-500" />
                      <div>
                        <p className="text-sm text-gray-600">Années d'expérience</p>
                        <p className="text-lg font-semibold text-gray-900">{profile.experience_years} ans</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                      <Users className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="text-sm text-gray-600">Langues parlées</p>
                        <p className="text-lg font-semibold text-gray-900">{profile.languages.join(', ')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Véhicules */}
                {profile.vehicles && profile.vehicles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Véhicules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.vehicles.map((vehicle: any, index: number) => (
                        <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                          <Car className="w-8 h-8 text-gray-600" />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {vehicle.brand} {vehicle.model}
                            </p>
                            <p className="text-sm text-gray-600">{vehicle.year} • {vehicle.seats} places</p>
                            {vehicle.plate && (
                              <p className="text-xs text-gray-500 mt-1">{vehicle.plate}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Préférences */}
                {profile.preferences && Object.keys(profile.preferences).length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Préférences de voyage</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {profile.preferences.smoking !== undefined && (
                        <div className={`p-3 rounded-lg text-center ${profile.preferences.smoking ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                          <p className="text-sm font-medium">{profile.preferences.smoking ? '🚬 Fumeur' : '🚭 Non-fumeur'}</p>
                        </div>
                      )}
                      {profile.preferences.pets !== undefined && (
                        <div className={`p-3 rounded-lg text-center ${profile.preferences.pets ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}`}>
                          <p className="text-sm font-medium">{profile.preferences.pets ? '🐕 Animaux OK' : '🚫 Pas d\'animaux'}</p>
                        </div>
                      )}
                      {profile.preferences.music !== undefined && (
                        <div className={`p-3 rounded-lg text-center ${profile.preferences.music ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-700'}`}>
                          <p className="text-sm font-medium">{profile.preferences.music ? '🎵 Musique' : '🔇 Silence'}</p>
                        </div>
                      )}
                      {profile.preferences.conversation_level && (
                        <div className="p-3 rounded-lg text-center bg-indigo-50 text-indigo-700">
                          <p className="text-sm font-medium">💬 {profile.preferences.conversation_level}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Vérifications */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Vérifications</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className={`w-5 h-5 ${profile.is_identity_verified ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={profile.is_identity_verified ? 'text-gray-900' : 'text-gray-500'}>
                        Identité vérifiée
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className={`w-5 h-5 ${profile.is_license_verified ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={profile.is_license_verified ? 'text-gray-900' : 'text-gray-500'}>
                        Permis vérifié
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Avis */}
            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {reviews.length === 0 ? (
                  <div className="text-center py-12">
                    <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun avis pour le moment</p>
                  </div>
                ) : (
                  reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                      <div className="flex items-start space-x-4">
                        <img
                          src={review.reviewer.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.reviewer.full_name)}`}
                          alt={review.reviewer.full_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{review.reviewer.full_name}</h4>
                              <p className="text-sm text-gray-500">
                                {new Date(review.created_at).toLocaleDateString('fr-FR', { 
                                  day: 'numeric', 
                                  month: 'long', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                            {renderStars(review.overall_rating)}
                          </div>

                          {review.comment && (
                            <p className="text-gray-700 mb-3">{review.comment}</p>
                          )}

                          {/* Notes détaillées */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            {review.punctuality_rating && (
                              <div className="text-sm">
                                <span className="text-gray-600">Ponctualité:</span>
                                <span className="ml-1 font-medium">{review.punctuality_rating}/5</span>
                              </div>
                            )}
                            {review.driving_rating && (
                              <div className="text-sm">
                                <span className="text-gray-600">Conduite:</span>
                                <span className="ml-1 font-medium">{review.driving_rating}/5</span>
                              </div>
                            )}
                            {review.communication_rating && (
                              <div className="text-sm">
                                <span className="text-gray-600">Communication:</span>
                                <span className="ml-1 font-medium">{review.communication_rating}/5</span>
                              </div>
                            )}
                            {review.vehicle_cleanliness_rating && (
                              <div className="text-sm">
                                <span className="text-gray-600">Propreté:</span>
                                <span className="ml-1 font-medium">{review.vehicle_cleanliness_rating}/5</span>
                              </div>
                            )}
                          </div>

                          {/* Badges du review */}
                          {review.badges && review.badges.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {review.badges.map((badge, idx) => (
                                <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Statistiques */}
            {activeTab === 'stats' && statistics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-blue-900 mb-4">Activité</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Trajets comme conducteur</span>
                        <span className="font-bold text-blue-900">{statistics.total_rides_as_driver}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Trajets comme passager</span>
                        <span className="font-bold text-blue-900">{statistics.total_rides_as_passenger}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Kilomètres parcourus</span>
                        <span className="font-bold text-blue-900">{statistics.total_km_as_driver.toLocaleString()} km</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-green-900 mb-4">Performance</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-green-700">Ponctualité</span>
                        <span className="font-bold text-green-900">{statistics.on_time_percentage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Taux de réponse</span>
                        <span className="font-bold text-green-900">{statistics.response_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">CO₂ économisé</span>
                        <span className="font-bold text-green-900">{statistics.co2_saved_kg} kg</span>
                      </div>
                    </div>
                  </div>

                  {statistics.total_earnings > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold text-purple-900 mb-4">Revenus</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-purple-700">Revenus totaux</span>
                          <span className="font-bold text-purple-900">{statistics.total_earnings.toFixed(2)} €</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverProfilePage;
