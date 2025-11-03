# Configuration Envoi Automatique Email - Rapport Inspection

## 📧 Ce qu'il faut pour l'envoi automatique d'email

### 1. **Service d'envoi email (recommandé : SendGrid)**

#### Pourquoi SendGrid ?
- ✅ **Gratuit jusqu'à 100 emails/jour** (idéal pour démarrer)
- ✅ **API simple et fiable**
- ✅ **Support des pièces jointes jusqu'à 30MB**
- ✅ **Templates HTML professionnels**
- ✅ **Tracking des emails (ouverture, clics)**
- ✅ **Excellent deliverability (évite spam)**

#### Alternatives
- **Postmark** : excellent deliverability, 100 emails/mois gratuit
- **Mailgun** : 5000 emails/mois gratuit (3 premiers mois)
- **Amazon SES** : très bon marché ($0.10 / 1000 emails)
- **SMTP Gmail** : gratuit mais limité (500/jour) et moins fiable

### 2. **Compte SendGrid - Configuration**

#### Étapes d'inscription :
1. Aller sur https://sendgrid.com/
2. Créer un compte gratuit
3. Vérifier votre email
4. Créer une **API Key** :
   - Settings → API Keys → Create API Key
   - Nom : `xcrackz-inspection-reports`
   - Permissions : **Full Access** (ou seulement Mail Send)
   - **Copier la clé** (elle ne sera plus visible !)

#### Vérification du domaine (optionnel mais recommandé) :
- Settings → Sender Authentication → Domain Authentication
- Suivre les étapes pour ajouter des records DNS
- **Avantages** : meilleur taux de délivrabilité, évite spam

#### Sender Identity (obligatoire) :
- Settings → Sender Authentication → Single Sender Verification
- Ajouter votre email d'envoi (ex: `no-reply@votre-domaine.com`)
- Vérifier l'email reçu

### 3. **Variables d'environnement requises**

Ajouter dans votre projet (Vercel / Supabase Edge Functions) :

```env
# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=no-reply@votre-domaine.com
SENDGRID_FROM_NAME=xCrackz - Inspections

# Supabase (pour accès storage et DB)
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...votre-service-key

# URL de votre app web (pour générer les PDFs)
WEB_APP_URL=https://votre-app.vercel.app

# Email de copie interne (vous recevez aussi le rapport)
INTERNAL_EMAIL=votre-email@entreprise.com
```

### 4. **Structure du système d'envoi automatique**

```
┌─────────────────────────────────────────────────────────┐
│  Mobile/Web App                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Validation Inspection (départ ou arrivée)       │  │
│  │  - Utilisateur clique "Valider inspection"      │  │
│  │  - Sélection email client (input ou contact)    │  │
│  └──────────────────┬───────────────────────────────┘  │
└─────────────────────┼───────────────────────────────────┘
                      │
                      │ HTTP POST /api/sendInspectionReport
                      │ { inspectionId, clientEmail }
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Serverless Function (Vercel ou Supabase Edge)         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  1. Récupérer inspection depuis DB               │  │
│  │  2. Générer PDF (ou utiliser PDF existant)       │  │
│  │  3. Récupérer photos depuis Storage              │  │
│  │  4. Créer ZIP avec toutes les photos             │  │
│  │  5. Envoyer email via SendGrid                   │  │
│  │     - Destinataire : client_email                │  │
│  │     - CC : INTERNAL_EMAIL                        │  │
│  │     - Attachments : rapport.pdf + photos.zip     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                      │
                      │ Email envoyé
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Client & Entreprise                                    │
│  - Reçoivent email avec PDF et ZIP photos              │
│  - Message personnalisé avec détails inspection         │
└─────────────────────────────────────────────────────────┘
```

