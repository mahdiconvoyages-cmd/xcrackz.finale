/**
 * Service de Covoiturage Complet - CheckFlow
 * 
 * Fonctionnalités :
 * - Rechercher des trajets disponibles
 * - Publier un trajet (coût : 2 crédits)
 * - Réserver un trajet (coût : 2 crédits + prix en espèces)
 * - Gérer les crédits (déduction auto, remboursement si annulation >24h)
 */

import { supabase } from '@/lib/supabase';

// ==========================================
// TYPES
// ==========================================

export interface TripSearchCriteria {
  departure_city: string;
  arrival_city: string;
  departure_date: string; // Format: 'YYYY-MM-DD'
  min_seats?: number;
  max_price_per_seat?: number;
  allows_pets?: boolean;
  instant_booking?: boolean;
}

export interface CarpoolingTrip {
  id: string;
  driver_id: string;
  driver_name?: string;
  driver_rating?: number;
  departure_address: string;
  departure_city: string;
  departure_datetime: string;
  arrival_address: string;
  arrival_city: string;
  total_seats: number;
  available_seats: number;
  price_per_seat: number;
  status: 'active' | 'cancelled' | 'completed' | 'full';
  allows_pets: boolean;
  allows_smoking: boolean;
  allows_music: boolean;
  chat_level: 'bla' | 'blabla' | 'blablabla';
  max_two_back: boolean;
  luggage_size: 'small' | 'medium' | 'large' | 'xl';
  instant_booking: boolean;
  description?: string;
  created_at: string;
}

export interface TripPublishData {
  departure_address: string;
  departure_city: string;
  departure_datetime: string; // ISO format
  arrival_address: string;
  arrival_city: string;
  total_seats: number;
  price_per_seat: number;
  allows_pets?: boolean;
  allows_smoking?: boolean;
  allows_music?: boolean;
  chat_level?: 'bla' | 'blabla' | 'blablabla';
  max_two_back?: boolean;
  luggage_size?: 'small' | 'medium' | 'large' | 'xl';
  instant_booking?: boolean;
  description?: string;
}

export interface BookingData {
  trip_id: string;
  seats_booked: number;
  message: string; // Min 20 caractères
}

export interface CarpoolingBooking {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats_booked: number;
  total_price: number;
  trip_price: number;
  credit_cost: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show';
  message: string;
  created_at: string;
}

// ==========================================
// 1. RECHERCHER DES TRAJETS
// ==========================================

/**
 * Recherche des trajets de covoiturage disponibles
 * 
 * @param userId - ID de l'utilisateur
 * @param criteria - Critères de recherche
 * @returns Liste des trajets disponibles avec infos conducteur
 */
