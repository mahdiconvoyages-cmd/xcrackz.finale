# 🔑 CONFIGURATION ONESIGNAL API KEY

## ✅ Informations récupérées

### OneSignal Credentials
```bash
ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
ONESIGNAL_API_KEY=vl2zv7tgluxpmgue4ulytsie5
```

---

## 🚀 ÉTAPES DE CONFIGURATION

### 1️⃣ **Configurer dans Supabase Edge Functions**

#### Via Dashboard Supabase (recommandé)

1. **Ouvrir** : https://supabase.com/dashboard/project/erdxgujquowvkhmudaai/settings/functions
2. **Aller dans** : Settings → Edge Functions → Secrets
3. **Cliquer** : "Add secret"
4. **Ajouter** :
   - **Name** : `ONESIGNAL_APP_ID`
   - **Value** : `b284fe02-642c-40e5-a05f-c50e07edc86d`
   - Cliquer "Save"
5. **Ajouter** (nouveau secret) :
   - **Name** : `ONESIGNAL_API_KEY`
   - **Value** : `vl2zv7tgluxpmgue4ulytsie5`
   - Cliquer "Save"

#### Via Supabase CLI (alternatif)

```powershell
# Définir les secrets
supabase secrets set ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d --project-ref erdxgujquowvkhmudaai
supabase secrets set ONESIGNAL_API_KEY=vl2zv7tgluxpmgue4ulytsie5 --project-ref erdxgujquowvkhmudaai
```

---

### 2️⃣ **Déployer l'Edge Function**

```powershell
# Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# Login
supabase login

# Déployer
cd supabase/functions
supabase functions deploy send-notification --project-ref erdxgujquowvkhmudaai
```

---

### 3️⃣ **Tester la configuration**

#### Test via Supabase CLI

```powershell
supabase functions invoke send-notification --project-ref erdxgujquowvkhmudaai --body '{
  "userId": "test-user",
  "type": "SYSTEM_UPDATE",
  "title": "🔔 Test OneSignal",
  "message": "Configuration réussie !",
  "channel": "updates"
}'
```

#### Test via App Mobile

```typescript
import { supabase } from './lib/supabase';

// Envoyer notification test
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    userId: user.id, // Votre user ID
    type: 'SYSTEM_UPDATE',
    title: '🔔 Test OneSignal',
    message: 'Configuration réussie !',
    channel: 'updates',
  },
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
}
```

---

## 🧪 VÉRIFICATION

### Vérifier les secrets Supabase

```powershell
supabase secrets list --project-ref erdxgujquowvkhmudaai
```

Vous devriez voir :
```
ONESIGNAL_APP_ID
ONESIGNAL_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### Vérifier l'Edge Function déployée

1. **Dashboard** : https://supabase.com/dashboard/project/erdxgujquowvkhmudaai/functions
2. Vous devriez voir : `send-notification` avec statut "Active"

---

## 📊 DASHBOARD ONESIGNAL

### Vérifier l'envoi des notifications

1. **Ouvrir** : https://app.onesignal.com
2. **Sélectionner** : App "XCrackz"
3. **Dashboard** → **Delivery** : Voir les notifications envoyées
4. **Dashboard** → **Audience** : Voir les devices abonnés

---

## ✅ CHECKLIST COMPLÈTE

- [ ] Migration SQL exécutée (`20250201_create_notification_tables.sql`)
- [ ] Secrets configurés dans Supabase (ONESIGNAL_APP_ID, ONESIGNAL_API_KEY)
- [ ] Edge Function déployée (`send-notification`)
- [ ] App mobile rebuild avec OneSignal plugin
- [ ] Test notification envoyée et reçue

---

## 🚨 SÉCURITÉ

⚠️ **IMPORTANT** : Ne JAMAIS commit ces clés dans Git !

Vérifier que `.env` est dans `.gitignore` :

```bash
# .gitignore
.env
.env.local
*.key
```

Les clés sont déjà configurées dans :
- ✅ `mobile/.env` (pour l'app)
- ✅ Supabase Secrets (pour Edge Functions)

---

## 📚 PROCHAINES ÉTAPES

1. **Exécuter migration SQL** dans Supabase
2. **Configurer secrets** (via Dashboard ou CLI)
3. **Déployer Edge Function**
4. **Restart app mobile** : `npx expo start -c`
5. **Tester** notification

---

**Configuration OneSignal API prête !** 🎉
