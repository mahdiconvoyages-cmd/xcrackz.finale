/*
  # Système d'inspections pour xCrackz

  1. Nouvelles Tables
    - `inspections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers auth.users)
      - `status` (enum: draft, departure_completed, completed)
      - `vehicle_brand` (text)
      - `vehicle_model` (text)
      - `vehicle_registration` (text)
      - `vehicle_type` (text: VL/VU/PL)
      - `km_start` (integer)
      - `fuel_level_start` (text)
      - `km_end` (integer, nullable)
      - `fuel_level_end` (text, nullable)
      - `exterior_notes` (text)
      - `interior_notes` (text)
      - `arrival_notes` (text, nullable)
      - `signature_departure` (text, base64)
      - `signature_departure_name` (text)
      - `signature_departure_date` (timestamptz)
      - `signature_arrival` (text, base64, nullable)
      - `signature_arrival_name` (text, nullable)
      - `signature_arrival_date` (timestamptz, nullable)
      - `pdf_url` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `inspection_defects`
      - `id` (uuid, primary key)
      - `inspection_id` (uuid, foreign key)
      - `category` (text: exterior/interior)
      - `defect_type` (text)
      - `description` (text, nullable)
      - `created_at` (timestamptz)
      
    - `inspection_photos`
      - `id` (uuid, primary key)
      - `inspection_id` (uuid, foreign key)
      - `category` (text: vehicle_front/vehicle_back/vehicle_side/exterior/interior/arrival)
      - `photo_url` (text)
      - `created_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Les utilisateurs authentifiés peuvent créer des inspections
    - Les utilisateurs ne peuvent voir que leurs propres inspections
    - Les utilisateurs peuvent mettre à jour leurs propres inspections en cours
*/

-- Create inspections table
CREATE TABLE IF NOT EXISTS inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inspection_defects table
CREATE TABLE IF NOT EXISTS inspection_defects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('exterior', 'interior')),
  defect_type text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create inspection_photos table
CREATE TABLE IF NOT EXISTS inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN ('vehicle_front', 'vehicle_back', 'vehicle_side', 'exterior', 'interior', 'arrival')),
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspections
CREATE POLICY "Users can view own inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own inspections"
  ON inspections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inspections"
  ON inspections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own inspections"
  ON inspections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for inspection_defects
CREATE POLICY "Users can view own inspection defects"
  ON inspection_defects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_defects.inspection_id
      AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own inspection defects"
  ON inspection_defects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_defects.inspection_id
      AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own inspection defects"
  ON inspection_defects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_defects.inspection_id
      AND inspections.user_id = auth.uid()
    )
  );

-- RLS Policies for inspection_photos
CREATE POLICY "Users can view own inspection photos"
  ON inspection_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_photos.inspection_id
      AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own inspection photos"
  ON inspection_photos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_photos.inspection_id
      AND inspections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own inspection photos"
  ON inspection_photos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inspections
      WHERE inspections.id = inspection_photos.inspection_id
      AND inspections.user_id = auth.uid()
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspection_defects_inspection_id ON inspection_defects(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection_id ON inspection_photos(inspection_id);