export async function searchTrips(
  userId: string,
  criteria: TripSearchCriteria
): Promise<{ success: boolean; trips: CarpoolingTrip[]; message: string }> {
  try {
    // Construire la requête de base
    let query = supabase
      .from('carpooling_trips')
      .select(`
        *,
        driver:profiles!driver_id(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('status', 'active')
      .eq('departure_city', criteria.departure_city)
      .eq('arrival_city', criteria.arrival_city)
      .gte('departure_datetime', criteria.departure_date)
      .lt('departure_datetime', `${criteria.departure_date}T23:59:59`)
      .gt('available_seats', 0);

    // Filtres optionnels
    if (criteria.min_seats) {
      query = query.gte('available_seats', criteria.min_seats);
    }

    if (criteria.max_price_per_seat) {
      query = query.lte('price_per_seat', criteria.max_price_per_seat);
    }

    if (criteria.allows_pets !== undefined) {
      query = query.eq('allows_pets', criteria.allows_pets);
    }

    if (criteria.instant_booking !== undefined) {
      query = query.eq('instant_booking', criteria.instant_booking);
    }

    // Trier par heure de départ
    query = query.order('departure_datetime', { ascending: true });

    const { data: trips, error } = await query;

    if (error) {
      console.error('Erreur recherche trajets:', error);
      return {
        success: false,
        trips: [],
        message: `Erreur lors de la recherche: ${error.message}`
      };
    }

    if (!trips || trips.length === 0) {
      return {
        success: true,
        trips: [],
        message: `Aucun trajet trouvé pour ${criteria.departure_city} → ${criteria.arrival_city} le ${criteria.departure_date}`
      };
    }

    // Formater les résultats
    const formattedTrips: CarpoolingTrip[] = trips.map((trip: any) => ({
      ...trip,
      driver_name: trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Inconnu',
      driver_rating: 4.5 // TODO: Calculer depuis reviews
    }));

    return {
      success: true,
      trips: formattedTrips,
      message: `${trips.length} trajet${trips.length > 1 ? 's' : ''} trouvé${trips.length > 1 ? 's' : ''}`
    };
  } catch (error: any) {
    console.error('Erreur searchTrips:', error);
    return {
      success: false,
      trips: [],
      message: `Erreur: ${error.message}`
    };
  }
}

/**
 * Formater les résultats de recherche pour Clara
 */
export function formatTripsForClara(trips: CarpoolingTrip[]): string {
  if (trips.length === 0) {
    return '🚫 Aucun trajet disponible pour cette recherche.';
  }

  let output = `🚗 **${trips.length} trajet${trips.length > 1 ? 's' : ''} trouvé${trips.length > 1 ? 's' : ''} !**\n\n`;

  trips.forEach((trip, index) => {
    const date = new Date(trip.departure_datetime);
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const totalPrice = (trip.price_per_seat * trip.available_seats).toFixed(2);

    output += `**${index + 1}. ${trip.departure_city} → ${trip.arrival_city}**\n`;
    output += `   🕐 Départ: ${timeStr}\n`;
    output += `   👤 Conducteur: ${trip.driver_name}\n`;
    output += `   💺 Places disponibles: ${trip.available_seats}/${trip.total_seats}\n`;
    output += `   💰 Prix par place: ${trip.price_per_seat}€\n`;
    
    // Options
    const options: string[] = [];
    if (trip.instant_booking) options.push('⚡ Réservation instantanée');
    if (trip.allows_pets) options.push('🐕 Animaux acceptés');
    if (trip.allows_music) options.push('🎵 Musique');
    if (trip.chat_level === 'bla') options.push('🤫 Silencieux');
    if (trip.chat_level === 'blablabla') options.push('💬 Bavard');
    
    if (options.length > 0) {
      output += `   ✨ ${options.join(', ')}\n`;
    }

    if (trip.description) {
      output += `   📝 ${trip.description.substring(0, 100)}${trip.description.length > 100 ? '...' : ''}\n`;
    }

    output += `   🆔 ID: \`${trip.id}\`\n\n`;
  });

  output += `💡 **Pour réserver**, dis-moi :\n`;
  output += `"Réserve [nombre] place(s) pour le trajet [ID]"`;

  return output;
}

// ==========================================
// 2. PUBLIER UN TRAJET
// ==========================================

/**
 * Publier un nouveau trajet de covoiturage
 * Coût : 2 crédits
 * 
 * @param userId - ID de l'utilisateur conducteur
 * @param tripData - Données du trajet
 * @returns Succès/Échec + ID du trajet créé
 */
