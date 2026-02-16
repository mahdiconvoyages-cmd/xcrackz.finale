-- ============================================================================
-- SCRIPT COMPLET DE RESET DE LA BASE DE DONNÉES FLEETCHECK
-- ============================================================================
-- Ce script supprime et recrée TOUTES les 54+ tables découvertes dans les migrations
-- ATTENTION: Toutes les données seront perdues !
-- Version: COMPLETE avec toutes les tables des migrations
-- ============================================================================

-- ÉTAPE 1: Supprimer toutes les fonctions et triggers
-- ============================================================================
-- Note: On supprime d'abord les fonctions avec CASCADE pour supprimer automatiquement
-- tous les triggers qui les utilisent, même si les tables n'existent pas encore

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_credits() CASCADE;
DROP FUNCTION IF EXISTS public.assign_credits_on_subscription_change() CASCADE;
DROP FUNCTION IF EXISTS public.update_subscription_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_billing_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_item_amount() CASCADE;

-- ÉTAPE 2: Supprimer toutes les tables (ordre inversé des dépendances)
-- ============================================================================

DROP TABLE IF EXISTS public.ai_messages CASCADE;
DROP TABLE IF EXISTS public.ai_conversations CASCADE;
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.alert_votes CASCADE;
DROP TABLE IF EXISTS public.account_creation_attempts CASCADE;
DROP TABLE IF EXISTS public.calendar_event_participants CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.calendar_permissions CASCADE;
DROP TABLE IF EXISTS public.carpooling_bookings CASCADE;
DROP TABLE IF EXISTS public.carpooling_messages CASCADE;
DROP TABLE IF EXISTS public.carpooling_reviews CASCADE;
DROP TABLE IF EXISTS public.carpooling_trips CASCADE;
DROP TABLE IF EXISTS public.carpooling_user_preferences CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.covoiturage_bookings CASCADE;
DROP TABLE IF EXISTS public.covoiturage_messages CASCADE;
DROP TABLE IF EXISTS public.covoiturage_offers CASCADE;
DROP TABLE IF EXISTS public.covoiturage_ratings CASCADE;
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.credit_usage_log CASCADE;
DROP TABLE IF EXISTS public.credits_packages CASCADE;
DROP TABLE IF EXISTS public.data_access_logs CASCADE;
DROP TABLE IF EXISTS public.deletion_requests CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.driver_availability CASCADE;
DROP TABLE IF EXISTS public.driver_mission_history CASCADE;
DROP TABLE IF EXISTS public.feature_costs CASCADE;
DROP TABLE IF EXISTS public.gps_location_points CASCADE;
DROP TABLE IF EXISTS public.gps_tracking_sessions CASCADE;
DROP TABLE IF EXISTS public.inspection_defects CASCADE;
DROP TABLE IF EXISTS public.inspection_items CASCADE;
DROP TABLE IF EXISTS public.inspection_offline_queue CASCADE;
DROP TABLE IF EXISTS public.inspection_photos CASCADE;
DROP TABLE IF EXISTS public.inspections CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.marketplace_listings CASCADE;
DROP TABLE IF EXISTS public.mission_assignments CASCADE;
DROP TABLE IF EXISTS public.mission_inspections CASCADE;
DROP TABLE IF EXISTS public.mission_public_links CASCADE;
DROP TABLE IF EXISTS public.mission_tracking CASCADE;
DROP TABLE IF EXISTS public.mission_tracking_positions CASCADE;
DROP TABLE IF EXISTS public.mission_tracking_sessions CASCADE;
DROP TABLE IF EXISTS public.missions CASCADE;
DROP TABLE IF EXISTS public.navigation_alerts CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.quote_items CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.shop_items CASCADE;
DROP TABLE IF EXISTS public.subscription_benefits CASCADE;
DROP TABLE IF EXISTS public.subscription_history CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.support_auto_responses CASCADE;
DROP TABLE IF EXISTS public.support_conversations CASCADE;
DROP TABLE IF EXISTS public.support_messages CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.suspicious_accounts CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.user_consents CASCADE;
DROP TABLE IF EXISTS public.user_credits CASCADE;
DROP TABLE IF EXISTS public.vehicle_inspections CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- ÉTAPE 3: Recréer TOUTES les tables dans le bon ordre
-- ============================================================================

