# 🔔 ONESIGNAL - CONFIGURATION NOTIFICATIONS PUSH

## ✅ Ce qui a été configuré

### 1. **Configuration** (`mobile/src/config/onesignal.ts`)
- ✅ APP_ID configuré : `b284fe02-642c-40e5-a05f-c50e07edc86d`
- ✅ Canaux Android (missions, urgent, updates, navigation)
- ✅ Templates de notifications (9 types)
- ✅ Tags utilisateur pour segmentation

### 2. **Service** (`mobile/src/services/OneSignalService.ts`)
- ✅ Initialisation OneSignal
- ✅ Gestion permissions iOS/Android
- ✅ Event handlers (reçue, cliquée)
- ✅ Association utilisateur
- ✅ Envoi notifications (individuel, groupe, segment)
- ✅ Logging en base de données

### 3. **App.json** 
- ✅ Plugin OneSignal Expo ajouté
- ✅ Mode development configuré

---

## 🚀 UTILISATION

### Initialiser OneSignal (App.tsx)

```typescript
import { oneSignalService } from './src/services/OneSignalService';
import { NotificationType } from './src/config/onesignal';

// Dans App.tsx, useEffect
useEffect(() => {
  // Initialiser OneSignal
  oneSignalService.initialize();
}, []);

// Lors de la connexion utilisateur
const handleLogin = async (userId: string) => {
  await oneSignalService.setUser(userId, {
    user_type: 'driver', // ou 'client', 'admin'
    city: 'Paris',
    region: 'Ile-de-France',
    vehicle_type: 'van',
    is_verified: true,
    language: 'fr',
  });
};

// Lors de la déconnexion
const handleLogout = async () => {
  await oneSignalService.clearUser();
};
```

### Envoyer notification

```typescript
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

// Plusieurs utilisateurs
await oneSignalService.sendNotificationToUsers(
  ['user-1', 'user-2', 'user-3'],
  NotificationType.NAVIGATION_ALERT,
  'Attention: Embouteillage sur votre itinéraire'
);

// Par segment (tous les drivers à Paris)
await oneSignalService.sendNotificationBySegment(
  [
    { field: 'tag', relation: '=', key: 'user_type', value: 'driver' },
    { field: 'tag', relation: '=', key: 'city', value: 'Paris' }
  ],
  NotificationType.SYSTEM_UPDATE,
  'Mise à jour importante disponible'
);
```

### Vérifier permissions

```typescript
// Obtenir statut
const isSubscribed = await oneSignalService.getPermissionStatus();

// Demander permission
if (!isSubscribed) {
  const granted = await oneSignalService.requestPermission();
  if (granted) {
    console.log('✅ Notifications activées');
  }
}

// Statistiques
const stats = await oneSignalService.getStats();
console.log('Player ID:', stats.playerId);
console.log('User ID:', stats.userId);
console.log('Subscribed:', stats.isSubscribed);
```

---

## 📊 BASE DE DONNÉES

### Tables à créer dans Supabase

```sql
-- Table: user_devices (Player IDs)
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL UNIQUE,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  app_version TEXT,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_user_devices_player ON user_devices(player_id);

-- Table: notification_logs (Tracking)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  player_id TEXT,
  action TEXT CHECK (action IN ('sent', 'received', 'clicked')),
  type TEXT,
  data JSONB,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_user ON notification_logs(user_id, created_at DESC);
CREATE INDEX idx_notification_logs_notif ON notification_logs(notification_id);

-- RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their devices"
  ON user_devices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 🔧 BACKEND - EDGE FUNCTION

### Créer `supabase/functions/send-notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');

serve(async (req) => {
  try {
    const notification = await req.json();

    // Envoyer via API OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        ...notification,
      }),
    });

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Variables d'environnement Supabase

```bash
# Dans Supabase Dashboard → Settings → Edge Functions

ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
ONESIGNAL_API_KEY=your-onesignal-rest-api-key
```

---

## 📱 TYPES DE NOTIFICATIONS

| Type | Channel | Priorité | Utilisation |
|------|---------|----------|-------------|
| `NEW_MISSION` | missions | HIGH | Nouvelle mission disponible |
| `MISSION_ASSIGNED` | missions | HIGH | Mission attribuée |
| `MISSION_UPDATED` | updates | DEFAULT | Statut modifié |
| `MISSION_CANCELLED` | urgent | HIGH | Mission annulée |
| `INSPECTION_REQUIRED` | missions | HIGH | Inspection nécessaire |
| `NAVIGATION_ALERT` | navigation | HIGH | Alerte navigation GPS |
| `PAYMENT_RECEIVED` | updates | DEFAULT | Paiement reçu |
| `MESSAGE_RECEIVED` | updates | DEFAULT | Nouveau message |
| `SYSTEM_UPDATE` | updates | DEFAULT | Mise à jour système |

