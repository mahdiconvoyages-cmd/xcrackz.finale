-- ========================================
-- SYSTÈME DE DISPONIBILITÉS
-- ========================================

-- Table pour stocker les disponibilités des utilisateurs
CREATE TABLE IF NOT EXISTS availability_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('available', 'unavailable', 'partially_available')),
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_availability_user_date ON availability_calendar(user_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_calendar(date);
CREATE INDEX IF NOT EXISTS idx_availability_status ON availability_calendar(status);

-- Vue pour voir les disponibilités des contacts
CREATE OR REPLACE VIEW contact_availability AS
SELECT 
  c.id as contact_id,
  c.user_id as viewer_id,
  c.invited_user_id as contact_user_id,
  c.name as contact_name,
  c.email as contact_email,
  c.type as contact_type,
  c.has_calendar_access,
  ac.id as availability_id,
  ac.date,
  ac.status,
  ac.start_time,
  ac.end_time,
  ac.notes,
  ac.created_at,
  ac.updated_at
FROM contacts c
LEFT JOIN availability_calendar ac ON c.invited_user_id = ac.user_id
WHERE c.invitation_status = 'accepted'
  AND c.has_calendar_access = true;

-- Fonction pour définir une disponibilité
CREATE OR REPLACE FUNCTION set_availability(
  p_user_id uuid,
  p_date date,
  p_status text,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_availability_id uuid;
BEGIN
  -- Validation du statut
  IF p_status NOT IN ('available', 'unavailable', 'partially_available') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Statut invalide. Utilisez: available, unavailable ou partially_available'
    );
  END IF;

  -- Insert ou update
  INSERT INTO availability_calendar (
    user_id,
    date,
    status,
    start_time,
    end_time,
    notes
  ) VALUES (
    p_user_id,
    p_date,
    p_status,
    p_start_time,
    p_end_time,
    p_notes
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    status = EXCLUDED.status,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    notes = EXCLUDED.notes,
    updated_at = now()
  RETURNING id INTO v_availability_id;

  RETURN json_build_object(
    'success', true,
    'availability_id', v_availability_id,
    'message', 'Disponibilité enregistrée avec succès'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour définir des disponibilités en masse (plage de dates)
CREATE OR REPLACE FUNCTION set_availability_range(
  p_user_id uuid,
  p_start_date date,
  p_end_date date,
  p_status text,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS json AS $$
DECLARE
  v_current_date date;
  v_count integer := 0;
BEGIN
  -- Validation
  IF p_start_date > p_end_date THEN
    RETURN json_build_object(
      'success', false,
      'message', 'La date de début doit être avant la date de fin'
    );
  END IF;

  -- Boucle sur toutes les dates
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    INSERT INTO availability_calendar (
      user_id,
      date,
      status,
      start_time,
      end_time,
      notes
    ) VALUES (
      p_user_id,
      v_current_date,
      p_status,
      p_start_time,
      p_end_time,
      p_notes
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
      status = EXCLUDED.status,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      notes = EXCLUDED.notes,
      updated_at = now();
    
    v_count := v_count + 1;
    v_current_date := v_current_date + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'days_updated', v_count,
    'message', format('%s jours mis à jour', v_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour supprimer une disponibilité
CREATE OR REPLACE FUNCTION delete_availability(
  p_user_id uuid,
  p_date date
) RETURNS json AS $$
BEGIN
  DELETE FROM availability_calendar 
  WHERE user_id = p_user_id 
    AND date = p_date;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Disponibilité supprimée'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Aucune disponibilité trouvée pour cette date'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS (Row Level Security)
ALTER TABLE availability_calendar ENABLE ROW LEVEL SECURITY;

-- Policy : Un utilisateur peut voir ses propres disponibilités
CREATE POLICY "Users can view own availability"
  ON availability_calendar FOR SELECT
  USING (auth.uid() = user_id);

-- Policy : Un utilisateur peut voir les disponibilités de ses contacts (si accès autorisé)
CREATE POLICY "Users can view contacts availability"
  ON availability_calendar FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contacts
      WHERE contacts.user_id = auth.uid()
        AND contacts.invited_user_id = availability_calendar.user_id
        AND contacts.invitation_status = 'accepted'
        AND contacts.has_calendar_access = true
    )
  );

-- Policy : Un utilisateur peut créer/modifier ses propres disponibilités
CREATE POLICY "Users can manage own availability"
  ON availability_calendar FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Permissions
GRANT SELECT ON availability_calendar TO authenticated;
GRANT INSERT, UPDATE, DELETE ON availability_calendar TO authenticated;
GRANT SELECT ON contact_availability TO authenticated;
GRANT EXECUTE ON FUNCTION set_availability TO authenticated;
GRANT EXECUTE ON FUNCTION set_availability_range TO authenticated;
GRANT EXECUTE ON FUNCTION delete_availability TO authenticated;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_availability_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER availability_updated_at
  BEFORE UPDATE ON availability_calendar
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_timestamp();

-- Vérification
SELECT 'Système de disponibilités créé avec succès' as status;