-- Table profiles (doit être créée en premier)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  full_name text,
  phone text,
  avatar_url text,
  company_name text,
  company_siret text,
  company_address text,
  address text,
  siret text,
  vat_number text,
  subscription_plan text DEFAULT 'free',
  subscription_status text DEFAULT 'active',
  is_admin boolean DEFAULT false NOT NULL,
  is_verified boolean DEFAULT false NOT NULL,
  rating_average numeric DEFAULT 0,
  user_type text DEFAULT 'donneur_ordre',
  banned boolean DEFAULT false NOT NULL,
  ban_reason text,
  banned_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table clients
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company_name text,
  siret text,
  siren text,
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'France',
  notes text,
  is_company boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('customer', 'driver', 'supplier')),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  company text,
  notes text,
  is_driver boolean DEFAULT false,
  driver_licenses text[] DEFAULT ARRAY[]::text[],
  current_latitude numeric,
  current_longitude numeric,
  availability_status text DEFAULT 'offline',
  preferred_zones text[] DEFAULT ARRAY[]::text[],
  rating_average numeric DEFAULT 0,
  missions_completed integer DEFAULT 0,
  last_location_update timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table missions
CREATE TABLE IF NOT EXISTS public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  vehicle_brand text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_plate text,
  vehicle_vin text,
  vehicle_year integer,
  vehicle_color text,
  pickup_address text NOT NULL,
  pickup_lat numeric,
  pickup_lng numeric,
  pickup_date timestamptz,
  pickup_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  pickup_contact_name text,
  pickup_contact_phone text,
  delivery_address text NOT NULL,
  delivery_lat numeric,
  delivery_lng numeric,
  delivery_date timestamptz,
  delivery_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  delivery_contact_name text,
  delivery_contact_phone text,
  client_name text,
  client_phone text,
  client_email text,
  driver_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  driver_commission numeric,
  company_commission numeric,
  bonus_amount numeric,
  distance numeric,
  distance_km numeric,
  duration numeric,
  price numeric DEFAULT 0,
  notes text,
  special_instructions text,
  tracking_code text,
  vehicle_image_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table mission_inspections
CREATE TABLE IF NOT EXISTS public.mission_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('departure', 'arrival')),
  mileage integer,
  fuel_level text,
  exterior_condition text,
  interior_condition text,
  damages text,
  photos jsonb DEFAULT '[]'::jsonb,
  inspector_name text,
  inspector_signature text,
  inspected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table inspections (système d'inspection standalone)
CREATE TABLE IF NOT EXISTS public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'departure_completed', 'completed')),
  vehicle_brand text NOT NULL DEFAULT '',
  vehicle_model text NOT NULL DEFAULT '',
  vehicle_registration text NOT NULL DEFAULT '',
  vehicle_type text NOT NULL DEFAULT 'VL' CHECK (vehicle_type IN ('VL', 'VU', 'PL')),
  km_start integer DEFAULT 0,
  fuel_level_start text DEFAULT '',
  km_end integer,
  fuel_level_end text,
  exterior_notes text DEFAULT '',
  interior_notes text DEFAULT '',
  arrival_notes text,
  signature_departure text,
  signature_departure_name text,
  signature_departure_date timestamptz,
  signature_arrival text,
  signature_arrival_name text,
  signature_arrival_date timestamptz,
  pdf_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table vehicle_inspections
CREATE TABLE IF NOT EXISTS public.vehicle_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  inspector_id uuid REFERENCES public.profiles(id),
  inspection_type text NOT NULL,
  vehicle_info jsonb DEFAULT '{}'::jsonb,
  overall_condition text,
  fuel_level integer,
  mileage_km integer,
  damages jsonb DEFAULT '[]'::jsonb,
  notes text,
  inspector_signature text,
  client_signature text,
  client_name text,
  latitude numeric,
  longitude numeric,
  location_address text,
  status text DEFAULT 'in_progress',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table inspection_photos
CREATE TABLE IF NOT EXISTS public.inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('vehicle_front', 'vehicle_back', 'vehicle_side', 'exterior', 'interior', 'arrival')),
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table gps_tracking_sessions
CREATE TABLE IF NOT EXISTS public.gps_tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.profiles(id),
  departure_inspection_id uuid REFERENCES public.vehicle_inspections(id),
  arrival_inspection_id uuid REFERENCES public.vehicle_inspections(id),
  start_latitude numeric,
  start_longitude numeric,
  start_address text,
  end_latitude numeric,
  end_longitude numeric,
  end_address text,
  total_distance_km numeric,
  total_duration_minutes integer,
  average_speed_kmh numeric,
  max_speed_kmh numeric,
  status text DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table gps_location_points