export async function publishTrip(
  userId: string,
  tripData: TripPublishData
): Promise<{ success: boolean; tripId?: string; message: string }> {
  try {
    // 1. Vérifier que l'utilisateur a assez de crédits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, blocked_credits')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        message: 'Erreur lors de la vérification du profil'
      };
    }

    const PUBLISH_COST = 2; // Coût en crédits pour publier un trajet
    const availableCredits = profile.credits - profile.blocked_credits;

    if (availableCredits < PUBLISH_COST) {
      return {
        success: false,
        message: `❌ Crédits insuffisants ! Tu as ${availableCredits} crédits disponibles, il en faut ${PUBLISH_COST} pour publier un trajet. Achète des crédits pour continuer. 💳`
      };
    }

    // 2. Validation des données
    if (tripData.price_per_seat < 2) {
      return {
        success: false,
        message: '❌ Le prix minimum par place est de 2€ (règle BlaBlaCar)'
      };
    }

    if (tripData.total_seats < 1 || tripData.total_seats > 8) {
      return {
        success: false,
        message: '❌ Le nombre de places doit être entre 1 et 8'
      };
    }

    // Vérifier que la date est dans le futur
    const departureDate = new Date(tripData.departure_datetime);
    if (departureDate < new Date()) {
      return {
        success: false,
        message: '❌ La date de départ doit être dans le futur'
      };
    }

    // 3. Créer le trajet
    const { data: newTrip, error: tripError } = await supabase
      .from('carpooling_trips')
      .insert({
        driver_id: userId,
        departure_address: tripData.departure_address,
        departure_city: tripData.departure_city,
        departure_datetime: tripData.departure_datetime,
        arrival_address: tripData.arrival_address,
        arrival_city: tripData.arrival_city,
        total_seats: tripData.total_seats,
        available_seats: tripData.total_seats,
        price_per_seat: tripData.price_per_seat,
        allows_pets: tripData.allows_pets ?? false,
        allows_smoking: tripData.allows_smoking ?? false,
        allows_music: tripData.allows_music ?? true,
        chat_level: tripData.chat_level ?? 'blabla',
        max_two_back: tripData.max_two_back ?? false,
        luggage_size: tripData.luggage_size ?? 'medium',
        instant_booking: tripData.instant_booking ?? false,
        description: tripData.description,
        status: 'active'
      })
      .select()
      .single();

    if (tripError) {
      console.error('Erreur création trajet:', tripError);
      return {
        success: false,
        message: `Erreur lors de la création du trajet: ${tripError.message}`
      };
    }

    // 4. Déduire les crédits avec RPC sécurisé
    const { data: deductResult, error: deductError } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: PUBLISH_COST,
      p_reason: `Publication trajet covoiturage ${tripData.departure_city} → ${tripData.arrival_city}`
    });

    if (deductError || !deductResult?.success) {
      console.error('Erreur déduction crédits:', deductError);
      // Annuler la création du trajet
      await supabase.from('carpooling_trips').delete().eq('id', newTrip.id);
      return {
        success: false,
        message: deductResult?.error || 'Erreur lors de la déduction des crédits'
      };
    }

    // 5. Succès !
    const date = new Date(tripData.departure_datetime);
    const dateStr = date.toLocaleDateString('fr-FR');
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return {
      success: true,
      tripId: newTrip.id,
      message: `✅ **Trajet publié avec succès !** 🚗\n\n` +
               `📍 ${tripData.departure_city} → ${tripData.arrival_city}\n` +
               `🕐 Départ: ${dateStr} à ${timeStr}\n` +
               `💺 Places: ${tripData.total_seats}\n` +
               `💰 Prix par place: ${tripData.price_per_seat}€\n\n` +
               `💳 **-${PUBLISH_COST} crédits** (Solde restant: ${profile.credits - PUBLISH_COST})\n\n` +
               `🆔 ID du trajet: \`${newTrip.id}\`\n` +
               `Les passagers peuvent maintenant réserver !`
    };
  } catch (error: any) {
    console.error('Erreur publishTrip:', error);
    return {
      success: false,
      message: `Erreur: ${error.message}`
    };
  }
}

// ==========================================
// 3. RÉSERVER UN TRAJET
// ==========================================

/**
 * Réserver un trajet de covoiturage
 * Coût : 2 crédits (bloqués jusqu'à confirmation) + prix en espèces au conducteur
 * 
 * @param userId - ID du passager
 * @param bookingData - Données de réservation
 * @returns Succès/Échec + détails de la réservation
 */
