/*
  # FleetCheck Database Schema

  Complete database schema for FleetCheck SaaS platform.

  ## Tables Created
  - profiles: User profiles
  - missions: Convoy missions
  - inspection_departures: Vehicle departure inspections
  - inspection_arrivals: Vehicle arrival inspections
  - contacts: User contact book
  - company_info: Company information for billing
  - billing_clients: Billing clients
  - invoices: Invoices
  - quotes: Quotes
  - marketplace_missions: Public marketplace missions
  - marketplace_mission_responses: Responses to marketplace missions
  - shared_rides: Ride-sharing offers
  - ride_reservations: Ride reservations
  - ride_messages: Ride-sharing chat messages
  - wallets: User credit wallets
  - notifications: User notifications

  ## Security
  - RLS enabled on all tables
  - Policies for authenticated users only
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    app_role TEXT DEFAULT 'convoyeur' CHECK (app_role IN ('admin', 'donneur_d_ordre', 'convoyeur')),
    is_verified BOOLEAN DEFAULT FALSE,
    credits INTEGER DEFAULT 0,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- MISSIONS TABLE
CREATE TABLE IF NOT EXISTS missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reference TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'cancelled')),
    pickup_address TEXT,
    delivery_address TEXT,
    pickup_lat NUMERIC,
    pickup_lng NUMERIC,
    delivery_lat NUMERIC,
    delivery_lng NUMERIC,
    distance_km NUMERIC,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    vehicle_vin TEXT,
    vehicle_license_plate TEXT,
    scheduled_pickup TIMESTAMPTZ,
    scheduled_delivery TIMESTAMPTZ,
    actual_pickup TIMESTAMPTZ,
    actual_delivery TIMESTAMPTZ,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own missions" ON missions
    FOR SELECT TO authenticated
    USING (auth.uid() = creator_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can create missions" ON missions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own missions" ON missions
    FOR UPDATE TO authenticated
    USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete own missions" ON missions
    FOR DELETE TO authenticated
    USING (auth.uid() = creator_id);

-- INSPECTION DEPARTURES TABLE
CREATE TABLE IF NOT EXISTS inspection_departures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    photos JSONB,
    initial_mileage NUMERIC,
    initial_fuel NUMERIC,
    fuel_percent INTEGER,
    keys_count INTEGER,
    has_fuel_card BOOLEAN DEFAULT FALSE,
    has_board_documents BOOLEAN DEFAULT FALSE,
    client_email TEXT,
    internal_notes TEXT,
    client_signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inspection_departures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inspections of their missions" ON inspection_departures
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM missions
            WHERE missions.id = mission_id
            AND (missions.creator_id = auth.uid() OR missions.assigned_to = auth.uid())
        )
    );

CREATE POLICY "Users can insert inspections for their missions" ON inspection_departures
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM missions
            WHERE missions.id = mission_id
            AND (missions.creator_id = auth.uid() OR missions.assigned_to = auth.uid())
        )
    );

-- INSPECTION ARRIVALS TABLE
CREATE TABLE IF NOT EXISTS inspection_arrivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    photos JSONB,
    final_mileage NUMERIC,
    final_fuel NUMERIC,
    driver_notes TEXT,
    client_notes TEXT,
    client_signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inspection_arrivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view arrival inspections of their missions" ON inspection_arrivals
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM missions
            WHERE missions.id = mission_id
            AND (missions.creator_id = auth.uid() OR missions.assigned_to = auth.uid())
        )
    );

CREATE POLICY "Users can insert arrival inspections" ON inspection_arrivals
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM missions
            WHERE missions.id = mission_id
            AND (missions.creator_id = auth.uid() OR missions.assigned_to = auth.uid())
        )
    );

-- CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invited_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON contacts
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = invited_user_id);

CREATE POLICY "Users can create contacts" ON contacts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update contacts" ON contacts
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR auth.uid() = invited_user_id);

CREATE POLICY "Users can delete own contacts" ON contacts
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- COMPANY INFO TABLE
CREATE TABLE IF NOT EXISTS company_info (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    siret TEXT,
    address TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT DEFAULT 'France',
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company info" ON company_info
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company info" ON company_info
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company info" ON company_info
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- BILLING CLIENTS TABLE
CREATE TABLE IF NOT EXISTS billing_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_company BOOLEAN DEFAULT FALSE,
    company_name TEXT,
    siret TEXT,
    first_name TEXT,
    last_name TEXT,
    address TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    city TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE billing_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clients" ON billing_clients
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create clients" ON billing_clients
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON billing_clients
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON billing_clients
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES billing_clients(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal_ht NUMERIC NOT NULL,
    vat_rate NUMERIC DEFAULT 20,
    vat_amount NUMERIC NOT NULL,
    total_ttc NUMERIC NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    items JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create invoices" ON invoices
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- QUOTES TABLE
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES billing_clients(id) ON DELETE SET NULL,
    quote_number TEXT UNIQUE NOT NULL,
    quote_date DATE NOT NULL,
    validity_date DATE NOT NULL,
    subtotal_ht NUMERIC NOT NULL,
    vat_rate NUMERIC DEFAULT 20,
    vat_amount NUMERIC NOT NULL,
    total_ttc NUMERIC NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    items JSONB NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quotes" ON quotes
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create quotes" ON quotes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes" ON quotes
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes" ON quotes
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- MARKETPLACE MISSIONS TABLE
CREATE TABLE IF NOT EXISTS marketplace_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'convoyage' CHECK (category IN ('convoyage', 'transport')),
    budget NUMERIC,
    origin_city TEXT,
    origin_address TEXT,
    destination_city TEXT,
    destination_address TEXT,
    departure_date DATE,
    departure_time TIME,
    status TEXT DEFAULT 'published' CHECK (status IN ('published', 'assigned', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketplace_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published missions are public" ON marketplace_missions
    FOR SELECT TO authenticated
    USING (status = 'published' OR auth.uid() = creator_id);

CREATE POLICY "Users can create marketplace missions" ON marketplace_missions
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update own marketplace missions" ON marketplace_missions
    FOR UPDATE TO authenticated
    USING (auth.uid() = creator_id);

-- MARKETPLACE MISSION RESPONSES TABLE
CREATE TABLE IF NOT EXISTS marketplace_mission_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mission_id UUID NOT NULL REFERENCES marketplace_missions(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT,
    proposed_price NUMERIC,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketplace_mission_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses to their missions" ON marketplace_mission_responses
    FOR SELECT TO authenticated
    USING (
        auth.uid() = responder_id OR
        EXISTS (
            SELECT 1 FROM marketplace_missions
            WHERE marketplace_missions.id = mission_id
            AND marketplace_missions.creator_id = auth.uid()
        )
    );

CREATE POLICY "Users can create responses" ON marketplace_mission_responses
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = responder_id);

CREATE POLICY "Mission creators can update responses" ON marketplace_mission_responses
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM marketplace_missions
            WHERE marketplace_missions.id = mission_id
            AND marketplace_missions.creator_id = auth.uid()
        )
    );

-- SHARED RIDES TABLE (Covoiturage)
CREATE TABLE IF NOT EXISTS shared_rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    available_seats INTEGER NOT NULL CHECK (available_seats > 0),
    price_per_seat NUMERIC NOT NULL CHECK (price_per_seat >= 0),
    vehicle_description TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shared_rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active rides are public" ON shared_rides
    FOR SELECT TO authenticated
    USING (status = 'active' OR auth.uid() = driver_id);

CREATE POLICY "Users can create rides" ON shared_rides
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own rides" ON shared_rides
    FOR UPDATE TO authenticated
    USING (auth.uid() = driver_id);

-- RIDE RESERVATIONS TABLE
CREATE TABLE IF NOT EXISTS ride_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES shared_rides(id) ON DELETE CASCADE,
    passenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seats_count INTEGER DEFAULT 1 CHECK (seats_count > 0),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ride_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reservations for their rides or their own reservations" ON ride_reservations
    FOR SELECT TO authenticated
    USING (
        auth.uid() = passenger_id OR
        EXISTS (
            SELECT 1 FROM shared_rides
            WHERE shared_rides.id = ride_id
            AND shared_rides.driver_id = auth.uid()
        )
    );

CREATE POLICY "Users can create reservations" ON ride_reservations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Drivers and passengers can update reservations" ON ride_reservations
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = passenger_id OR
        EXISTS (
            SELECT 1 FROM shared_rides
            WHERE shared_rides.id = ride_id
            AND shared_rides.driver_id = auth.uid()
        )
    );

-- RIDE MESSAGES TABLE
CREATE TABLE IF NOT EXISTS ride_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES shared_rides(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ride_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for rides they're involved in" ON ride_messages
    FOR SELECT TO authenticated
    USING (
        auth.uid() = sender_id OR
        EXISTS (
            SELECT 1 FROM shared_rides
            WHERE shared_rides.id = ride_id
            AND shared_rides.driver_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM ride_reservations
            WHERE ride_reservations.ride_id = ride_id
            AND ride_reservations.passenger_id = auth.uid()
        )
    );

CREATE POLICY "Users can send messages for rides they're involved in" ON ride_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = sender_id AND (
            EXISTS (
                SELECT 1 FROM shared_rides
                WHERE shared_rides.id = ride_id
                AND shared_rides.driver_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM ride_reservations
                WHERE ride_reservations.ride_id = ride_id
                AND ride_reservations.passenger_id = auth.uid()
            )
        )
    );

-- WALLETS TABLE
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance NUMERIC DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON wallets
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_missions_creator ON missions(creator_id);
CREATE INDEX idx_missions_assigned ON missions(assigned_to);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_marketplace_missions_status ON marketplace_missions(status);
CREATE INDEX idx_shared_rides_status ON shared_rides(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'FleetCheck database schema created successfully!';
END $$;