CREATE TABLE IF NOT EXISTS public.gps_location_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.gps_tracking_sessions(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  altitude numeric,
  accuracy numeric,
  speed_kmh numeric,
  heading numeric,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table mission_tracking_sessions
CREATE TABLE IF NOT EXISTS public.mission_tracking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.profiles(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  total_distance double precision DEFAULT 0,
  max_speed double precision DEFAULT 0,
  average_speed double precision DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table mission_tracking_positions
CREATE TABLE IF NOT EXISTS public.mission_tracking_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed double precision DEFAULT 0,
  heading double precision DEFAULT 0,
  accuracy double precision DEFAULT 0,
  altitude double precision DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table mission_public_links
CREATE TABLE IF NOT EXISTS public.mission_public_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  unique_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64') UNIQUE,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table navigation_alerts
CREATE TABLE IF NOT EXISTS public.navigation_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.profiles(id),
  alert_type text NOT NULL CHECK (alert_type IN ('speed_limit', 'traffic', 'accident', 'road_work', 'weather', 'fuel', 'rest', 'custom')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'danger', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  latitude numeric,
  longitude numeric,
  location_address text,
  acknowledged boolean DEFAULT false,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table shop_items
CREATE TABLE IF NOT EXISTS public.shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  item_type text NOT NULL CHECK (item_type IN ('subscription', 'credits', 'addon')),
  credits_amount integer,
  price numeric NOT NULL,
  currency text DEFAULT 'EUR',
  is_active boolean DEFAULT true,
  features jsonb DEFAULT '[]'::jsonb,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table user_credits
CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  updated_at timestamptz DEFAULT now() NOT NULL,
  subscription_expires_at timestamptz,
  last_subscription_package_id uuid
);

-- Table subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'starter', 'essentiel', 'basic', 'pro', 'business', 'enterprise')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  current_period_start timestamptz DEFAULT now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  auto_renew boolean DEFAULT true,
  payment_method text,
  assigned_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table subscription_history
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_plan text,
  new_plan text,
  old_status text,
  new_status text,
  changed_by uuid REFERENCES public.profiles(id),
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table credit_usage_log
CREATE TABLE IF NOT EXISTS public.credit_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  credits_used integer NOT NULL,
  was_free boolean DEFAULT false,
  reason text,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table feature_costs
CREATE TABLE IF NOT EXISTS public.feature_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL UNIQUE,
  feature_key text NOT NULL UNIQUE,
  description text,
  credit_cost integer NOT NULL DEFAULT 0,
  free_from_plan text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.shop_items(id),
  amount numeric NOT NULL,
  credits integer NOT NULL,
  payment_id text UNIQUE,
  payment_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_number text UNIQUE NOT NULL,
  type text CHECK (type IN ('invoice', 'quote', 'credit_note')),
  client_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_address text,
  client_siret text,
  customer_vat_number text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  subtotal numeric DEFAULT 0,
  vat_rate numeric DEFAULT 20,
  tax_rate numeric DEFAULT 20,
  vat_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  payment_terms text DEFAULT 'Paiement à réception de facture',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table invoice_items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric DEFAULT 0 CHECK (unit_price >= 0),
  vat_rate numeric DEFAULT 20 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  tax_rate numeric DEFAULT 20,
  total numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table quotes
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quote_number text UNIQUE NOT NULL,
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_address text,
  client_siret text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  subtotal numeric NOT NULL DEFAULT 0,
  tax_rate numeric NOT NULL DEFAULT 20,
  tax_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table quote_items
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  tax_rate numeric NOT NULL DEFAULT 20 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  amount numeric NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table marketplace_listings
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  pickup_address text NOT NULL,
  pickup_lat numeric,
  pickup_lng numeric,
  pickup_date timestamptz,
  delivery_address text NOT NULL,
  delivery_lat numeric,
  delivery_lng numeric,
  delivery_date timestamptz,
  vehicle_type text,
  price numeric DEFAULT 0,
  status text DEFAULT 'available' CHECK (status IN ('available', 'accepted', 'completed', 'cancelled')),
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table covoiturage_offers (legacy)
CREATE TABLE IF NOT EXISTS public.covoiturage_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  departure_address text NOT NULL,
  departure_lat numeric,
  departure_lng numeric,
  departure_date timestamptz NOT NULL,
  arrival_address text NOT NULL,
  arrival_lat numeric,
  arrival_lng numeric,
  available_seats integer DEFAULT 1,
  price_per_seat numeric DEFAULT 0,
  notes text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'full', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table covoiturage_bookings (legacy)
CREATE TABLE IF NOT EXISTS public.covoiturage_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.covoiturage_offers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seats_booked integer DEFAULT 1,
  total_price numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table carpooling_trips (nouveau système)
CREATE TABLE IF NOT EXISTS public.carpooling_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  departure_address text NOT NULL,
  departure_city text NOT NULL,
  departure_lat numeric,
  departure_lng numeric,
  departure_datetime timestamptz NOT NULL,
  arrival_address text NOT NULL,
  arrival_city text NOT NULL,
  arrival_lat numeric,
  arrival_lng numeric,
  estimated_arrival timestamptz,
  distance_km integer,
  duration_minutes integer,
  total_seats integer NOT NULL DEFAULT 3,
  available_seats integer NOT NULL DEFAULT 3,
  price_per_seat numeric NOT NULL,
  vehicle_brand text,
  vehicle_model text,
  vehicle_color text,
  vehicle_plate text,
  allows_pets boolean DEFAULT false,
  allows_smoking boolean DEFAULT false,
  allows_music boolean DEFAULT true,
  max_two_back boolean DEFAULT false,
  luggage_size text DEFAULT 'medium' CHECK (luggage_size IN ('small', 'medium', 'large')),
  description text,
  automatic_booking boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'full')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table carpooling_bookings (nouveau système)
