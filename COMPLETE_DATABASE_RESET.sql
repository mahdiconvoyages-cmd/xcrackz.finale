-- ============================================================================
-- SCRIPT COMPLET DE RESET DE LA BASE DE DONNÉES FLEETCHECK
-- ============================================================================
-- Ce script supprime et recrée TOUTES les tables et buckets storage
-- ATTENTION: Toutes les données seront perdues !
-- ============================================================================

-- ÉTAPE 1: Supprimer toutes les tables existantes
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
DROP TABLE IF EXISTS public.covoiturage_messages CASCADE;
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

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_credits() CASCADE;
DROP FUNCTION IF EXISTS public.assign_credits_on_subscription_change() CASCADE;

-- ============================================================================
-- ÉTAPE 2: Créer les tables de base
-- ============================================================================

-- Table profiles (DOIT être créée en premier car beaucoup de tables en dépendent)
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  first_name text,
  last_name text,
  full_name text,
  phone text,
  avatar_url text,
  company_name text,
  company_siret text,
  company_address text,
  is_admin boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  rating_average numeric DEFAULT 0,
  user_type text DEFAULT 'donneur_ordre'::text,
  banned boolean DEFAULT false,
  ban_reason text,
  banned_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table clients
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  company_name text,
  siret text,
  siren text,
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'France'::text,
  notes text,
  is_company boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table contacts
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['customer'::text, 'driver'::text, 'supplier'::text])),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  company text,
  notes text,
  is_driver boolean DEFAULT false,
  driver_licenses text[] DEFAULT '{}'::text[],
  current_latitude numeric,
  current_longitude numeric,
  availability_status text DEFAULT 'offline'::text,
  preferred_zones text[] DEFAULT '{}'::text[],
  rating_average numeric DEFAULT 0,
  missions_completed integer DEFAULT 0,
  last_location_update timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table missions
CREATE TABLE public.missions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  vehicle_brand text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_plate text,
  vehicle_vin text,
  vehicle_year integer,
  vehicle_color text,
  pickup_address text NOT NULL,
  pickup_lat numeric,
  pickup_lng numeric,
  pickup_date timestamp with time zone,
  pickup_contact_name text,
  pickup_contact_phone text,
  delivery_address text NOT NULL,
  delivery_lat numeric,
  delivery_lng numeric,
  delivery_date timestamp with time zone,
  delivery_contact_name text,
  delivery_contact_phone text,
  client_name text,
  client_phone text,
  client_email text,
  driver_id uuid,
  driver_commission numeric,
  company_commission numeric,
  bonus_amount numeric,
  distance_km numeric,
  price numeric DEFAULT 0,
  notes text,
  special_instructions text,
  tracking_code text,
  vehicle_image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT missions_pkey PRIMARY KEY (id),
  CONSTRAINT missions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT missions_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.contacts(id)
);

-- ============================================================================
-- ÉTAPE 3: Créer les tables de gestion des crédits et abonnements
-- ============================================================================

-- Table shop_items
CREATE TABLE public.shop_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  item_type text NOT NULL CHECK (item_type = ANY (ARRAY['subscription'::text, 'credits'::text, 'addon'::text])),
  credits_amount integer,
  price numeric NOT NULL,
  currency text DEFAULT 'EUR'::text,
  is_active boolean DEFAULT true,
  features jsonb DEFAULT '[]'::jsonb,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shop_items_pkey PRIMARY KEY (id)
);

-- Table user_credits
CREATE TABLE public.user_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  total_earned integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  subscription_expires_at timestamp with time zone,
  last_subscription_package_id uuid,
  CONSTRAINT user_credits_pkey PRIMARY KEY (id),
  CONSTRAINT user_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table subscriptions
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL CHECK (plan = ANY (ARRAY['free'::text, 'starter'::text, 'basic'::text, 'pro'::text, 'business'::text, 'enterprise'::text])),
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'canceled'::text, 'expired'::text, 'trial'::text])),
  current_period_start timestamp with time zone DEFAULT now(),
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  payment_method text,
  assigned_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT subscriptions_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id)
);

-- Table credit_usage_log
CREATE TABLE public.credit_usage_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  credits_used integer NOT NULL,
  was_free boolean DEFAULT false,
  reason text,
  reference_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT credit_usage_log_pkey PRIMARY KEY (id),
  CONSTRAINT credit_usage_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table feature_costs
