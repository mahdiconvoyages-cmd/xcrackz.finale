# 🚀 DÉPLOIEMENT MANUEL EDGE FUNCTION - OneSignal

## ⚠️ Problème de permissions Supabase CLI

Le déploiement via CLI échoue avec une erreur 403. Voici la méthode manuelle via Dashboard.

---

## 📋 MÉTHODE 1: Via Dashboard Supabase (Recommandé)

### Étape 1: Ouvrir l'éditeur Edge Functions

1. **Aller sur** : https://supabase.com/dashboard/project/erdxgujquowvkhmudaai/functions
2. **Cliquer** : "Create a new function"
3. **Nom** : `send-notification`
4. **Cliquer** : "Create function"

### Étape 2: Copier le code

**Ouvrir le fichier** : `supabase/functions/send-notification/index.ts`

**Copier tout le contenu** (155 lignes) et le coller dans l'éditeur Dashboard.

### Étape 3: Déployer

1. **Cliquer** : "Deploy" (en haut à droite)
2. **Attendre** : Déploiement en cours...
3. **Vérifier** : Status "Active" ✅

---

## 📋 MÉTHODE 2: Via API Supabase Management

Si vous avez un token avec les bonnes permissions, vous pouvez utiliser l'API Management :

### Vérifier les permissions du token

```powershell
$headers = @{
    "Authorization" = "Bearer sbp_b403b64ab859ad72abe7363ea98e4b95a379948c"
    "Content-Type" = "application/json"
}

# Test d'accès
Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/erdxgujquowvkhmudaai" -Headers $headers
```

### Créer un nouveau token avec permissions complètes

1. **Aller sur** : https://supabase.com/dashboard/account/tokens
2. **Cliquer** : "Generate new token"
3. **Name** : "Deploy Functions"
4. **Scopes** : Cocher "Functions" (read + write)
5. **Copier** le token

---

## 📋 MÉTHODE 3: Configuration alternative (Sans Edge Function)

Si le déploiement continue à échouer, vous pouvez utiliser l'approche alternative :

### Envoyer notifications directement depuis l'app

Au lieu d'utiliser l'Edge Function Supabase, envoyez directement via OneSignal API :

```typescript
// mobile/src/services/OneSignalService.ts

private async sendViaOneSignalAPI(
  targetUserId: string,
  type: NotificationType,
  message: string,
  data?: any
) {
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic vl2zv7tgluxpmgue4ulytsie5',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_CONFIG.appId,
        include_external_user_ids: [targetUserId],
        headings: { en: template.title },
        contents: { en: message },
        data: { type, ...data },
        android_channel_id: template.channel,
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }

    // Log en base de données
    await this.logNotification(result.id, 'sent', type, data);
    
    return result;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}
```

⚠️ **Note** : Cette approche expose l'API Key dans l'app. Pour la production, utilisez l'Edge Function.

---

## ✅ VÉRIFICATION

### Après déploiement, tester :

1. **Dashboard** : https://supabase.com/dashboard/project/erdxgujquowvkhmudaai/functions
2. **Voir** : `send-notification` avec status "Active"
3. **Tester** : Cliquer sur la function → "Invoke" → Ajouter payload :

```json
{
  "userId": "test-user",
  "type": "SYSTEM_UPDATE",
  "title": "🔔 Test",
  "message": "Configuration réussie !",
  "channel": "updates"
}
```

---

## 📚 PROCHAINES ÉTAPES

Après déploiement de l'Edge Function :

1. **Restart l'app mobile** : `npx expo start -c`
2. **Vérifier logs** : OneSignal s'initialise correctement
3. **Tester notification** : Envoyer une notification test

---

**Quelle méthode préférez-vous ?**

- **Méthode 1** : Dashboard Supabase (plus simple)
- **Méthode 2** : Token avec permissions complètes
- **Méthode 3** : Sans Edge Function (direct OneSignal API)
