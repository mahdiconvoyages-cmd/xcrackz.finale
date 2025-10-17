import { useEffect, useState } from 'react';
import {
  Plus, Search, MapPin, Calendar, Users, Clock, Star, Car,
  PawPrint, Cigarette, Music, Filter, X, Check,
  AlertCircle, Zap, Euro
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AddressAutocomplete from '../components/AddressAutocomplete';
import blablacarImg from '../assets/blablacar.png';

// Alias pour Smoking icon
const SmokingIcon = Cigarette;

// Types
interface Trip {
  id: string;
  driver_id: string;
  departure_address: string;
  departure_city: string;
  departure_datetime: string;
  arrival_address: string;
  arrival_city: string;
  total_seats: number;
  available_seats: number;
  price_per_seat: number;
  status: string;
  allows_pets: boolean;
  allows_smoking: boolean;
  allows_music: boolean;
  chat_level: 'bla' | 'blabla' | 'blablabla';
  max_two_back: boolean;
  luggage_size: 'small' | 'medium' | 'large' | 'xl';
  description: string;
  instant_booking: boolean;
  driver: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    phone?: string;
  };
  driver_rating?: number;
  driver_trips_count?: number;
  driver_verified?: boolean;
  distance_km?: number;
}

interface Booking {
  id: string;
  trip_id: string;
  seats_booked: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show';
  message: string;
  created_at: string;
  trip: Trip;
}