CREATE TABLE public.feature_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  feature_name text NOT NULL UNIQUE,
  feature_key text NOT NULL UNIQUE,
  description text,
  credit_cost integer NOT NULL DEFAULT 0,
  free_from_plan text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feature_costs_pkey PRIMARY KEY (id)
);

-- Table transactions
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  package_id uuid,
  amount numeric NOT NULL,
  credits integer NOT NULL,
  payment_id text UNIQUE,
  payment_status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT transactions_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.shop_items(id)
);

-- ============================================================================
-- ÉTAPE 4: Créer les tables d'inspection
-- ============================================================================

-- Table inspections
CREATE TABLE public.inspections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'departure_completed'::text, 'completed'::text])),
  vehicle_brand text NOT NULL DEFAULT ''::text,
  vehicle_model text NOT NULL DEFAULT ''::text,
  vehicle_registration text NOT NULL DEFAULT ''::text,
  vehicle_type text NOT NULL DEFAULT 'VL'::text CHECK (vehicle_type = ANY (ARRAY['VL'::text, 'VU'::text, 'PL'::text])),
  km_start integer DEFAULT 0,
  fuel_level_start text DEFAULT ''::text,
  km_end integer,
  fuel_level_end text,
  exterior_notes text DEFAULT ''::text,
  interior_notes text DEFAULT ''::text,
  arrival_notes text,
  signature_departure text,
  signature_departure_name text,
  signature_departure_date timestamp with time zone,
  signature_arrival text,
  signature_arrival_name text,
  signature_arrival_date timestamp with time zone,
  pdf_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inspections_pkey PRIMARY KEY (id),
  CONSTRAINT inspections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table vehicle_inspections
CREATE TABLE public.vehicle_inspections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  inspector_id uuid,
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
  status text DEFAULT 'in_progress'::text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicle_inspections_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_inspections_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE,
  CONSTRAINT vehicle_inspections_inspector_id_fkey FOREIGN KEY (inspector_id) REFERENCES public.profiles(id)
);

-- Table inspection_photos
CREATE TABLE public.inspection_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['vehicle_front'::text, 'vehicle_back'::text, 'vehicle_side'::text, 'exterior'::text, 'interior'::text, 'arrival'::text])),
  photo_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inspection_photos_pkey PRIMARY KEY (id),
  CONSTRAINT inspection_photos_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.inspections(id) ON DELETE CASCADE
);

-- ============================================================================
-- ÉTAPE 5: Créer les tables de suivi GPS
-- ============================================================================

-- Table gps_tracking_sessions
CREATE TABLE public.gps_tracking_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  departure_inspection_id uuid,
  arrival_inspection_id uuid,
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
  status text DEFAULT 'active'::text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gps_tracking_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT gps_tracking_sessions_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE,
  CONSTRAINT gps_tracking_sessions_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id),
  CONSTRAINT gps_tracking_sessions_departure_inspection_id_fkey FOREIGN KEY (departure_inspection_id) REFERENCES public.vehicle_inspections(id),
  CONSTRAINT gps_tracking_sessions_arrival_inspection_id_fkey FOREIGN KEY (arrival_inspection_id) REFERENCES public.vehicle_inspections(id)
);

-- Table gps_location_points
CREATE TABLE public.gps_location_points (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  altitude numeric,
  accuracy numeric,
  speed_kmh numeric,
  heading numeric,
  recorded_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gps_location_points_pkey PRIMARY KEY (id),
  CONSTRAINT gps_location_points_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.gps_tracking_sessions(id) ON DELETE CASCADE
);

-- Table mission_tracking_sessions
CREATE TABLE public.mission_tracking_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  driver_id uuid NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  total_distance double precision DEFAULT 0,
  max_speed double precision DEFAULT 0,
  average_speed double precision DEFAULT 0,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'completed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mission_tracking_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT mission_tracking_sessions_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE,
  CONSTRAINT mission_tracking_sessions_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id)
);

-- Table mission_tracking_positions
CREATE TABLE public.mission_tracking_positions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed double precision DEFAULT 0,
  heading double precision DEFAULT 0,
  accuracy double precision DEFAULT 0,
  altitude double precision DEFAULT 0,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mission_tracking_positions_pkey PRIMARY KEY (id),
  CONSTRAINT mission_tracking_positions_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE
);

-- Table mission_public_links
CREATE TABLE public.mission_public_links (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL,
  unique_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'::text) UNIQUE,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mission_public_links_pkey PRIMARY KEY (id),
  CONSTRAINT mission_public_links_mission_id_fkey FOREIGN KEY (mission_id) REFERENCES public.missions(id) ON DELETE CASCADE,
  CONSTRAINT mission_public_links_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);

