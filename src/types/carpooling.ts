/**
 * Types pour le module Covoiturage
 * Alignés sur les tables Supabase: carpooling_trips, carpooling_bookings, carpooling_messages, carpooling_ratings
 */

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
}

export interface CarpoolingTrip {
  id: string;
  driver_id: string;
  departure_address: string;
  departure_city: string;
  departure_lat?: number;
  departure_lng?: number;
  departure_datetime: string;
  arrival_address: string;
  arrival_city: string;
  arrival_lat?: number;
  arrival_lng?: number;
  estimated_arrival?: string;
  distance_km?: number;
  duration_minutes?: number;
  total_seats: number;
  available_seats: number;
  price_per_seat: number;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_plate?: string;
  allows_pets: boolean;
  allows_smoking: boolean;
  allows_music: boolean;
  max_two_back: boolean;
  luggage_size: 'small' | 'medium' | 'large';
  description?: string;
  automatic_booking: boolean;
  status: 'active' | 'cancelled' | 'completed' | 'full';
  created_at: string;
  updated_at: string;
  driver?: Profile;
  driver_rating?: number;
  driver_trips_count?: number;
}

export interface CarpoolingBooking {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats_booked: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
  trip?: CarpoolingTrip;
  passenger?: Profile;
}

export interface CarpoolingMessage {
  id: string;
  trip_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface CarpoolingRating {
  id: string;
  trip_id: string;
  rater_id: string;
  rated_user_id: string;
  rating: number; // 1-5
  punctuality_rating?: number; // 1-5
  friendliness_rating?: number; // 1-5
  cleanliness_rating?: number; // 1-5
  comment?: string;
  tags?: string[];
  role: 'driver' | 'passenger';
  created_at: string;
}

export interface TripSearchFilters {
  departure_city?: string;
  arrival_city?: string;
  departure_date?: string;
  min_seats?: number;
  max_price?: number;
  allows_pets?: boolean;
  allows_smoking?: boolean;
  automatic_booking?: boolean;
}

export interface Conversation {
  id: string;
  trip_id: string;
  other_user: Profile;
  last_message?: CarpoolingMessage;
  unread_count: number;
  trip?: CarpoolingTrip;
}
