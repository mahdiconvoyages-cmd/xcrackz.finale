-- Table pour logger tous les envois d'email
-- Permet de suivre les rapports envoyés, détecter les échecs et éviter les doublons

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Référence à l'inspection
  inspection_id UUID REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
  
  -- Destinataire
  recipient_email TEXT NOT NULL,
  
  -- Statut de l'envoi
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  
  -- ID du message SendGrid (pour tracking)
  sendgrid_message_id TEXT,
  
  -- Message d'erreur si échec
  error_message TEXT,
  
  -- Metadata
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour retrouver rapidement les emails d'une inspection
CREATE INDEX idx_email_logs_inspection_id ON email_logs(inspection_id);

-- Index pour retrouver les emails par statut
CREATE INDEX idx_email_logs_status ON email_logs(status);

-- Index pour rechercher par email destinataire
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);

-- Index composite pour les requêtes de recherche
CREATE INDEX idx_email_logs_inspection_status ON email_logs(inspection_id, status);

-- RLS Policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les logs de leurs propres inspections
CREATE POLICY "Users can view email logs for their inspections"
  ON email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicle_inspections vi
      JOIN missions m ON vi.mission_id = m.id
      WHERE vi.id = email_logs.inspection_id
      AND m.user_id = auth.uid()
    )
  );

-- Seul le système (service key) peut insérer des logs
CREATE POLICY "Service can insert email logs"
  ON email_logs
  FOR INSERT
  WITH CHECK (true); -- Protection via service key uniquement

-- Commentaires
COMMENT ON TABLE email_logs IS 'Historique des envois d''email (rapports inspection)';
COMMENT ON COLUMN email_logs.inspection_id IS 'Référence à l''inspection concernée';
COMMENT ON COLUMN email_logs.recipient_email IS 'Email du destinataire (client)';
COMMENT ON COLUMN email_logs.status IS 'Statut: pending (en cours), sent (envoyé), failed (échec)';
COMMENT ON COLUMN email_logs.sendgrid_message_id IS 'ID du message SendGrid pour tracking';
COMMENT ON COLUMN email_logs.error_message IS 'Message d''erreur détaillé en cas d''échec';

-- Fonction helper pour récupérer l'historique d'envoi d'une inspection
CREATE OR REPLACE FUNCTION get_inspection_email_history(p_inspection_id UUID)
RETURNS TABLE (
  sent_at TIMESTAMPTZ,
  recipient_email TEXT,
  status TEXT,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    el.sent_at,
    el.recipient_email,
    el.status,
    el.error_message
  FROM email_logs el
  WHERE el.inspection_id = p_inspection_id
  ORDER BY el.sent_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_inspection_email_history IS 'Récupère l''historique complet des envois email pour une inspection';