export async function bookTrip(
  userId: string,
  bookingData: BookingData
): Promise<{ success: boolean; bookingId?: string; message: string }> {
  try {
    // 1. Vérifier le message (min 20 caractères - règle BlaBlaCar)
    if (bookingData.message.length < 20) {
      return {
        success: false,
        message: `❌ Le message au conducteur doit contenir au moins 20 caractères (règle BlaBlaCar). Actuel: ${bookingData.message.length}/20`
      };
    }

    // 2. Récupérer les infos du trajet
    const { data: trip, error: tripError } = await supabase
      .from('carpooling_trips')
      .select(`
        *,
        driver:profiles!driver_id(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', bookingData.trip_id)
      .single();

    if (tripError || !trip) {
      return {
        success: false,
        message: '❌ Trajet introuvable'
      };
    }

    // Vérifications du trajet
    if (trip.status !== 'active') {
      return {
        success: false,
        message: `❌ Ce trajet n'est plus disponible (statut: ${trip.status})`
      };
    }

    if (trip.driver_id === userId) {
      return {
        success: false,
        message: '❌ Tu ne peux pas réserver ton propre trajet !'
      };
    }

    if (trip.available_seats < bookingData.seats_booked) {
      return {
        success: false,
        message: `❌ Places insuffisantes ! Disponible: ${trip.available_seats}, demandé: ${bookingData.seats_booked}`
      };
    }

    // 3. Vérifier les crédits du passager
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, blocked_credits, first_name, last_name')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        message: 'Erreur lors de la vérification du profil'
      };
    }

    const BOOKING_CREDIT_COST = 2;
    const availableCredits = profile.credits - profile.blocked_credits;

    if (availableCredits < BOOKING_CREDIT_COST) {
      return {
        success: false,
        message: `❌ Crédits insuffisants ! Tu as ${availableCredits} crédits disponibles, il en faut ${BOOKING_CREDIT_COST} pour réserver. Achète des crédits pour continuer. 💳`
      };
    }

    // 4. Calculer le prix total en espèces
    const totalPrice = trip.price_per_seat * bookingData.seats_booked;

    // 5. Créer la réservation
    const bookingStatus = trip.instant_booking ? 'confirmed' : 'pending';

    const { data: newBooking, error: bookingError } = await supabase
      .from('carpooling_bookings')
      .insert({
        trip_id: bookingData.trip_id,
        passenger_id: userId,
        seats_booked: bookingData.seats_booked,
        total_price: totalPrice,
        trip_price: totalPrice,
        credit_cost: BOOKING_CREDIT_COST,
        status: bookingStatus,
        message: bookingData.message
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Erreur création réservation:', bookingError);
      
      // Gérer l'erreur de doublon
      if (bookingError.code === '23505') {
        return {
          success: false,
          message: '❌ Tu as déjà réservé ce trajet !'
        };
      }

      return {
        success: false,
        message: `Erreur lors de la réservation: ${bookingError.message}`
      };
    }

    // 6. Bloquer les crédits
    const { error: blockError } = await supabase
      .from('profiles')
      .update({
        blocked_credits: profile.blocked_credits + BOOKING_CREDIT_COST
      })
      .eq('id', userId);

    if (blockError) {
      console.error('Erreur blocage crédits:', blockError);
      // Annuler la réservation
      await supabase.from('carpooling_bookings').delete().eq('id', newBooking.id);
      return {
        success: false,
        message: 'Erreur lors du blocage des crédits'
      };
    }

    // 7. Mettre à jour les places disponibles (si instant booking)
    if (trip.instant_booking) {
      const { error: updateSeatsError } = await supabase
        .from('carpooling_trips')
        .update({
          available_seats: trip.available_seats - bookingData.seats_booked,
          status: trip.available_seats - bookingData.seats_booked === 0 ? 'full' : 'active'
        })
        .eq('id', bookingData.trip_id);

      if (updateSeatsError) {
        console.error('Erreur mise à jour places:', updateSeatsError);
      }
    }

    // 8. Succès !
    const date = new Date(trip.departure_datetime);
    const dateStr = date.toLocaleDateString('fr-FR');
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let statusMessage = '';
    if (trip.instant_booking) {
      statusMessage = '✅ **Réservation confirmée instantanément !**';
    } else {
      statusMessage = '⏳ **Réservation en attente de confirmation par le conducteur**';
    }

    return {
      success: true,
      bookingId: newBooking.id,
      message: `${statusMessage}\n\n` +
               `🚗 **Détails du trajet :**\n` +
               `📍 ${trip.departure_city} → ${trip.arrival_city}\n` +
               `🕐 ${dateStr} à ${timeStr}\n` +
               `👤 Conducteur: ${trip.driver.first_name} ${trip.driver.last_name}\n` +
               `💺 Places réservées: ${bookingData.seats_booked}\n\n` +
               `💰 **À payer au conducteur:** ${totalPrice.toFixed(2)}€ en espèces\n` +
               `💳 **Crédits bloqués:** ${BOOKING_CREDIT_COST} (remboursés si annulé >24h avant)\n\n` +
               `📱 Ton message: "${bookingData.message}"\n\n` +
               `🆔 ID réservation: \`${newBooking.id}\`\n` +
               `${trip.instant_booking ? '' : 'Tu recevras une notification dès que le conducteur confirmera.'}`
    };
  } catch (error: any) {
    console.error('Erreur bookTrip:', error);
    return {
      success: false,
      message: `Erreur: ${error.message}`
    };
  }
}