### 5. **Template Email (exemple)**

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); 
              color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
    .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 État des lieux - {{mission_reference}}</h1>
      <p>Inspection {{inspection_type}}</p>
    </div>
    
    <div class="content">
      <p>Bonjour,</p>
      
      <p>Vous trouverez ci-joint l'état des lieux complet du véhicule :</p>
      
      <div class="info-box">
        <strong>📋 Mission :</strong> {{mission_reference}}<br>
        <strong>🚗 Véhicule :</strong> {{vehicle_brand}} {{vehicle_model}}<br>
        <strong>🔖 Immatriculation :</strong> {{vehicle_plate}}<br>
        <strong>📍 Type :</strong> Inspection de {{inspection_type}}<br>
        <strong>📅 Date :</strong> {{inspection_date}}
      </div>
      
      <div class="info-box">
        <strong>📸 Détails inspection :</strong><br>
        - Kilométrage : {{km}} km<br>
        - Niveau carburant : {{fuel_level}}<br>
        - Nombre de photos : {{photo_count}}
      </div>
      
      <p><strong>📎 Pièces jointes :</strong></p>
      <ul>
        <li>✅ Rapport PDF complet avec photos intégrées</li>
        <li>✅ Archive ZIP avec toutes les photos haute résolution</li>
      </ul>
      
      <p>Ces documents constituent le dossier officiel de l'état des lieux.</p>
      
      <p>Cordialement,<br>L'équipe xCrackz</p>
    </div>
    
    <div class="footer">
      <p>© 2025 xCrackz - Gestion de missions automobiles</p>
      <p>Cet email a été envoyé automatiquement suite à la validation de l'inspection.</p>
    </div>
  </div>
</body>
</html>
```

### 6. **Limites et considérations**

#### Taille des attachments :
- **SendGrid** : max 30MB total (PDF + ZIP)
- **Solution si > 30MB** : 
  - Upload ZIP vers Supabase Storage
  - Générer signed URL (expire 7 jours)
  - Envoyer email avec lien de téléchargement au lieu d'attachment

#### Quotas SendGrid gratuit :
- **100 emails/jour**
- **40 000 emails premier mois gratuit**
- Upgrade à $19.95/mois pour 100 000 emails

#### Performance :
- Génération PDF : ~3-5 secondes
- Création ZIP (10 photos) : ~2-3 secondes
- Envoi email : ~1-2 secondes
- **Total : ~6-10 secondes** par rapport

### 7. **Sécurité et bonnes pratiques**

✅ **DO**
- Stocker API keys dans variables d'environnement (jamais dans le code)
- Valider l'email du client côté serveur (regex)
- Limiter le nombre d'envois par utilisateur (rate limiting)
- Logger tous les envois (table `email_logs` avec statut success/failed)
- Utiliser HTTPS uniquement
- Vérifier que l'utilisateur a le droit d'accéder à l'inspection

❌ **DON'T**
- Ne pas exposer la Service Key Supabase côté client
- Ne pas envoyer à des emails non vérifiés (risque spam)
- Ne pas stocker les attachments en base de données
- Ne pas oublier de gérer les erreurs (retry logic)

### 8. **Code exemple : Fonction serverless (Vercel)**

Voir le fichier `sendInspectionReport.ts` créé séparément.

### 9. **Déclenchement automatique**

#### Option A : Appel manuel depuis l'app (recommandé)
```typescript
// Mobile/Web après validation inspection
const response = await fetch('/api/sendInspectionReport', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    inspectionId: inspection.id,
    clientEmail: selectedClientEmail,
  })
});
```

#### Option B : Trigger DB (automatique)
```sql
-- Créer une fonction qui appelle l'API via pg_net ou http
CREATE OR REPLACE FUNCTION trigger_send_inspection_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Appeler webhook/serverless function
  -- Nécessite extension pg_net ou http
  PERFORM net.http_post(
    url := 'https://your-app.vercel.app/api/sendInspectionReport',
    body := json_build_object('inspectionId', NEW.id)::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_send_inspection_email
AFTER UPDATE ON vehicle_inspections
FOR EACH ROW
WHEN (NEW.status = 'validated' AND OLD.status != 'validated')
EXECUTE FUNCTION trigger_send_inspection_email();
```

### 10. **Tests recommandés**

1. **Test envoi simple** : 1 inspection avec 1 photo
2. **Test envoi avec beaucoup de photos** : 20+ photos (vérifier taille ZIP)
3. **Test email invalide** : vérifier gestion erreur
4. **Test sans photos** : envoyer uniquement PDF
5. **Test doublon** : vérifier qu'on n'envoie pas 2x le même rapport

### 11. **Monitoring et logs**

Créer une table pour suivre les envois :

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID REFERENCES vehicle_inspections(id),
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent', 'failed', 'pending'
  sendgrid_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 12. **Prochaines étapes**

1. ✅ Créer compte SendGrid et obtenir API key
2. ✅ Ajouter variables d'environnement
3. ✅ Appliquer migration SQL (client_email)
4. ✅ Déployer fonction serverless
5. ✅ Ajouter UI de sélection email dans app mobile
6. ✅ Tester avec vraie inspection
7. ✅ Monitorer les premiers envois

---

**Besoin d'aide ?**
- Documentation SendGrid : https://docs.sendgrid.com/
- Support : https://support.sendgrid.com/
