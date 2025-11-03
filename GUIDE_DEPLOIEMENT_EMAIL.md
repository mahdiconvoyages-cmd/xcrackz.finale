# 🚀 Guide de déploiement - Envoi Email Automatique

## 📋 Prérequis

Avant de déployer la fonctionnalité d'envoi automatique d'email, assurez-vous d'avoir :

✅ Un compte SendGrid (gratuit)
✅ Accès à votre projet Supabase
✅ Accès à votre projet Vercel (ou autre plateforme serverless)
✅ Les fichiers SQL de migration prêts

---

## 🔧 Étape 1 : Configuration SendGrid

### 1.1 Créer un compte SendGrid

1. Aller sur https://sendgrid.com/
2. Créer un compte gratuit (100 emails/jour gratuit)
3. Vérifier votre email

### 1.2 Créer une API Key

1. Aller dans **Settings → API Keys**
2. Cliquer sur **Create API Key**
3. Nom : `xcrackz-inspection-reports`
4. Permissions : Sélectionner **Full Access** (ou seulement **Mail Send**)
5. **IMPORTANT** : Copier la clé API immédiatement (ne sera plus visible après)

```
Exemple: SG.aBcDeFgHiJkLmNoPqRsTuVwXyZ.1234567890abcdefghijklmnopqrstuvwxyz
```

### 1.3 Vérifier un expéditeur (Sender)

1. Aller dans **Settings → Sender Authentication → Single Sender Verification**
2. Ajouter un expéditeur :
   - From Email: `no-reply@votre-domaine.com` (ou votre email perso)
   - From Name: `xCrackz`
   - Reply To: `contact@votre-domaine.com`
3. Cliquer sur **Create**
4. **Vérifier l'email** reçu dans votre boîte mail

⚠️ **IMPORTANT** : Vous ne pourrez PAS envoyer d'emails sans avoir vérifié au moins un expéditeur !

---

## 📦 Étape 2 : Installer les dépendances

### 2.1 Dans le dossier racine (web)

Les dépendances sont déjà installées :
- ✅ `jszip` (pour créer le ZIP des photos)
- ✅ `@supabase/supabase-js` (pour accéder à la DB et Storage)

### 2.2 Ajouter SendGrid

```powershell
npm install @sendgrid/mail
npm install --save-dev @types/sendgrid__mail
```

### 2.3 Ajouter les types Vercel (si déploiement Vercel)

```powershell
npm install --save-dev @vercel/node
```

---

## 🗄️ Étape 3 : Exécuter les migrations SQL

### 3.1 Se connecter à Supabase

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans **SQL Editor**

### 3.2 Exécuter les migrations

Exécutez les fichiers SQL dans cet ordre :

#### 1. Table email_logs
```sql
-- Copier/coller le contenu de CREATE_EMAIL_LOGS_TABLE.sql
```

#### 2. Colonnes client_email et status
```sql
-- Copier/coller le contenu de ADD_CLIENT_EMAIL_INSPECTION.sql
```

#### 3. Vérifier les tables

```sql
-- Vérifier que la table email_logs existe
SELECT * FROM email_logs LIMIT 1;

-- Vérifier que les colonnes ont été ajoutées
SELECT client_email, status FROM vehicle_inspections LIMIT 1;
```

---

## 🔐 Étape 4 : Configurer les variables d'environnement

### 4.1 Dans Vercel

1. Aller dans votre projet Vercel
2. **Settings → Environment Variables**
3. Ajouter les variables suivantes :

| Variable | Valeur | Environnement |
|----------|--------|---------------|
| `SENDGRID_API_KEY` | Votre clé API SendGrid (commence par `SG.`) | Production, Preview, Development |
| `SENDGRID_FROM_EMAIL` | Email vérifié (ex: `no-reply@votre-domaine.com`) | Production, Preview, Development |
| `SENDGRID_FROM_NAME` | `xCrackz` | Production, Preview, Development |
| `SUPABASE_URL` | URL de votre projet Supabase | Production, Preview, Development |
| `SUPABASE_SERVICE_KEY` | Service key Supabase (⚠️ sensible !) | Production, Preview, Development |
| `INTERNAL_EMAIL` | Votre email (pour recevoir une copie) | Production, Preview, Development |
| `WEB_APP_URL` | URL de votre app (ex: `https://votre-app.vercel.app`) | Production, Preview, Development |

#### Comment obtenir la Service Key Supabase :

1. Aller dans **Project Settings → API**
2. Copier la **service_role key** (⚠️ **NE JAMAIS exposer côté client !**)

### 4.2 Pour le développement local

Créer un fichier `.env.local` à la racine du projet :

```env
# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=no-reply@votre-domaine.com
SENDGRID_FROM_NAME=xCrackz
INTERNAL_EMAIL=votre-email@entreprise.com

# Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey...

# App URL
WEB_APP_URL=http://localhost:5173
```

⚠️ **IMPORTANT** : Ajouter `.env.local` dans `.gitignore` !

```gitignore
# Local env files
.env.local
.env.*.local
```

---

## 🚀 Étape 5 : Déployer la fonction API

### 5.1 Vérifier l'architecture du projet

Votre structure devrait ressembler à :

```
c:\Users\mahdi\Documents\Finality-okok\
├── api/
│   └── sendInspectionReport.ts  ✅ (créé)
├── src/
│   └── ... (votre code web)
├── mobile/
│   └── ... (votre code React Native)
├── package.json
└── vercel.json (à créer si n'existe pas)
```

### 5.2 Créer `vercel.json` (si nécessaire)

