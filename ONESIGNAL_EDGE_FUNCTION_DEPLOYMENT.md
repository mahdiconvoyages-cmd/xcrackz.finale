# 🚀 DÉPLOIEMENT EDGE FUNCTION - OneSignal

## Configuration Supabase

### 1. Variables d'environnement

Aller dans **Supabase Dashboard** → **Settings** → **Edge Functions** → **Secrets**

Ajouter les variables suivantes :

```bash
ONESIGNAL_APP_ID=b284fe02-642c-40e5-a05f-c50e07edc86d
ONESIGNAL_API_KEY=your-onesignal-rest-api-key
```

**Obtenir la REST API Key :**
1. Aller sur https://app.onesignal.com
2. Sélectionner votre app "XCrackz"
3. **Settings** → **Keys & IDs**
4. Copier la **REST API Key**

---

## Déploiement

### Installer Supabase CLI

```powershell
# Via npm
npm install -g supabase

# Ou via scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Login Supabase

```powershell
supabase login
```

### Déployer la fonction

```powershell
cd supabase/functions
supabase functions deploy send-notification --project-ref erdxgujquowvkhmudaai
```

### Tester la fonction

```powershell
# Test depuis ligne de commande
supabase functions invoke send-notification --project-ref erdxgujquowvkhmudaai --body '{"userId":"test-user","type":"SYSTEM_UPDATE","title":"Test","message":"Hello from Edge Function"}'
```

---

## Utilisation depuis l'app

```typescript
import { supabase } from './lib/supabase';

// Envoyer notification
const { data, error } = await supabase.functions.invoke('send-notification', {
  body: {
    userId: 'user-123',
    type: 'NEW_MISSION',
    title: '🚀 Nouvelle mission',
    message: 'Une nouvelle mission vous attend à Paris 15',
    data: {
      mission_id: 'mission-456',
      screen: 'MissionDetails',
      params: { missionId: 'mission-456' },
    },
    channel: 'missions',
  },
});

if (error) {
  console.error('Error sending notification:', error);
} else {
  console.log('Notification sent:', data);
}
```

---

## Structure de la requête

```typescript
{
  // CIBLAGE (1 option obligatoire)
  userId?: string;           // 1 utilisateur par external_user_id
  userIds?: string[];        // Plusieurs utilisateurs
  filters?: Array<{          // Segment par tags
    field: 'tag',
    relation: '=',
    key: string,
    value: string
  }>;

  // CONTENU
  type: string;              // NotificationType
  title: string;             // Titre de la notification
  message: string;           // Message de la notification
  data?: object;             // Données additionnelles
  channel?: string;          // Canal Android (missions, urgent, updates, navigation)
  templateId?: string;       // Template OneSignal (optionnel)
}
```

---

## Exemples d'utilisation

### Notification à 1 utilisateur

```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    userId: 'user-abc-123',
    type: 'NEW_MISSION',
    title: '🚀 Nouvelle mission',
    message: 'Livraison urgente à Paris 15',
    data: { mission_id: 'mission-456' },
    channel: 'missions',
  },
});
```

### Notification à plusieurs utilisateurs

```typescript
await supabase.functions.invoke('send-notification', {
  body: {
    userIds: ['user-1', 'user-2', 'user-3'],
    type: 'NAVIGATION_ALERT',
    title: '⚠️ Embouteillage',
    message: 'Trafic dense sur votre itinéraire',
    channel: 'navigation',
  },
});
```

### Notification par segment

```typescript
// Tous les drivers à Paris
await supabase.functions.invoke('send-notification', {
  body: {
    filters: [
      { field: 'tag', relation: '=', key: 'user_type', value: 'driver' },
      { field: 'tag', relation: '=', key: 'city', value: 'Paris' },
    ],
    type: 'SYSTEM_UPDATE',
    title: '📢 Mise à jour',
    message: 'Nouvelle version disponible',
    channel: 'updates',
  },
});
```

---

## Monitoring

### Logs en temps réel

```powershell
supabase functions logs send-notification --project-ref erdxgujquowvkhmudaai
```

### Dashboard Supabase

**Supabase Dashboard** → **Edge Functions** → **send-notification** → **Logs**

- Voir les invocations
- Voir les erreurs
- Temps d'exécution

---

## Sécurité RLS

L'Edge Function utilise la **Service Role Key** pour bypass RLS.

Pour sécuriser les appels depuis l'app :

```typescript
// Vérifier que l'utilisateur authentifié peut envoyer des notifications
const { data: user } = await supabase.auth.getUser();

if (!user) {
  throw new Error('Not authenticated');
}

// Seulement les admins peuvent envoyer à plusieurs users
if (userIds && userIds.length > 1) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized: Admin only');
  }
}
```

---

## Troubleshooting

### Erreur "Missing credentials"

✅ Vérifier les secrets dans Supabase Dashboard → Settings → Edge Functions → Secrets

### Erreur "No targeting specified"

✅ Fournir au moins `userId`, `userIds` ou `filters`

### Notification non reçue

1. Vérifier le Player ID dans `user_devices`
2. Vérifier les permissions sur l'appareil
3. Vérifier les logs OneSignal Dashboard
4. Vérifier `notification_logs` table

---

**Documentation OneSignal API** : https://documentation.onesignal.com/reference