---

## 🎯 SEGMENTATION UTILISATEURS

### Tags disponibles

```typescript
{
  user_id: string;           // ID utilisateur
  user_type: 'driver' | 'client' | 'admin';
  city: string;              // Paris, Lyon, etc.
  region: string;            // Ile-de-France, etc.
  vehicle_type: string;      // van, truck, car
  is_verified: boolean;      // Compte vérifié
  language: string;          // fr, en
  app_version: string;       // 1.0.0
  platform: string;          // ios, android
}
```

### Exemples de ciblage

```typescript
// Tous les drivers vérifiés à Paris
[
  { field: 'tag', relation: '=', key: 'user_type', value: 'driver' },
  { field: 'tag', relation: '=', key: 'city', value: 'Paris' },
  { field: 'tag', relation: '=', key: 'is_verified', value: 'true' }
]

// Tous les utilisateurs iOS
[
  { field: 'tag', relation: '=', key: 'platform', value: 'ios' }
]

// Drivers avec vans en Ile-de-France
[
  { field: 'tag', relation: '=', key: 'user_type', value: 'driver' },
  { field: 'tag', relation: '=', key: 'vehicle_type', value: 'van' },
  { field: 'tag', relation: '=', key: 'region', value: 'Ile-de-France' }
]
```

---

## 🧪 TESTS

### 1. Test d'initialisation

```typescript
// Dans l'app
const testInit = async () => {
  await oneSignalService.initialize();
  const stats = await oneSignalService.getStats();
  console.log('OneSignal Stats:', stats);
};
```

### 2. Test notification test

```bash
# Via OneSignal Dashboard
# Dashboard → Messages → New Message → Send to Test Device
# Utiliser le Player ID obtenu dans stats
```

### 3. Test depuis backend

```typescript
// Via Supabase Edge Function
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    contents: { en: 'Test notification' },
    headings: { en: 'Test' },
    include_player_ids: ['player-id-here'],
  },
});
```

---

## 📊 MONITORING

### Dashboard OneSignal
- **Messages envoyés** : OneSignal Dashboard → Delivery
- **Taux d'ouverture** : Clicked / Delivered
- **Désabonnements** : Dashboard → Audience

### Base de données

```sql
-- Notifications par utilisateur (7 derniers jours)
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE action = 'sent') as sent,
  COUNT(*) FILTER (WHERE action = 'received') as received,
  COUNT(*) FILTER (WHERE action = 'clicked') as clicked,
  ROUND(COUNT(*) FILTER (WHERE action = 'clicked')::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE action = 'received'), 0) * 100, 1) as open_rate
FROM notification_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY sent DESC
LIMIT 20;

-- Notifications par type
SELECT 
  data->>'type' as type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE action = 'clicked') as clicked,
  ROUND(AVG(
    CASE WHEN action = 'clicked' THEN 1 ELSE 0 END
  ) * 100, 1) as click_rate
FROM notification_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY data->>'type'
ORDER BY total DESC;

-- Devices actifs
SELECT 
  platform,
  COUNT(DISTINCT user_id) as users,
  COUNT(*) as devices,
  MAX(last_active) as last_active
FROM user_devices
WHERE last_active >= NOW() - INTERVAL '7 days'
GROUP BY platform;
```

---

## ✅ CHECKLIST INSTALLATION

- [x] Package OneSignal installé
- [x] Configuration créée (`onesignal.ts`)
- [x] Service créé (`OneSignalService.ts`)
- [x] Plugin ajouté dans `app.json`
- [ ] Tables BDD créées (user_devices, notification_logs)
- [ ] Edge Function créée (send-notification)
- [ ] Variables d'environnement Supabase configurées
- [ ] OneSignal initialisé dans App.tsx
- [ ] Tests effectués

---

## 🚀 PROCHAINES ÉTAPES

1. **Créer tables SQL** dans Supabase
2. **Créer Edge Function** `send-notification`
3. **Configurer variables** Supabase (ONESIGNAL_API_KEY)
4. **Intégrer dans App.tsx** (initialize + setUser)
5. **Tester** notification test

---

**Documentation OneSignal** : https://documentation.onesignal.com/docs
**Expo OneSignal** : https://github.com/OneSignal/onesignal-expo-plugin
