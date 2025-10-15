# 🎯 ONESIGNAL - INTÉGRATION COMPLÈTE

## ✅ Configuration terminée

### 1. **Fichiers créés**

- ✅ `mobile/src/config/onesignal.ts` (180 lignes) - Configuration
- ✅ `mobile/src/services/OneSignalService.ts` (350 lignes) - Service
- ✅ `mobile/app.json` - Plugin OneSignal ajouté
- ✅ `mobile/App.tsx` - OneSignal initialisé
- ✅ `supabase/migrations/20250201_create_notification_tables.sql` - Tables BDD
- ✅ `supabase/functions/send-notification/index.ts` - Edge Function

### 2. **Tables Supabase**

```sql
user_devices        -- Player IDs OneSignal
notification_logs   -- Tracking notifications
```

### 3. **Vues SQL**

- `notification_stats_by_user` - Stats par utilisateur (7j)
- `notification_stats_by_type` - Stats par type (30j)
- `active_devices` - Devices actifs (7j)
- `notification_timeline_hourly` - Timeline par heure (24h)

### 4. **Fonction SQL**

- `get_notification_summary(days)` - Résumé complet

---

## 🚀 PROCHAINES ÉTAPES

### 1. Exécuter migration SQL

```sql
-- Dans Supabase SQL Editor
-- Exécuter: supabase/migrations/20250201_create_notification_tables.sql
```

### 2. Configurer OneSignal Dashboard

**Aller sur** : https://app.onesignal.com

1. **Sélectionner** votre app "XCrackz"
2. **Settings** → **Keys & IDs**
3. **Copier** la REST API Key
4. **Aller** dans Supabase Dashboard → Settings → Edge Functions → Secrets
5. **Ajouter** :
   ```
   ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
   ONESIGNAL_API_KEY=votre-rest-api-key
   ```

### 3. Déployer Edge Function

```powershell
# Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# Login
supabase login

# Déployer
cd supabase/functions
supabase functions deploy send-notification --project-ref erdxgujquowvkhmudaai
```

### 4. Rebuild l'app mobile

```powershell
cd mobile

# Clear cache
npx expo start -c

# Ou rebuild complet
eas build --platform android --profile preview
```

---

## 📱 UTILISATION

### Envoyer notification (depuis l'app)

```typescript
import { oneSignalService } from './src/services/OneSignalService';
import { NotificationType } from './src/config/onesignal';

// Nouvelle mission
await oneSignalService.sendNotificationToUser(
  'user-123',
  NotificationType.NEW_MISSION,
  'Nouvelle mission disponible à Paris 15',
  {
    mission_id: 'mission-456',
    screen: 'MissionDetails',
    params: { missionId: 'mission-456' },
  }
);
```

### Envoyer notification (depuis backend/Edge Function)

```typescript
import { supabase } from './lib/supabase';

const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    userId: 'user-123',
    type: 'NEW_MISSION',
    title: '🚀 Nouvelle mission',
    message: 'Livraison urgente à Paris 15',
    data: { mission_id: 'mission-456' },
    channel: 'missions',
  },
});
```

### Vérifier permissions

```typescript
// Vérifier si abonné
const isSubscribed = await oneSignalService.getPermissionStatus();

// Demander permission
if (!isSubscribed) {
  await oneSignalService.requestPermission();
}

// Statistiques
const stats = await oneSignalService.getStats();
console.log('Player ID:', stats.playerId);
console.log('User ID:', stats.userId);
```

---

## 🧪 TESTS

### 1. Test notification test

```powershell
# Via OneSignal Dashboard
# Dashboard → Messages → New Message → Send to Test Device
```

### 2. Test depuis backend

```powershell
# Via Supabase Edge Function
supabase functions invoke send-notification --project-ref erdxgujquowvkhmudaai --body '{"userId":"test-user","type":"SYSTEM_UPDATE","title":"Test","message":"Hello"}'
```

### 3. Vérifier Player ID

```typescript
// Dans l'app
const stats = await oneSignalService.getStats();
console.log('Player ID:', stats.playerId);
```

