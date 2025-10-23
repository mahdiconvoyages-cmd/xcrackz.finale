export * from './navigation';

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  credits?: number;
}

export interface Mission {
  id: string;
  title: string;
  reference: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  departure?: {
    address: string;
    city: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
  };
  arrival?: {
    address: string;
    city: string;
    postal_code?: string;
    lat?: number;
    lng?: number;
  };
  vehicle?: {
    brand: string;
    model: string;
    plate: string;
    year?: number;
    image_url?: string;
  };
  driver_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  mission_id: string;
  user_id: string;
  type: 'departure' | 'arrival';
  status: 'draft' | 'completed';
  vehicle_condition?: Record<string, any>;
  photos?: string[];
  signature?: string;
  gps_location?: {
    lat: number;
    lng: number;
  };
  notes?: string;
  created_at: string;
  completed_at?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface Trip {
  id: string;
  driver_id: string;
  departure_city: string;
  arrival_city: string;
  departure_date: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  vehicle_info?: string;
  description?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price_credits: number;
  category: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}