Si le fichier `vercel.json` n'existe pas, créez-le :

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ]
}
```

### 5.3 Déployer sur Vercel

```powershell
# Si Vercel CLI n'est pas installé
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel --prod
```

### 5.4 Vérifier le déploiement

1. Aller sur https://vercel.com/dashboard
2. Sélectionner votre projet
3. Aller dans **Deployments** → dernier déploiement
4. Vérifier que l'API est accessible : `https://votre-app.vercel.app/api/sendInspectionReport`

---

## 🧪 Étape 6 : Tester l'envoi d'email

### 6.1 Test avec curl/Postman

```powershell
curl -X POST https://votre-app.vercel.app/api/sendInspectionReport `
  -H "Content-Type: application/json" `
  -d '{
    "inspectionId": "uuid-d-une-vraie-inspection",
    "clientEmail": "votre-email@test.com"
  }'
```

### 6.2 Vérifier les logs

Dans Vercel :
1. **Deployments → Functions → sendInspectionReport → Logs**
2. Vérifier les logs en temps réel

### 6.3 Vérifier la réception

1. Vérifier votre boîte mail (client)
2. Vérifier `INTERNAL_EMAIL` (copie interne)
3. Vérifier que vous avez reçu :
   - ✅ PDF du rapport
   - ✅ ZIP des photos (si photos présentes)

### 6.4 Vérifier les logs en base

```sql
-- Dans Supabase SQL Editor
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 10;
```

Vous devriez voir :
- `status = 'sent'` si envoi réussi
- `status = 'failed'` si échec
- `sendgrid_message_id` si envoi réussi

---

## 📱 Étape 7 : Intégrer dans l'app mobile

### 7.1 Créer un écran de sélection d'email

Dans `mobile/src/screens/inspections/InspectionReportAdvanced.tsx`, ajouter :

```typescript
import { useState } from 'react';
import { TextInput, Alert } from 'react-native';

// ... dans votre composant

const [clientEmail, setClientEmail] = useState('');
const [sending, setSending] = useState(false);

const handleSendReport = async () => {
  if (!clientEmail || !clientEmail.includes('@')) {
    Alert.alert('Erreur', 'Veuillez entrer un email valide');
    return;
  }

  setSending(true);

  try {
    const response = await fetch('https://votre-app.vercel.app/api/sendInspectionReport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inspectionId: inspection.id,
        clientEmail,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      Alert.alert('Succès', 'Le rapport a été envoyé avec succès !');
      setClientEmail(''); // Reset
    } else {
      Alert.alert('Erreur', result.error || 'Échec de l\'envoi');
    }
  } catch (error) {
    Alert.alert('Erreur', 'Impossible d\'envoyer le rapport');
    console.error(error);
  } finally {
    setSending(false);
  }
};
```

### 7.2 Ajouter l'UI

```tsx
<View style={styles.sendSection}>
  <Text style={styles.label}>Email du client :</Text>
  <TextInput
    style={styles.input}
    placeholder="client@example.com"
    value={clientEmail}
    onChangeText={setClientEmail}
    keyboardType="email-address"
    autoCapitalize="none"
    editable={!sending}
  />
  
  <TouchableOpacity 
    style={[styles.sendButton, sending && styles.sendButtonDisabled]}
    onPress={handleSendReport}
    disabled={sending}
  >
    <Text style={styles.sendButtonText}>
      {sending ? 'Envoi en cours...' : 'Envoyer le rapport par email'}
    </Text>
  </TouchableOpacity>
</View>
```

---

## ✅ Checklist finale

Avant de considérer la fonctionnalité terminée :

- [ ] Compte SendGrid créé et vérifié
- [ ] API Key SendGrid générée
- [ ] Expéditeur vérifié dans SendGrid
- [ ] Dépendances installées (`@sendgrid/mail`)
- [ ] Migrations SQL exécutées (email_logs + client_email)
- [ ] Variables d'environnement configurées dans Vercel
- [ ] Fonction API déployée sur Vercel
- [ ] Test d'envoi réussi avec curl/Postman
- [ ] Email reçu avec PDF et ZIP
- [ ] Logs visibles dans `email_logs`
- [ ] UI mobile intégrée pour saisir l'email client
- [ ] Test complet depuis l'app mobile

---

## 🐛 Dépannage

### Erreur : "API Key invalide"
- Vérifier que `SENDGRID_API_KEY` est correctement configuré
- Vérifier qu'il commence par `SG.`
- Régénérer une nouvelle clé si nécessaire

### Erreur : "Sender non vérifié"
- Vérifier que `SENDGRID_FROM_EMAIL` est bien vérifié dans SendGrid
- Aller dans **Settings → Sender Authentication** et vérifier

### Email non reçu
- Vérifier les spams/indésirables
- Vérifier les logs Vercel pour voir les erreurs
- Vérifier `email_logs` pour le statut

### PDF/ZIP vide
- Vérifier que l'inspection a bien des photos
- Vérifier les permissions Supabase Storage
- Vérifier les logs de téléchargement des photos

---

## 📊 Monitoring et amélioration

### Ajouter un dashboard de suivi

Créer une page admin pour voir :
- Nombre d'emails envoyés aujourd'hui
- Taux de succès/échec
- Derniers envois
- Quota SendGrid restant

### Optimisations futures

1. **Cache des PDFs** : stocker le PDF généré pour ne pas le regénérer
2. **Queue system** : utiliser une queue (BullMQ, Inngest) pour envois asynchrones
3. **Retry logic** : réessayer automatiquement en cas d'échec
4. **Compression images** : réduire la taille du ZIP
5. **Templates personnalisés** : templates HTML plus élaborés

---

**🎉 Félicitations !** Votre système d'envoi automatique d'email est maintenant opérationnel !