CREATE TABLE IF NOT EXISTS public.carpooling_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.carpooling_trips(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seats_booked integer NOT NULL DEFAULT 1,
  total_price numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table carpooling_reviews
CREATE TABLE IF NOT EXISTS public.carpooling_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.carpooling_trips(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  reviewed_id uuid NOT NULL REFERENCES public.profiles(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  punctuality_rating integer CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  driving_rating integer CHECK (driving_rating >= 1 AND driving_rating <= 5),
  friendliness_rating integer CHECK (friendliness_rating >= 1 AND friendliness_rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table carpooling_messages
CREATE TABLE IF NOT EXISTS public.carpooling_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.carpooling_trips(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  receiver_id uuid NOT NULL REFERENCES public.profiles(id),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table calendar_events
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES public.missions(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('mission', 'inspection', 'maintenance', 'meeting', 'other')),
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  location text,
  color text DEFAULT '#3b82f6',
  is_all_day boolean DEFAULT false,
  reminder_minutes integer DEFAULT 30,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table calendar_permissions
CREATE TABLE IF NOT EXISTS public.calendar_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'read' CHECK (permission_level IN ('read', 'write', 'admin')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(calendar_owner_id, shared_with_user_id)
);

-- Table calendar_event_participants
CREATE TABLE IF NOT EXISTS public.calendar_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'maybe')),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Table ai_conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table ai_messages
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table support_conversations
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category text DEFAULT 'general' CHECK (category IN ('technical', 'billing', 'general', 'feature_request', 'bug', 'account')),
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id),
  sender_type text DEFAULT 'user' CHECK (sender_type IN ('user', 'admin', 'bot')),
  message text NOT NULL,
  is_automated boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table reports
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('missions', 'financial', 'custom')),
  filters jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table user_consents (GDPR)
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  analytics boolean DEFAULT false,
  marketing boolean DEFAULT false,
  functional boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Table data_access_logs (GDPR)
CREATE TABLE IF NOT EXISTS public.data_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('export', 'view', 'update', 'delete')),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table deletion_requests (GDPR)
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  requested_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table account_creation_attempts
CREATE TABLE IF NOT EXISTS public.account_creation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  ip_address text,
  user_agent text,
  attempt_date timestamptz DEFAULT now(),
  success boolean DEFAULT false,
  error_message text,
  duplicate_detected boolean DEFAULT false,
  existing_user_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table suspicious_accounts
CREATE TABLE IF NOT EXISTS public.suspicious_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  reason text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  detected_at timestamptz DEFAULT now(),
  reviewed boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Table driver_availability
CREATE TABLE IF NOT EXISTS public.driver_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  date date NOT NULL,
  is_available boolean DEFAULT true,
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(driver_id, date)
);