Utiliser ce Player ID dans OneSignal Dashboard pour les tests.

---

## 📊 TYPES DE NOTIFICATIONS

| Type | Channel | Utilisation |
|------|---------|-------------|
| `NEW_MISSION` | missions | Nouvelle mission disponible |
| `MISSION_ASSIGNED` | missions | Mission attribuée |
| `MISSION_UPDATED` | updates | Statut modifié |
| `MISSION_CANCELLED` | urgent | Mission annulée |
| `INSPECTION_REQUIRED` | missions | Inspection nécessaire |
| `NAVIGATION_ALERT` | navigation | Alerte GPS |
| `PAYMENT_RECEIVED` | updates | Paiement reçu |
| `MESSAGE_RECEIVED` | updates | Nouveau message |
| `SYSTEM_UPDATE` | updates | Mise à jour système |

---

## 🎯 SEGMENTATION

### Tags utilisateur

```typescript
{
  user_id: string,
  user_type: 'driver' | 'client' | 'admin',
  city: string,
  region: string,
  vehicle_type: string,
  is_verified: boolean,
  language: string,
  platform: 'ios' | 'android'
}
```

### Exemples de ciblage

```typescript
// Tous les drivers à Paris
await oneSignalService.sendNotificationBySegment(
  [
    { field: 'tag', relation: '=', key: 'user_type', value: 'driver' },
    { field: 'tag', relation: '=', key: 'city', value: 'Paris' }
  ],
  NotificationType.SYSTEM_UPDATE,
  'Mise à jour disponible'
);
```

---

## 📊 MONITORING

### SQL Queries

```sql
-- Résumé complet (7 derniers jours)
SELECT * FROM get_notification_summary(7);

-- Stats par utilisateur
SELECT * FROM notification_stats_by_user
ORDER BY total_sent DESC
LIMIT 20;

-- Stats par type
SELECT * FROM notification_stats_by_type
ORDER BY total DESC;

-- Devices actifs
SELECT * FROM active_devices;

-- Timeline 24h
SELECT * FROM notification_timeline_hourly;
```

### OneSignal Dashboard

- **Messages envoyés** : Dashboard → Delivery
- **Taux d'ouverture** : Clicked / Delivered
- **Audience** : Dashboard → Audience → Segments

---

## ✅ CHECKLIST FINALE

- [x] Configuration créée (`onesignal.ts`)
- [x] Service créé (`OneSignalService.ts`)
- [x] Plugin ajouté dans `app.json`
- [x] OneSignal initialisé dans `App.tsx`
- [x] Migration SQL créée
- [x] Edge Function créée
- [x] Documentation complète
- [ ] Migration SQL exécutée ⚠️ **À FAIRE**
- [ ] REST API Key configurée dans Supabase ⚠️ **À FAIRE**
- [ ] Edge Function déployée ⚠️ **À FAIRE**
- [ ] App rebuild/restart ⚠️ **À FAIRE**
- [ ] Tests effectués

---

## 🔧 TROUBLESHOOTING

### Erreur "Cannot find module 'react-native-onesignal'"

✅ **Solution** : Restart Expo
```powershell
npx expo start -c
```

### Notification non reçue

1. Vérifier permissions sur l'appareil
2. Vérifier Player ID dans `user_devices`
3. Vérifier logs OneSignal Dashboard
4. Vérifier `notification_logs` table

### Edge Function erreur "Missing credentials"

✅ Vérifier secrets dans Supabase Dashboard → Settings → Edge Functions → Secrets

---

## 📚 RESSOURCES

- **OneSignal Docs** : https://documentation.onesignal.com
- **Expo OneSignal** : https://github.com/OneSignal/onesignal-expo-plugin
- **API Reference** : https://documentation.onesignal.com/reference

---

**Configuration OneSignal terminée !** 🎉

Les fichiers sont prêts. Il reste 3 étapes manuelles :
1. Exécuter la migration SQL
2. Configurer REST API Key dans Supabase
3. Déployer l'Edge Function
