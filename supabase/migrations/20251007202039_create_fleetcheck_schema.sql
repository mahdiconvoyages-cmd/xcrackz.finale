/*
  # FleetCheck Complete Database Schema

  ## Overview
  Complete database schema for FleetCheck vehicle convoy management platform with authentication, missions, contacts, billing, and marketplace functionality.

  ## Tables Created
  
  ### 1. profiles
  - Extended user profile information
  - Links to auth.users
  - Contains company info, subscription details
  
  ### 2. missions
  - Core convoy mission tracking
  - Includes pickup/delivery locations, vehicle details
  - Status tracking (pending, in_progress, completed, cancelled)
  
  ### 3. mission_inspections
  - Vehicle inspection records at departure/arrival
  - Photos, mileage, damage reports
  - Digital signatures
  
  ### 4. contacts
  - Customer and driver contact management
  - Type categorization (customer, driver, supplier)
  
  ### 5. invoices
  - Billing and invoicing system
  - French legal compliance fields
  - Status tracking (draft, sent, paid, cancelled)
  
  ### 6. invoice_items
  - Line items for invoices
  - Quantity, unit price, VAT calculations
  
  ### 7. marketplace_listings
  - Public mission marketplace
  - Price, availability, acceptance tracking
  
  ### 8. covoiturage_offers
  - Ride-sharing for return trips
  - Seat availability and pricing
  
  ### 9. covoiturage_bookings
  - Bookings for ride-sharing offers
  - Payment and confirmation tracking
  
  ### 10. reports
  - Custom report generation
  - Filter configuration storage
  
  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies enforce user authentication and data ownership
  - Restrictive by default - explicit access grants only
  
  ## Indexes
  - Optimized for common query patterns
  - Foreign key relationships indexed
  - Status and date fields indexed for filtering
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  company_name text,
  phone text,
  address text,
  siret text,
  vat_number text,
  subscription_plan text DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('customer', 'driver', 'supplier')),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  company text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create missions table
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  vehicle_brand text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_plate text,
  vehicle_vin text,
  
  pickup_address text NOT NULL,
  pickup_lat numeric,
  pickup_lng numeric,
  pickup_date timestamptz,
  pickup_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  
  delivery_address text NOT NULL,
  delivery_lat numeric,
  delivery_lng numeric,
  delivery_date timestamptz,
  delivery_contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  
  driver_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  
  distance numeric,
  duration numeric,
  price numeric DEFAULT 0,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create mission_inspections table
CREATE TABLE IF NOT EXISTS mission_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('departure', 'arrival')),
  
  mileage integer,
  fuel_level text,
  exterior_condition text,
  interior_condition text,
  damages text,
  photos jsonb DEFAULT '[]',
  
  inspector_name text,
  inspector_signature text,
  
  inspected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  invoice_number text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('invoice', 'quote', 'credit_note')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  
  customer_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_address text,
  customer_siret text,
  customer_vat_number text,
  
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  
  subtotal numeric DEFAULT 0,
  vat_rate numeric DEFAULT 20,
  vat_amount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  
  notes text,
  payment_terms text,
  
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  description text NOT NULL,
  quantity numeric DEFAULT 1,
  unit_price numeric DEFAULT 0,
  vat_rate numeric DEFAULT 20,
  total numeric DEFAULT 0,
  
  created_at timestamptz DEFAULT now()
);

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  
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
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create covoiturage_offers table
CREATE TABLE IF NOT EXISTS covoiturage_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  
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
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create covoiturage_bookings table
CREATE TABLE IF NOT EXISTS covoiturage_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES covoiturage_offers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  seats_booked integer DEFAULT 1,
  total_price numeric DEFAULT 0,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('missions', 'financial', 'custom')),
  
  filters jsonb DEFAULT '{}',
  
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE covoiturage_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE covoiturage_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for contacts
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for missions
CREATE POLICY "Users can view own missions"
  ON missions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own missions"
  ON missions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own missions"
  ON missions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own missions"
  ON missions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for mission_inspections
CREATE POLICY "Users can view own mission inspections"
  ON mission_inspections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_inspections.mission_id
      AND missions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own mission inspections"
  ON mission_inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_inspections.mission_id
      AND missions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own mission inspections"
  ON mission_inspections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_inspections.mission_id
      AND missions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM missions
      WHERE missions.id = mission_inspections.mission_id
      AND missions.user_id = auth.uid()
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for invoice_items
CREATE POLICY "Users can view own invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own invoice items"
  ON invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own invoice items"
  ON invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own invoice items"
  ON invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- RLS Policies for marketplace_listings
CREATE POLICY "All authenticated users can view marketplace listings"
  ON marketplace_listings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own marketplace listings"
  ON marketplace_listings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own marketplace listings"
  ON marketplace_listings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own marketplace listings"
  ON marketplace_listings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for covoiturage_offers
CREATE POLICY "All authenticated users can view covoiturage offers"
  ON covoiturage_offers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own covoiturage offers"
  ON covoiturage_offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own covoiturage offers"
  ON covoiturage_offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own covoiturage offers"
  ON covoiturage_offers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for covoiturage_bookings
CREATE POLICY "Users can view own bookings"
  ON covoiturage_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Offer owners can view bookings"
  ON covoiturage_bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM covoiturage_offers
      WHERE covoiturage_offers.id = covoiturage_bookings.offer_id
      AND covoiturage_offers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert bookings"
  ON covoiturage_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON covoiturage_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for reports
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_missions_user_id ON missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_pickup_date ON missions(pickup_date);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_covoiturage_offers_status ON covoiturage_offers(status);
CREATE INDEX IF NOT EXISTS idx_covoiturage_offers_departure_date ON covoiturage_offers(departure_date);
