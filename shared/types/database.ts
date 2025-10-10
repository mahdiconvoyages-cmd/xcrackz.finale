export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  credits: number;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Mission {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  vehicle_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  user_id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin: string | null;
  color: string | null;
  mileage: number | null;
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  due_date: string | null;
  issued_date: string;
  items: InvoiceItem[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  mission_id: string | null;
  inspection_type: 'pre_trip' | 'post_trip' | 'maintenance' | 'damage';
  status: 'draft' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  inspector_name: string;
  inspector_signature: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  odometer: number | null;
  fuel_level: number | null;
  notes: string | null;
  photos: InspectionPhoto[];
  checklist: InspectionCheckItem[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface InspectionPhoto {
  id: string;
  url: string;
  category: string;
  notes: string | null;
  timestamp: string;
}

export interface InspectionCheckItem {
  id: string;
  category: string;
  item: string;
  status: 'ok' | 'warning' | 'critical' | 'na';
  notes: string | null;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string | null;
  stock: number;
  credits_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  total_amount: number;
  credits_used: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shipping_address: string;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  shop_item_id: string;
  quantity: number;
  price: number;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'earned' | 'spent' | 'bonus' | 'refund';
  description: string;
  reference_id: string | null;
  created_at: string;
}

export interface Carpooling {
  id: string;
  driver_id: string;
  departure: string;
  arrival: string;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  status: 'active' | 'full' | 'completed' | 'cancelled';
  vehicle_info: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarpoolingBooking {
  id: string;
  carpooling_id: string;
  passenger_id: string;
  seats_booked: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
  updated_at: string;
}