-- ============================================================================
-- ÉTAPE 6: Créer les tables de covoiturage
-- ============================================================================

-- Table carpooling_trips
CREATE TABLE public.carpooling_trips (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL,
  departure_address text NOT NULL,
  departure_city text NOT NULL,
  departure_lat numeric,
  departure_lng numeric,
  departure_datetime timestamp with time zone NOT NULL,
  arrival_address text NOT NULL,
  arrival_city text NOT NULL,
  arrival_lat numeric,
  arrival_lng numeric,
  estimated_arrival timestamp with time zone,
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
  luggage_size text DEFAULT 'medium'::text CHECK (luggage_size = ANY (ARRAY['small'::text, 'medium'::text, 'large'::text])),
  description text,
  automatic_booking boolean DEFAULT false,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text, 'completed'::text, 'full'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carpooling_trips_pkey PRIMARY KEY (id),
  CONSTRAINT carpooling_trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table carpooling_bookings
CREATE TABLE public.carpooling_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  passenger_id uuid NOT NULL,
  seats_booked integer NOT NULL DEFAULT 1,
  total_price numeric NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text, 'cancelled'::text])),
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carpooling_bookings_pkey PRIMARY KEY (id),
  CONSTRAINT carpooling_bookings_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.carpooling_trips(id) ON DELETE CASCADE,
  CONSTRAINT carpooling_bookings_passenger_id_fkey FOREIGN KEY (passenger_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table carpooling_reviews
CREATE TABLE public.carpooling_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewed_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  punctuality_rating integer CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  driving_rating integer CHECK (driving_rating >= 1 AND driving_rating <= 5),
  friendliness_rating integer CHECK (friendliness_rating >= 1 AND friendliness_rating <= 5),
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carpooling_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT carpooling_reviews_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.carpooling_trips(id) ON DELETE CASCADE,
  CONSTRAINT carpooling_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id),
  CONSTRAINT carpooling_reviews_reviewed_id_fkey FOREIGN KEY (reviewed_id) REFERENCES public.profiles(id)
);

-- Table carpooling_messages
CREATE TABLE public.carpooling_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carpooling_messages_pkey PRIMARY KEY (id),
  CONSTRAINT carpooling_messages_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.carpooling_trips(id) ON DELETE CASCADE,
  CONSTRAINT carpooling_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id),
  CONSTRAINT carpooling_messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id)
);

-- ============================================================================
-- ÉTAPE 7: Créer les tables d'IA
-- ============================================================================

-- Table ai_conversations
CREATE TABLE public.ai_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT ai_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table ai_messages
CREATE TABLE public.ai_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
  content text NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_messages_pkey PRIMARY KEY (id),
  CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON DELETE CASCADE
);

-- ============================================================================
-- ÉTAPE 8: Créer les tables de support
-- ============================================================================

-- Table support_conversations
CREATE TABLE public.support_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'pending'::text, 'resolved'::text, 'closed'::text])),
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])),
  category text DEFAULT 'general'::text CHECK (category = ANY (ARRAY['technical'::text, 'billing'::text, 'general'::text, 'feature_request'::text, 'bug'::text, 'account'::text])),
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT support_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table support_messages
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid,
  sender_type text DEFAULT 'user'::text CHECK (sender_type = ANY (ARRAY['user'::text, 'admin'::text, 'bot'::text])),
  message text NOT NULL,
  is_automated boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT support_messages_pkey PRIMARY KEY (id),
  CONSTRAINT support_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);

-- ============================================================================
-- ÉTAPE 9: Créer les tables GDPR
-- ============================================================================

-- Table user_consents
CREATE TABLE public.user_consents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analytics boolean DEFAULT false,
  marketing boolean DEFAULT false,
  functional boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_consents_pkey PRIMARY KEY (id),
  CONSTRAINT user_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table data_access_logs
CREATE TABLE public.data_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action = ANY (ARRAY['export'::text, 'view'::text, 'update'::text, 'delete'::text])),
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT data_access_logs_pkey PRIMARY KEY (id),
  CONSTRAINT data_access_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table deletion_requests
CREATE TABLE public.deletion_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text,
  requested_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT deletion_requests_pkey PRIMARY KEY (id),
  CONSTRAINT deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Table account_creation_attempts