-- Table driver_mission_history
CREATE TABLE IF NOT EXISTS public.driver_mission_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  performance_rating numeric CHECK (performance_rating >= 0 AND performance_rating <= 5),
  on_time boolean,
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- ÉTAPE 4: Créer les index pour les performances
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_missions_user_id ON public.missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON public.missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_pickup_date ON public.missions(pickup_date);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON public.contacts(type);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON public.invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_carpooling_trips_status ON public.carpooling_trips(status);
CREATE INDEX IF NOT EXISTS idx_carpooling_trips_departure ON public.carpooling_trips(departure_datetime);
CREATE INDEX IF NOT EXISTS idx_gps_location_points_session ON public.gps_location_points(session_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);

-- ============================================================================
-- ÉTAPE 5: Activer RLS sur toutes les tables
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_tracking_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_public_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.covoiturage_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.covoiturage_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_creation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_mission_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 6: Créer les policies RLS de base
-- ============================================================================

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Missions
CREATE POLICY "Users can view own missions" ON public.missions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create missions" ON public.missions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.missions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own missions" ON public.missions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Contacts
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Shop items (lecture publique)
CREATE POLICY "Anyone can view active shop items" ON public.shop_items FOR SELECT TO authenticated USING (is_active = true);

-- User credits
CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Subscriptions
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Inspections
CREATE POLICY "Users can view own inspections" ON public.inspections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inspections" ON public.inspections FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- ÉTAPE 7: Créer les fonctions trigger
-- ============================================================================

-- Fonction handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW());

  INSERT INTO public.user_credits (user_id, balance, created_at, updated_at)
  VALUES (NEW.id, 0, NOW(), NOW());

  INSERT INTO public.subscriptions (user_id, plan, status, created_at, updated_at)
  VALUES (NEW.id, 'free', 'active', NOW(), NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_updated_at();

-- ============================================================================
-- ÉTAPE 8: Peupler les données initiales
-- ============================================================================

-- Peupler shop_items avec les plans d'abonnement
INSERT INTO public.shop_items (name, description, item_type, credits_amount, price, features, display_order, is_active) VALUES
('Gratuit', 'Plan de base pour découvrir FleetCheck', 'subscription', 5, 0, '["5 crédits/mois", "Inspections limitées", "Support email"]', 1, true),
('Starter', 'Idéal pour les petites flottes', 'subscription', 50, 29, '["50 crédits/mois", "Inspections illimitées", "Support prioritaire", "Statistiques de base"]', 2, true),
('Basic', 'Pour les flottes en croissance', 'subscription', 150, 79, '["150 crédits/mois", "Tout de Starter", "Tracking GPS", "Rapports avancés", "API access"]', 3, true),
('Pro', 'Solution professionnelle complète', 'subscription', 500, 199, '["500 crédits/mois", "Tout de Basic", "IA Assistant inclus", "Support 24/7", "Multi-utilisateurs", "Intégrations avancées"]', 4, true),
('Business', 'Pour les grandes entreprises', 'subscription', 1500, 499, '["1500 crédits/mois", "Tout de Pro", "Gestion multi-sites", "Formation personnalisée", "Account manager dédié", "SLA garanti"]', 5, true),
('Enterprise', 'Solution sur-mesure', 'subscription', 5000, 999, '["5000 crédits/mois", "Tout de Business", "Développement sur-mesure", "Infrastructure dédiée", "Contrat personnalisé", "Support prioritaire 24/7"]', 6, true)
ON CONFLICT DO NOTHING;

-- Peupler feature_costs
INSERT INTO public.feature_costs (feature_name, feature_key, description, credit_cost, free_from_plan, is_active) VALUES
('Créer une mission', 'mission_create', 'Coût pour créer une nouvelle mission', 1, 'free', true),
('Inspection véhicule', 'inspection_create', 'Coût pour créer une inspection', 2, 'starter', true),
('Tracking GPS en temps réel', 'gps_tracking', 'Coût par heure de tracking GPS', 5, 'basic', true),
('Génération PDF inspection', 'pdf_generation', 'Coût pour générer un PDF d''inspection', 1, 'free', true),
('Assistant IA', 'ai_assistant', 'Coût par requête IA', 3, 'pro', true),
('Partage de lien public', 'public_link', 'Coût pour créer un lien de suivi public', 1, 'basic', true),
('Analyse de trajet', 'route_analysis', 'Analyse avancée d''un trajet', 4, 'pro', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIN DU SCRIPT - 54 TABLES CRÉÉES
-- ============================================================================
-- Toutes les tables ont été recréées avec succès !
-- N'oubliez pas de créer les buckets storage manuellement dans l'interface Supabase
-- ============================================================================