// ==========================================
// 4. OBTENIR LES TRAJETS DE L'UTILISATEUR
// ==========================================

/**
 * Récupérer les trajets publiés par l'utilisateur
 */
export async function getMyPublishedTrips(userId: string): Promise<{
  success: boolean;
  trips: CarpoolingTrip[];
  message: string;
}> {
  try {
    const { data: trips, error } = await supabase
      .from('carpooling_trips')
      .select('*')
      .eq('driver_id', userId)
      .order('departure_datetime', { ascending: false });

    if (error) {
      return {
        success: false,
        trips: [],
        message: `Erreur: ${error.message}`
      };
    }

    return {
      success: true,
      trips: trips || [],
      message: `${trips?.length || 0} trajet(s) publié(s)`
    };
  } catch (error: any) {
    return {
      success: false,
      trips: [],
      message: `Erreur: ${error.message}`
    };
  }
}

/**
 * Récupérer les réservations de l'utilisateur
 */
export async function getMyBookings(userId: string): Promise<{
  success: boolean;
  bookings: any[];
  message: string;
}> {
  try {
    const { data: bookings, error } = await supabase
      .from('carpooling_bookings')
      .select(`
        *,
        trip:carpooling_trips(
          *,
          driver:profiles!driver_id(
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('passenger_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        bookings: [],
        message: `Erreur: ${error.message}`
      };
    }

    return {
      success: true,
      bookings: bookings || [],
      message: `${bookings?.length || 0} réservation(s)`
    };
  } catch (error: any) {
    return {
      success: false,
      bookings: [],
      message: `Erreur: ${error.message}`
    };
  }
}

// ==========================================
// 5. ANNULATION & REMBOURSEMENT
// ==========================================

/**
 * Annuler une réservation
 * Remboursement des 2 crédits si annulation >24h avant le départ
 */
export async function cancelBooking(
  userId: string,
  bookingId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Récupérer la réservation
    const { data: booking, error: bookingError } = await supabase
      .from('carpooling_bookings')
      .select(`
        *,
        trip:carpooling_trips(*)
      `)
      .eq('id', bookingId)
      .eq('passenger_id', userId)
      .single();

    if (bookingError || !booking) {
      return {
        success: false,
        message: 'Réservation introuvable'
      };
    }

    if (booking.status === 'cancelled') {
      return {
        success: false,
        message: 'Cette réservation est déjà annulée'
      };
    }

    // Calculer le délai avant départ
    const now = new Date();
    const departure = new Date(booking.trip.departure_datetime);
    const hoursUntilDeparture = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

    const refundCredits = hoursUntilDeparture > 24;

    // Annuler la réservation
    const { error: updateError } = await supabase
      .from('carpooling_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (updateError) {
      return {
        success: false,
        message: `Erreur: ${updateError.message}`
      };
    }

    // Débloquer/rembourser les crédits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, blocked_credits')
      .eq('id', userId)
      .single();

    if (!profileError && profile) {
      const creditUpdate: any = {
        blocked_credits: Math.max(0, profile.blocked_credits - booking.credit_cost)
      };

      if (refundCredits) {
        creditUpdate.credits = profile.credits + booking.credit_cost;
      }

      await supabase
        .from('profiles')
        .update(creditUpdate)
        .eq('id', userId);
    }

    // Remettre les places disponibles
    await supabase
      .from('carpooling_trips')
      .update({
        available_seats: booking.trip.available_seats + booking.seats_booked,
        status: 'active'
      })
      .eq('id', booking.trip_id);

    return {
      success: true,
      message: `✅ Réservation annulée\n\n` +
               `${refundCredits 
                 ? `💳 ${booking.credit_cost} crédits remboursés (annulation >24h)` 
                 : `⚠️ Pas de remboursement (annulation <24h avant départ)`
               }`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Erreur: ${error.message}`
    };
  }
}