function Covoiturage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'my-trips' | 'my-bookings'>('search');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Search filters
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchSeats, setSearchSeats] = useState('1');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [filterPets, setFilterPets] = useState(false);
  const [filterNonSmoking, setFilterNonSmoking] = useState(false);
  const [filterInstantBooking, setFilterInstantBooking] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Create trip form
  const [formData, setFormData] = useState({
    departure_address: '',
    departure_city: '',
    arrival_address: '',
    arrival_city: '',
    departure_datetime: '',
    total_seats: '3',
    price_per_seat: '',
    allows_pets: false,
    allows_smoking: false,
    allows_music: true,
    chat_level: 'blabla' as 'bla' | 'blabla' | 'blablabla',
    max_two_back: false,
    luggage_size: 'medium' as 'small' | 'medium' | 'large' | 'xl',
    description: '',
    instant_booking: false,
  });

  // Booking form
  const [bookingData, setBookingData] = useState({
    seats_booked: '1',
    message: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'search') {
        await searchTrips();
      } else if (activeTab === 'my-trips') {
        await loadMyTrips();
      } else if (activeTab === 'my-bookings') {
        await loadMyBookings();
      }
    } finally {
      setLoading(false);
    }
  };

  const searchTrips = async () => {
    let query = supabase
      .from('carpooling_trips')
      .select(`
        *,
        driver:profiles!carpooling_trips_driver_id_fkey(id, full_name, email, avatar_url, phone)
      `)
      .eq('status', 'active')
      .gt('available_seats', 0)
      .gte('departure_datetime', new Date().toISOString());

    if (searchFrom) {
      query = query.ilike('departure_city', `%${searchFrom}%`);
    }
    if (searchTo) {
      query = query.ilike('arrival_city', `%${searchTo}%`);
    }
    if (searchDate) {
      const startOfDay = new Date(searchDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(searchDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.gte('departure_datetime', startOfDay.toISOString())
                   .lte('departure_datetime', endOfDay.toISOString());
    }
    if (searchSeats) {
      query = query.gte('available_seats', parseInt(searchSeats));
    }
    if (maxPrice) {
      query = query.lte('price_per_seat', parseFloat(maxPrice));
    }
    if (filterPets) {
      query = query.eq('allows_pets', true);
    }
    if (filterNonSmoking) {
      query = query.eq('allows_smoking', false);
    }
    if (filterInstantBooking) {
      query = query.eq('instant_booking', true);
    }

    const { data, error } = await query.order('departure_datetime', { ascending: true });

    if (error) {
      console.error('Error searching trips:', error);
      return;
    }

    setTrips(data || []);
  };

  const loadMyTrips = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('carpooling_trips')
      .select(`
        *,
        driver:profiles!carpooling_trips_driver_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('driver_id', user.id)
      .order('departure_datetime', { ascending: false });

    if (error) {
      console.error('Error loading trips:', error);
      return;
    }

    setMyTrips(data || []);
  };

  const loadMyBookings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('carpooling_bookings')
      .select(`
        *,
        trip:carpooling_trips(
          *,
          driver:profiles!carpooling_trips_driver_id_fkey(id, full_name, email, avatar_url, phone)
        )
      `)
      .eq('passenger_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading bookings:', error);
      return;
    }

    setMyBookings(data || []);
  };

  // Removed unused price calculation functions

  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation: prix minimum 2€
    if (parseFloat(formData.price_per_seat) < 2) {
      alert('Le prix minimum est de 2€ par place (règle BlaBlaCar)');
      return;
    }

    // Validation: date future uniquement
    const now = new Date();
    const departureDate = new Date(formData.departure_datetime);
    if (departureDate <= now) {
      alert('Impossible de publier un trajet dans le passé');
      return;
    }

    // Vérifier que l'utilisateur a au moins 2 crédits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    console.log('🔍 Profil utilisateur:', profile);
    console.log('💳 Crédits disponibles:', profile?.credits);

    if (profileError) {
      console.error('Erreur chargement profil:', profileError);
      alert('Erreur lors de la vérification des crédits');
      return;
    }

    const userCredits = profile?.credits || 0;

    if (userCredits < 2) {
      alert(`⚠️ Crédits insuffisants !\n\nVous avez ${userCredits} crédits xCrackz.\nVous avez besoin de 2 crédits pour publier un trajet.\n\nRendez-vous dans la boutique pour acheter des crédits.`);
      return;
    }

    const { error } = await supabase
      .from('carpooling_trips')
      .insert([{
        driver_id: user.id,
        ...formData,
        available_seats: parseInt(formData.total_seats),
        total_seats: parseInt(formData.total_seats),
        price_per_seat: parseFloat(formData.price_per_seat),
        status: 'active',
      }]);

    if (error) {
      console.error('Error creating trip:', error);
      alert('Erreur lors de la création du trajet');
      return;
    }

    // Déduire 2 crédits pour publication
    const newCredits = userCredits - 2;
    await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', user.id);

    alert(`✅ Trajet publié avec succès !\n\n💳 2 crédits xCrackz déduits (${newCredits} crédits restants)\n💶 Vous recevrez le paiement en espèces de vos passagers`);

    setShowCreateModal(false);
    resetFormData();
    loadData();
  };

  const resetFormData = () => {
    setFormData({
      departure_address: '',
      departure_city: '',
      arrival_address: '',
      arrival_city: '',
      departure_datetime: '',
      total_seats: '3',
      price_per_seat: '',
      allows_pets: false,
      allows_smoking: false,
      allows_music: true,
      chat_level: 'blabla',
      max_two_back: false,
      luggage_size: 'medium',
      description: '',
      instant_booking: false,
    });
  };

  const bookTrip = async () => {
    if (!user || !selectedTrip) return;

    // Validation: message minimum 20 caractères (règle BlaBlaCar)
    if (bookingData.message.length < 20) {
      alert('Votre message doit contenir au moins 20 caractères pour présenter votre demande au conducteur.');
      return;
    }

    // Vérifier que l'utilisateur a au moins 2 crédits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, blocked_credits')
      .eq('id', user.id)
      .single();

    console.log('🔍 Profil réservation:', profile);
    console.log('💳 Crédits disponibles:', profile?.credits);
    console.log('🔒 Crédits bloqués:', profile?.blocked_credits);

    if (profileError) {
      console.error('Erreur chargement profil:', profileError);
      alert('Erreur lors de la vérification des crédits');
      return;
    }

    const userCredits = profile?.credits || 0;
    const blockedCredits = profile?.blocked_credits || 0;

    if (userCredits < 2) {
      alert(`⚠️ Crédits insuffisants !\n\nVous avez ${userCredits} crédits xCrackz.\nVous avez besoin de 2 crédits pour réserver ce trajet.\n\nRendez-vous dans la boutique pour acheter des crédits.`);
      return;
    }

    const seatsBooked = parseInt(bookingData.seats_booked);
    const tripPrice = seatsBooked * selectedTrip.price_per_seat;

    const { error } = await supabase
      .from('carpooling_bookings')
      .insert([{
        trip_id: selectedTrip.id,
        passenger_id: user.id,
        seats_booked: seatsBooked,
        total_price: tripPrice, // Prix total en espèces à payer au conducteur
        trip_price: tripPrice,
        credit_cost: 2, // 2 crédits bloqués
        status: selectedTrip.instant_booking ? 'confirmed' : 'pending',
        message: bookingData.message,
      }]);

    if (error) {
      console.error('Error booking trip:', error);
      alert('Erreur lors de la réservation');
      return;
    }

    // Bloquer 2 crédits (ne pas déduire tant que le trajet n'est pas confirmé)
    const newCredits = userCredits - 2;
    const newBlockedCredits = blockedCredits + 2;
    
    await supabase
      .from('profiles')
      .update({ 
        credits: newCredits,
        blocked_credits: newBlockedCredits
      })
      .eq('id', user.id);

    alert(`✅ Réservation effectuée !\n\n💳 2 crédits xCrackz bloqués (${newCredits} crédits restants)\n💶 ${tripPrice.toFixed(2)}€ à payer en espèces au conducteur le jour du trajet\n\n${selectedTrip.instant_booking ? '⚡ Réservation instantanée confirmée !' : '⏳ En attente de validation du conducteur...'}`);
    
    setShowBookingModal(false);
    setSelectedTrip(null);
    setBookingData({ seats_booked: '1', message: '' });
    loadData();
  };

  const getChatLevelEmoji = (level: string) => {
    switch (level) {
      case 'bla': return '🤐';
      case 'blabla': return '💬';
      case 'blablabla': return '🗣️';
      default: return '💬';
    }
  };

  // Removed unused getLuggageLabel and getChatLevelLabel functions

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente', icon: Clock },
      confirmed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Confirmé', icon: Check },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Refusé', icon: X },
      cancelled: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Annulé', icon: X },
      completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Terminé', icon: Check },
      no_show: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Absent', icon: AlertCircle },
      active: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Actif', icon: Car },
      full: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Complet', icon: Users },
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50">
      {/* Hero Section Modernisé avec Image */}
      <div className="relative bg-slate-900 text-white overflow-hidden min-h-[500px]">
        {/* Image de fond BlaBlacar - Plus visible */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{
            backgroundImage: `url(${blablacarImg})`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-teal-900/20 to-cyan-900/30"></div>
        
        <div className="container mx-auto px-6 py-20 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Titre */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full mb-6 border border-white/20">
                <Car className="w-6 h-6 text-teal-400 animate-pulse" />
                <span className="text-teal-400 font-bold text-sm uppercase tracking-wider">
                  Plateforme de Covoiturage
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
                <span className="text-white drop-shadow-2xl">
                  Voyagez malin,{' '}
                </span>
                <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-2xl">
                  partagez vos trajets
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-10 drop-shadow-lg max-w-3xl mx-auto">
                Économique, écologique et convivial. Trouvez ou proposez un trajet en quelques clics 🚗✨
              </p>
            </div>
            
            {/* Barre de recherche modernisée avec Glassmorphism ULTRA TRANSPARENT */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/20">
              <div className="grid md:grid-cols-4 gap-6">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <MapPin className="w-5 h-5 text-blue-500" />
                  </div>
                  <AddressAutocomplete
                    value={searchFrom}
                    onChange={(address) => setSearchFrom(address)}
                    placeholder="Ville de départ"
                    className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-md border-2 border-white/30 rounded-2xl focus:border-blue-400 focus:bg-white/70 focus:outline-none font-semibold text-slate-800 placeholder:text-slate-500 hover:bg-white/70 transition-all shadow-lg"
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <MapPin className="w-5 h-5 text-teal-500" />
                  </div>
                  <AddressAutocomplete
                    value={searchTo}
                    onChange={(address) => setSearchTo(address)}
                    placeholder="Ville d'arrivée"
                    className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-md border-2 border-white/30 rounded-2xl focus:border-teal-400 focus:bg-white/70 focus:outline-none font-semibold text-slate-800 placeholder:text-slate-500 hover:bg-white/70 transition-all shadow-lg"
                  />
                </div>
                
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <Calendar className="w-5 h-5 text-purple-500" />
                  </div>
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-md border-2 border-white/30 rounded-2xl focus:border-purple-400 focus:bg-white/70 focus:outline-none font-semibold text-slate-800 hover:bg-white/70 transition-all shadow-lg"
                  />
                </div>
                
                <button
                  onClick={() => {
                    setActiveTab('search');
                    searchTrips();
                  }}
                  className="bg-gradient-to-r from-blue-500 via-teal-500 to-cyan-500 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 group"
                >
                  <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Rechercher</span>
                </button>
              </div>
              
              {/* Stats rapides avec Glassmorphism */}
              <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-white/30">
                <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-3xl font-black text-white drop-shadow-lg mb-1">2000+</div>
                  <div className="text-sm text-white/90 font-medium">Trajets publiés</div>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-3xl font-black text-white drop-shadow-lg mb-1">500+</div>
                  <div className="text-sm text-white/90 font-medium">Conducteurs actifs</div>
                </div>
                <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                  <div className="text-3xl font-black text-white drop-shadow-lg mb-1">4.8/5</div>
                  <div className="text-sm text-white/90 font-medium">Note moyenne</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons d'actions flottants */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-teal-500/50 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Publier un trajet
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                showFilters
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white/60 backdrop-blur-md text-slate-700 hover:bg-white/80 border border-white/40'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filtres
              {showFilters && <X className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Filtres avancés avec Glassmorphism ULTRA TRANSPARENT */}
      {showFilters && (
        <div className="bg-gradient-to-r from-blue-50/30 to-teal-50/30 border-b border-slate-200/50 shadow-inner backdrop-blur-sm">
          <div className="container mx-auto px-6 py-6">
            <div className="max-w-6xl mx-auto bg-white/15 backdrop-blur-lg rounded-2xl p-6 shadow-lg border border-white/25">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Nombre de places
                  </label>
                  <select
                    value={searchSeats}
                    onChange={(e) => setSearchSeats(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-white/30 rounded-xl focus:border-blue-500 focus:bg-white/60 focus:outline-none font-semibold hover:bg-white/60 transition-all shadow-md"
                  >
                    <option value="">Toutes</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} place{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Euro className="w-4 h-4 text-green-600" />
                    Prix maximum
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 20€"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-white/30 rounded-xl focus:border-blue-500 focus:bg-white/60 focus:outline-none font-semibold hover:bg-white/60 transition-all shadow-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Note minimum
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border-2 border-white/30 rounded-xl focus:border-blue-500 focus:bg-white/60 focus:outline-none font-semibold hover:bg-white/60 transition-all shadow-md"
                  >
                    <option value="">Toutes les notes</option>
                    <option value="4.5">⭐ 4.5+</option>
                    <option value="4.0">⭐ 4.0+</option>
                    <option value="3.5">⭐ 3.5+</option>
                  </select>
                </div>
              </div>
              
              {/* Options de préférences avec transparence */}
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <label className="flex items-center gap-3 cursor-pointer bg-orange-500/5 backdrop-blur-sm border-2 border-orange-200/30 rounded-xl px-4 py-3 hover:bg-orange-500/15 transition-all shadow-md">
                  <input
                    type="checkbox"
                    checked={filterPets}
                    onChange={(e) => setFilterPets(e.target.checked)}
                    className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <PawPrint className="w-5 h-5 text-orange-600" />
                    Accepte les animaux
                  </span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer bg-green-500/5 backdrop-blur-sm border-2 border-green-200/30 rounded-xl px-4 py-3 hover:bg-green-500/15 transition-all shadow-md">
                  <input
                    type="checkbox"
                    checked={filterNonSmoking}
                    onChange={(e) => setFilterNonSmoking(e.target.checked)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Cigarette className="w-5 h-5 text-red-500 line-through" />
                    Non-fumeur uniquement
                  </span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer bg-yellow-500/5 backdrop-blur-sm border-2 border-yellow-200/30 rounded-xl px-4 py-3 hover:bg-yellow-500/15 transition-all shadow-md">
                  <input
                    type="checkbox"
                    checked={filterInstantBooking}
                    onChange={(e) => setFilterInstantBooking(e.target.checked)}
                    className="w-5 h-5 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
                  />
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    Réservation instantanée
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        {/* Tabs */}
        <div className="flex flex-wrap gap-4 mb-8 bg-white rounded-2xl p-2 shadow-lg max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            Rechercher
          </button>
          
          <button
            onClick={() => setActiveTab('my-trips')}
            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'my-trips'
                ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Car className="w-5 h-5 inline mr-2" />
            Mes trajets
          </button>
          
          <button
            onClick={() => setActiveTab('my-bookings')}
            className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'my-bookings'
                ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white shadow-lg'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Mes réservations
          </button>
        </div>

        {/* Create Trip Button */}
        {user && activeTab === 'my-trips' && (
          <div className="text-center mb-8">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-8 py-4 rounded-2xl font-bold hover:from-blue-600 hover:to-teal-600 transition-all shadow-xl hover:shadow-2xl flex items-center gap-3 mx-auto"
            >
              <Plus className="w-6 h-6" />
              Publier un trajet
            </button>
          </div>
        )}

        {/* Content based on active tab */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600 font-semibold">Chargement...</p>
          </div>
        ) : (
          <>
            {/* Search Results */}
            {activeTab === 'search' && (
              <div className="space-y-6">
                {trips.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
                    <Car className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Aucun trajet trouvé</h3>
                    <p className="text-slate-600">Essayez de modifier vos critères de recherche</p>
                  </div>
                ) : (
                  trips.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onClick={() => {
                        setSelectedTrip(trip);
                        setShowBookingModal(true);
                      }}
                      getChatLevelEmoji={getChatLevelEmoji}
                      formatDate={formatDate}
                      formatPrice={formatPrice}
                    />
                  ))
                )}
              </div>
            )}

            {/* My Trips */}
            {activeTab === 'my-trips' && (
              <div className="space-y-6">
                {myTrips.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
                    <Car className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Aucun trajet publié</h3>
                    <p className="text-slate-600 mb-6">Commencez à partager vos trajets dès maintenant</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-gradient-to-r from-blue-500 to-teal-500 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-600 hover:to-teal-600 transition-all shadow-lg"
                    >
                      Publier mon premier trajet
                    </button>
                  </div>
                ) : (
                  myTrips.map((trip) => (
                    <MyTripCard
                      key={trip.id}
                      trip={trip}
                      getStatusBadge={getStatusBadge}
                      formatDate={formatDate}
                      formatPrice={formatPrice}
                    />
                  ))
                )}
              </div>
            )}

            {/* My Bookings */}
            {activeTab === 'my-bookings' && (
              <div className="space-y-6">
                {myBookings.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Aucune réservation</h3>
                    <p className="text-slate-600">Recherchez un trajet pour commencer</p>
                  </div>
                ) : (
                  myBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      getStatusBadge={getStatusBadge}
                      formatDate={formatDate}
                      formatPrice={formatPrice}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Trip Modal */}
      {showCreateModal && (
        <CreateTripModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={createTrip}
          onClose={() => {
            setShowCreateModal(false);
            resetFormData();
          }}
          getChatLevelEmoji={getChatLevelEmoji}
        />
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedTrip && (
        <BookingModal
          trip={selectedTrip}
          bookingData={bookingData}
          setBookingData={setBookingData}
          onSubmit={bookTrip}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedTrip(null);
            setBookingData({ seats_booked: '1', message: '' });
          }}
          formatPrice={formatPrice}
        />
      )}
    </div>
  );
}

// ============================================
// COMPOSANTS SOUS-MODULES
// ============================================

// TripCard - Affichage d'un trajet dans les résultats de recherche
function TripCard({ 
  trip, 
  onClick, 
  formatDate, 
  formatPrice, 
  getChatLevelEmoji 
}: { 
  trip: Trip;
  onClick: () => void;
  formatDate: (date: string) => string;
  formatPrice: (price: number) => string;
  getChatLevelEmoji: (level: string) => string;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all cursor-pointer"
    >
      {/* En-tête avec conducteur */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold">
            {trip.driver?.full_name?.[0] || 'U'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{trip.driver?.full_name || 'Conducteur'}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>4.8</span>
              <span className="text-gray-400">•</span>
              <span>12 trajets</span>
            </div>
          </div>
        </div>
        {trip.instant_booking && (
          <div className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <Zap className="w-4 h-4" />
            Instantané
          </div>
        )}
      </div>

      {/* Trajet */}
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <div className="w-0.5 h-8 bg-gray-300"></div>
            <div className="w-3 h-3 rounded-full bg-teal-500"></div>
          </div>
          <div className="flex-1">
            <div className="mb-3">
              <div className="font-semibold text-gray-900">{trip.departure_city}</div>
              <div className="text-sm text-gray-600">{formatDate(trip.departure_datetime)}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{trip.arrival_city}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Préférences */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <div className="flex items-center gap-1 text-gray-600">
          {getChatLevelEmoji(trip.chat_level)}
          <span className="capitalize">{trip.chat_level}</span>
        </div>
        {trip.allows_pets && (
          <div className="flex items-center gap-1 text-green-600">
            <PawPrint className="w-4 h-4" />
            Animaux
          </div>
        )}
        {!trip.allows_smoking && (
          <div className="flex items-center gap-1 text-gray-600">
            <SmokingIcon className="w-4 h-4" />
            Non-fumeur
          </div>
        )}
      </div>

      {/* Prix et places */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span className="text-sm">{trip.available_seats} place{trip.available_seats > 1 ? 's' : ''}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">
          {formatPrice(trip.price_per_seat)}
          <span className="text-sm font-normal text-gray-500">/place</span>
        </div>
      </div>
    </div>
  );
}

// MyTripCard - Affichage des trajets du conducteur
function MyTripCard({ 
  trip, 
  formatDate, 
  formatPrice, 
  getStatusBadge 
}: { 
  trip: Trip;
  formatDate: (date: string) => string;
  formatPrice: (price: number) => string;
  getStatusBadge: (status: string) => any;
}) {
  const badge = getStatusBadge(trip.status);
  const StatusIcon = badge.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Statut */}
      <div className="flex items-center justify-between mb-4">
        <div className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2`}>
          <StatusIcon className="w-4 h-4" />
          {badge.label}
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Trajet */}
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <MapPin className="w-5 h-5 text-blue-500" />
            <div className="w-0.5 h-8 bg-gray-300"></div>
            <MapPin className="w-5 h-5 text-teal-500" />
          </div>
          <div className="flex-1">
            <div className="mb-3">
              <div className="font-semibold text-gray-900">{trip.departure_city}</div>
              <div className="text-sm text-gray-600">{trip.departure_address}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{trip.arrival_city}</div>
              <div className="text-sm text-gray-600">{trip.arrival_address}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Date et heure */}
      <div className="flex items-center gap-2 mb-4 text-gray-600">
        <Calendar className="w-4 h-4" />
        <span className="text-sm">{formatDate(trip.departure_datetime)}</span>
      </div>

      {/* Places et prix */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="w-4 h-4" />
            <span className="text-sm">
              {trip.available_seats}/{trip.total_seats} disponible{trip.available_seats > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="text-xl font-bold text-gray-900">{formatPrice(trip.price_per_seat)}</div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
          Modifier
        </button>
        <button className="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}

// BookingCard - Affichage des réservations du passager
function BookingCard({ 
  booking, 
  getStatusBadge, 
  formatDate, 
  formatPrice 
}: { 
  booking: any;
  getStatusBadge: (status: string) => any;
  formatDate: (date: string) => string;
  formatPrice: (price: number) => string;
}) {
  const badge = getStatusBadge(booking.status);
  const StatusIcon = badge.icon;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Statut et conducteur */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold">
            {booking.trip?.driver?.full_name?.[0] || 'C'}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{booking.trip?.driver?.full_name || 'Conducteur'}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>4.8</span>
            </div>
          </div>
        </div>
        <div className={`${badge.bg} ${badge.text} px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2`}>
          <StatusIcon className="w-4 h-4" />
          {badge.label}
        </div>
      </div>

      {/* Trajet */}
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <MapPin className="w-5 h-5 text-blue-500" />
            <div className="w-0.5 h-8 bg-gray-300"></div>
            <MapPin className="w-5 h-5 text-teal-500" />
          </div>
          <div className="flex-1">
            <div className="mb-3">
              <div className="font-semibold text-gray-900">{booking.trip?.departure_city}</div>
            </div>
            <div>
              <div className="font-semibold text-gray-900">{booking.trip?.arrival_city}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 mb-4 text-gray-600">
        <Calendar className="w-4 h-4" />
        <span className="text-sm">{booking.trip && formatDate(booking.trip.departure_datetime)}</span>
      </div>

      {/* Places et prix */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="w-4 h-4" />
          <span className="text-sm">{booking.seats_booked} place{booking.seats_booked > 1 ? 's' : ''}</span>
        </div>
        <div>
          <div className="text-xl font-bold text-gray-900">{formatPrice(booking.total_price)}</div>
          <div className="text-xs text-gray-500 text-right">+ 2 crédits</div>
        </div>
      </div>

      {/* Actions selon statut */}
      {booking.status === 'pending' && (
        <div className="mt-4">
          <button className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
            Annuler la réservation
          </button>
        </div>
      )}
    </div>
  );
}

// CreateTripModal - Modal de création de trajet
function CreateTripModal({
  formData,
  setFormData,
  onSubmit,
  onClose,
  getChatLevelEmoji,
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  getChatLevelEmoji: (level: string) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Publier un trajet</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">Coût : 2 crédits xCrackz</p>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Départ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse de départ complète *
            </label>
            <AddressAutocomplete
              value={formData.departure_address}
              onChange={(address) => {
                // Extraire la ville de l'adresse
                const parts = address.split(',').map(p => p.trim());
                const cityPart = parts[parts.length - 1]; // Dernière partie = ville + code postal
                const city = cityPart.replace(/\d{5}/, '').trim(); // Retirer code postal
                
                setFormData({ 
                  ...formData, 
                  departure_address: address,
                  departure_city: city || parts[parts.length - 2] || '' 
                });
              }}
              placeholder="Ex: 18 Rue de Dunkerque, 75010 Paris"
              required
            />
            {formData.departure_city && (
              <p className="text-sm text-gray-500 mt-1">Ville: {formData.departure_city}</p>
            )}
          </div>

          {/* Arrivée */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse d'arrivée complète *
            </label>
            <AddressAutocomplete
              value={formData.arrival_address}
              onChange={(address) => {
                // Extraire la ville de l'adresse
                const parts = address.split(',').map(p => p.trim());
                const cityPart = parts[parts.length - 1]; // Dernière partie = ville + code postal
                const city = cityPart.replace(/\d{5}/, '').trim(); // Retirer code postal
                
                setFormData({ 
                  ...formData, 
                  arrival_address: address,
                  arrival_city: city || parts[parts.length - 2] || ''
                });
              }}
              placeholder="Ex: 5 Place Charles Béraudier, 69003 Lyon"
              required
            />
            {formData.arrival_city && (
              <p className="text-sm text-gray-500 mt-1">Ville: {formData.arrival_city}</p>
            )}
          </div>

          {/* Date et heure */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date et heure de départ *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.departure_datetime}
                onChange={(e) => setFormData({ ...formData, departure_datetime: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Places disponibles *
              </label>
              <select
                required
                value={formData.total_seats}
                onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n} place{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Prix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix par place (minimum 2€) *
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="2"
                step="0.5"
                value={formData.price_per_seat}
                onChange={(e) => setFormData({ ...formData, price_per_seat: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="15"
              />
              <span className="absolute right-4 top-2 text-gray-500">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              💡 Prix recommandé basé sur la distance (0,05-0,09€/km)
            </p>
          </div>

          {/* Préférences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Préférences de voyage
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allows_pets}
                  onChange={(e) => setFormData({ ...formData, allows_pets: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <PawPrint className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Animaux acceptés</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allows_smoking}
                  onChange={(e) => setFormData({ ...formData, allows_smoking: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <SmokingIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Fumeurs acceptés</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allows_music}
                  onChange={(e) => setFormData({ ...formData, allows_music: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <Music className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">Musique</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.instant_booking}
                  onChange={(e) => setFormData({ ...formData, instant_booking: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <Zap className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-gray-700">Réservation instantanée</span>
              </label>
            </div>
          </div>

          {/* Niveau de chat */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ambiance de voyage
            </label>
            <select
              value={formData.chat_level}
              onChange={(e) => setFormData({ ...formData, chat_level: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="bla">{getChatLevelEmoji('bla')} Bla - Je préfère le silence</option>
              <option value="blabla">{getChatLevelEmoji('blabla')} BlaBla - J'aime discuter</option>
              <option value="blablabla">{getChatLevelEmoji('blablabla')} BlaBlaBla - Très bavard</option>
            </select>
          </div>

          {/* Taille bagages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bagages autorisés
            </label>
            <select
              value={formData.luggage_size}
              onChange={(e) => setFormData({ ...formData, luggage_size: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="small">🎒 Petit sac à dos uniquement</option>
              <option value="medium">👜 Sac de taille moyenne</option>
              <option value="large">🧳 Grand sac / Valise</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optionnel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              maxLength={1000}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Informations complémentaires sur le trajet..."
            />
            <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000</p>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all font-medium"
            >
              Publier le trajet (2 crédits)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// BookingModal - Modal de réservation
function BookingModal({
  trip,
  bookingData,
  setBookingData,
  onSubmit,
  onClose,
  formatPrice,
}: {
  trip: Trip;
  bookingData: any;
  setBookingData: (data: any) => void;
  onSubmit: () => void;
  onClose: () => void;
  formatPrice: (price: number) => string;
}) {
  const seatsBooked = parseInt(bookingData.seats_booked) || 1;
  const tripPrice = seatsBooked * trip.price_per_seat;
  const messageLength = bookingData.message.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Réserver ce trajet</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Trajet */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex flex-col items-center">
                <MapPin className="w-5 h-5 text-blue-500" />
                <div className="w-0.5 h-8 bg-gray-300"></div>
                <MapPin className="w-5 h-5 text-teal-500" />
              </div>
              <div className="flex-1">
                <div className="mb-3">
                  <div className="font-semibold text-gray-900">{trip.departure_city}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{trip.arrival_city}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{new Date(trip.departure_datetime).toLocaleString('fr-FR')}</span>
            </div>
          </div>

          {/* Nombre de places */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de places *
            </label>
            <select
              value={bookingData.seats_booked}
              onChange={(e) => setBookingData({ ...bookingData, seats_booked: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Array.from({ length: trip.available_seats }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} place{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message au conducteur * (minimum 20 caractères)
            </label>
            <textarea
              value={bookingData.message}
              onChange={(e) => setBookingData({ ...bookingData, message: e.target.value })}
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                messageLength > 0 && messageLength < 20 ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Présentez-vous au conducteur et expliquez votre demande..."
            />
            <div className="flex items-center justify-between mt-1">
              <p className={`text-xs ${messageLength >= 20 ? 'text-green-600' : 'text-gray-500'}`}>
                {messageLength}/20 caractères minimum
              </p>
              {messageLength > 0 && messageLength < 20 && (
                <p className="text-xs text-red-600">
                  Encore {20 - messageLength} caractères requis
                </p>
              )}
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Récapitulatif</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Prix du trajet ({seatsBooked} place{seatsBooked > 1 ? 's' : ''})</span>
                <span className="font-semibold">{formatPrice(tripPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frais de réservation</span>
                <span className="font-semibold text-blue-600">2 crédits xCrackz</span>
              </div>
              <div className="border-t border-blue-200 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total à payer</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{formatPrice(tripPrice)}</div>
                    <div className="text-xs text-gray-600">en espèces au conducteur</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 mt-3">
              <p className="text-xs text-gray-600">
                💡 <strong>Paiement en 2 temps :</strong><br />
                • 2 crédits bloqués maintenant (remboursés si annulation &gt; 24h)<br />
                • {formatPrice(tripPrice)} en espèces au conducteur le jour du départ
              </p>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onSubmit}
              disabled={messageLength < 20}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-teal-600 text-white rounded-lg hover:from-blue-700 hover:to-teal-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmer (2 crédits)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Covoiturage;

// Trip Card Component (continued in next message due to length...)