CREATE TABLE public.account_creation_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  ip_address text,
  user_agent text,
  attempt_date timestamp with time zone DEFAULT now(),
  success boolean DEFAULT false,
  error_message text,
  duplicate_detected boolean DEFAULT false,
  existing_user_id uuid,
  CONSTRAINT account_creation_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT account_creation_attempts_existing_user_id_fkey FOREIGN KEY (existing_user_id) REFERENCES public.profiles(id)
);

-- Table suspicious_accounts
CREATE TABLE public.suspicious_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  reason text NOT NULL,
  severity text DEFAULT 'medium'::text CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  detected_at timestamp with time zone DEFAULT now(),
  reviewed boolean DEFAULT false,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  notes text,
  CONSTRAINT suspicious_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT suspicious_accounts_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id)
);

-- ============================================================================
-- ÉTAPE 10: Activer RLS sur toutes les tables
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_tracking_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_public_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carpooling_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_creation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_accounts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 11: Créer les policies RLS de base
-- ============================================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Missions policies
CREATE POLICY "Users can view own missions" ON public.missions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create missions" ON public.missions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.missions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own missions" ON public.missions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Shop items are public for viewing
CREATE POLICY "Anyone can view active shop items" ON public.shop_items FOR SELECT TO authenticated USING (is_active = true);

-- User credits policies
CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- ÉTAPE 12: Créer la fonction handle_new_user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );

  INSERT INTO public.user_credits (user_id, balance, created_at, updated_at)
  VALUES (
    NEW.id,
    0,
    NOW(),
    NOW()
  );

  INSERT INTO public.subscriptions (user_id, plan, status, created_at, updated_at)
  VALUES (
    NEW.id,
    'free',
    'active',
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ÉTAPE 13: Peupler la table shop_items avec les plans
-- ============================================================================

INSERT INTO public.shop_items (name, description, item_type, credits_amount, price, features, display_order, is_active) VALUES
('Gratuit', 'Plan de base pour découvrir FleetCheck', 'subscription', 5, 0, '["5 crédits/mois", "Inspections limitées", "Support email"]', 1, true),
('Starter', 'Idéal pour les petites flottes', 'subscription', 50, 29, '["50 crédits/mois", "Inspections illimitées", "Support prioritaire", "Statistiques de base"]', 2, true),
('Basic', 'Pour les flottes en croissance', 'subscription', 150, 79, '["150 crédits/mois", "Tout de Starter", "Tracking GPS", "Rapports avancés", "API access"]', 3, true),
('Pro', 'Solution professionnelle complète', 'subscription', 500, 199, '["500 crédits/mois", "Tout de Basic", "IA Assistant inclus", "Support 24/7", "Multi-utilisateurs", "Intégrations avancées"]', 4, true),
('Business', 'Pour les grandes entreprises', 'subscription', 1500, 499, '["1500 crédits/mois", "Tout de Pro", "Gestion multi-sites", "Formation personnalisée", "Account manager dédié", "SLA garanti"]', 5, true),
('Enterprise', 'Solution sur-mesure', 'subscription', 5000, 999, '["5000 crédits/mois", "Tout de Business", "Développement sur-mesure", "Infrastructure dédiée", "Contrat personnalisé", "Support prioritaire 24/7"]', 6, true);

-- ============================================================================
-- ÉTAPE 14: Peupler la table feature_costs
-- ============================================================================

INSERT INTO public.feature_costs (feature_name, feature_key, description, credit_cost, free_from_plan, is_active) VALUES
('Créer une mission', 'mission_create', 'Coût pour créer une nouvelle mission', 1, 'free', true),
('Inspection véhicule', 'inspection_create', 'Coût pour créer une inspection', 2, 'starter', true),
('Tracking GPS en temps réel', 'gps_tracking', 'Coût par heure de tracking GPS', 5, 'basic', true),
('Génération PDF inspection', 'pdf_generation', 'Coût pour générer un PDF d''inspection', 1, 'free', true),
('Assistant IA', 'ai_assistant', 'Coût par requête IA', 3, 'pro', true),
('Partage de lien public', 'public_link', 'Coût pour créer un lien de suivi public', 1, 'basic', true),
('Analyse de trajet', 'route_analysis', 'Analyse avancée d''un trajet', 4, 'pro', true);

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================
-- Toutes les tables ont été recréées avec succès !
-- N'oubliez pas de créer les buckets storage manuellement dans l'interface Supabase
-- ============================================================================
