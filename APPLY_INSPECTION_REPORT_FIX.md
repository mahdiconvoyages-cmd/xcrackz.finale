# 🔧 Correction du Rapport d'Inspection Public

## Problèmes identifiés
- ❌ Contact départ (nom + téléphone) manquant
- ❌ Contact arrivée (nom + téléphone) manquant  
- ❌ Numéro du convoyeur manquant
- ❌ Colonnes manquantes dans la table `missions`

## Solution

### Étape 1: Ajouter les colonnes manquantes à la table missions

Copie et colle ce code dans le **SQL Editor** de Supabase:

```sql
-- ================================================
-- MIGRATION: Ajout des champs de contact dans missions
-- ================================================

DO $$ 
BEGIN
    -- Contact départ (nom)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'pickup_contact_name'
    ) THEN
        ALTER TABLE missions ADD COLUMN pickup_contact_name TEXT;
    END IF;

    -- Contact départ (téléphone)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'pickup_contact_phone'
    ) THEN
        ALTER TABLE missions ADD COLUMN pickup_contact_phone TEXT;
    END IF;

    -- Contact arrivée (nom)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'delivery_contact_name'
    ) THEN
        ALTER TABLE missions ADD COLUMN delivery_contact_name TEXT;
    END IF;

    -- Contact arrivée (téléphone)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'delivery_contact_phone'
    ) THEN
        ALTER TABLE missions ADD COLUMN delivery_contact_phone TEXT;
    END IF;

    -- Téléphone du convoyeur
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'driver_phone'
    ) THEN
        ALTER TABLE missions ADD COLUMN driver_phone TEXT;
    END IF;

    -- Nom du convoyeur
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'missions' AND column_name = 'driver_name'
    ) THEN
        ALTER TABLE missions ADD COLUMN driver_name TEXT;
    END IF;
END $$;

-- Synchroniser les données existantes
UPDATE missions m
SET 
    pickup_contact_name = c.name,
    pickup_contact_phone = c.phone
FROM contacts c
WHERE m.pickup_contact_id = c.id 
  AND m.pickup_contact_name IS NULL;

UPDATE missions m
SET 
    delivery_contact_name = c.name,
    delivery_contact_phone = c.phone
FROM contacts c
WHERE m.delivery_contact_id = c.id 
  AND m.delivery_contact_name IS NULL;

UPDATE missions m
SET 
    driver_name = c.name,
    driver_phone = c.phone
FROM contacts c
WHERE m.driver_id = c.id 
  AND m.driver_name IS NULL;
```

### Étape 2: Mettre à jour la fonction RPC

Copie et colle ce code dans le **SQL Editor** de Supabase:

```sql
-- ================================================
-- RPC: get_full_inspection_report(token)
-- CORRECTION: Ajout des contacts manquants
-- ================================================

DROP FUNCTION IF EXISTS get_full_inspection_report(TEXT);
CREATE OR REPLACE FUNCTION get_full_inspection_report(
  p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_share_record RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_share_record
  FROM public.inspection_report_shares
  WHERE share_token = p_token
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token invalide ou expiré');
  END IF;

  UPDATE public.inspection_report_shares
  SET access_count = access_count + 1,
      last_accessed_at = NOW()
  WHERE share_token = p_token;

  SELECT jsonb_build_object(
    'mission_data', jsonb_build_object(
      'id', m.id,
      'reference', m.reference,
      'status', m.status,
      'created_at', m.created_at,
      'pickup_date', m.pickup_date,
      'delivery_date', m.delivery_date,
      'pickup_address', m.pickup_address,
      'delivery_address', m.delivery_address,
      'pickup_contact_name', m.pickup_contact_name,
      'pickup_contact_phone', m.pickup_contact_phone,
      'delivery_contact_name', m.delivery_contact_name,
      'delivery_contact_phone', m.delivery_contact_phone,
      'vehicle_type', m.vehicle_type,
      'driver_name', COALESCE(
        (
          SELECT vi.driver_name
          FROM vehicle_inspections vi
          WHERE vi.mission_id = m.id AND vi.inspection_type = 'departure'
          ORDER BY vi.created_at DESC
          LIMIT 1
        ),
        (
          SELECT vi.driver_name
          FROM vehicle_inspections vi
          WHERE vi.mission_id = m.id AND vi.inspection_type = 'arrival'
          ORDER BY vi.created_at DESC
          LIMIT 1
        )
      ),
      'driver_phone', COALESCE(m.driver_phone, m.pickup_contact_phone)
    ),
    'vehicle_data', jsonb_build_object(
      'brand', m.vehicle_brand,
      'model', m.vehicle_model,
      'plate', m.vehicle_plate,
      'vin', m.vehicle_vin,
      'year', m.vehicle_year,
      'color', m.vehicle_color
    ),
    'inspection_departure', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'created_at', vi.created_at,
        'completed_at', vi.completed_at,
        'mileage_km', vi.mileage_km,
        'fuel_level', vi.fuel_level,
        'cleanliness_interior', vi.internal_cleanliness,
        'cleanliness_exterior', vi.external_cleanliness,
        'notes', vi.notes,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'driver_name', vi.driver_name,
        'client_name', vi.client_name,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'photos', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        ),
        'scanned_documents', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', d.id,
            'title', d.document_title,
            'file_url', d.document_url,
            'mime_type', CASE
              WHEN lower(d.document_url) LIKE '%.pdf' THEN 'application/pdf'
              WHEN lower(d.document_url) LIKE '%.png' THEN 'image/png'
              WHEN lower(d.document_url) LIKE '%.jpg' OR lower(d.document_url) LIKE '%.jpeg' THEN 'image/jpeg'
              WHEN lower(d.document_url) LIKE '%.webp' THEN 'image/webp'
              ELSE NULL
            END,
            'created_at', d.created_at
          ) ORDER BY d.created_at), '[]'::jsonb)
          FROM inspection_documents d
          WHERE d.inspection_id = vi.id
        ),
        'expenses', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', e.id,
            'description', e.description,
            'expense_type', e.expense_type,
            'amount', e.amount,
            'created_at', e.created_at
          ) ORDER BY e.created_at), '[]'::jsonb)
          FROM inspection_expenses e
          WHERE e.inspection_id = vi.id
        )
      )
      FROM vehicle_inspections vi
      WHERE vi.mission_id = m.id AND vi.inspection_type = 'departure'
      LIMIT 1
    ),
    'inspection_arrival', (
      SELECT jsonb_build_object(
        'id', vi.id,
        'created_at', vi.created_at,
        'completed_at', vi.completed_at,
        'mileage_km', vi.mileage_km,
        'fuel_level', vi.fuel_level,
        'cleanliness_interior', vi.internal_cleanliness,
        'cleanliness_exterior', vi.external_cleanliness,
        'notes', vi.notes,
        'driver_signature', vi.driver_signature,
        'client_signature', vi.client_signature,
        'driver_name', vi.driver_name,
        'client_name', vi.client_name,
        'latitude', vi.latitude,
        'longitude', vi.longitude,
        'photos', (
          SELECT jsonb_agg(jsonb_build_object(
            'id', ip.id,
            'photo_url', ip.full_url,
            'thumbnail_url', ip.thumbnail_url,
            'photo_type', ip.photo_type,
            'taken_at', ip.taken_at
          ) ORDER BY ip.taken_at)
          FROM inspection_photos_v2 ip
          WHERE ip.inspection_id = vi.id
        ),
        'scanned_documents', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', d.id,
            'title', d.document_title,
            'file_url', d.document_url,
            'mime_type', CASE
              WHEN lower(d.document_url) LIKE '%.pdf' THEN 'application/pdf'
              WHEN lower(d.document_url) LIKE '%.png' THEN 'image/png'
              WHEN lower(d.document_url) LIKE '%.jpg' OR lower(d.document_url) LIKE '%.jpeg' THEN 'image/jpeg'
              WHEN lower(d.document_url) LIKE '%.webp' THEN 'image/webp'
              ELSE NULL
            END,
            'created_at', d.created_at
          ) ORDER BY d.created_at), '[]'::jsonb)
          FROM inspection_documents d
          WHERE d.inspection_id = vi.id
        ),
        'expenses', (
          SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'id', e.id,
            'description', e.description,
            'expense_type', e.expense_type,
            'amount', e.amount,
            'created_at', e.created_at
          ) ORDER BY e.created_at), '[]'::jsonb)
          FROM inspection_expenses e
          WHERE e.inspection_id = vi.id
        )
      )
      FROM vehicle_inspections vi
      WHERE vi.mission_id = m.id AND vi.inspection_type = 'arrival'
      LIMIT 1
    ),
    'report_type', v_share_record.report_type
  ) INTO v_result
  FROM missions m
  WHERE m.id = v_share_record.mission_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_full_inspection_report(TEXT) TO anon, authenticated;
```

### Étape 2: Vérification (après application)

Teste un lien de rapport public pour vérifier que les contacts s'affichent correctement.

✅ Doit maintenant afficher:
- Contact départ (nom + téléphone)
- Contact arrivée (nom + téléphone) 
- Numéro du convoyeur

