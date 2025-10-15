# 🚀 RÉSUMÉ CONFIGURATION ONESIGNAL

## ✅ CE QUI EST FAIT

### 1. Configuration OneSignal
- ✅ APP_ID : `b284fe02-642c-40e5-a05f-c50e07edc86d`
- ✅ API_KEY : `vl2zv7tgluxpmgue4ulytsie5`
- ✅ Plugin Expo configuré dans `app.json`
- ✅ Service OneSignal créé (`OneSignalService.ts`)
- ✅ Configuration créée (`onesignal.ts`)
- ✅ Initialisé dans `App.tsx`

### 2. Base de données
- ✅ Migration SQL exécutée
- ✅ Tables créées : `user_devices`, `notification_logs`
- ✅ Vues de monitoring créées
- ✅ Fonction `get_notification_summary()` créée

### 3. Secrets Supabase
- ✅ ONESIGNAL_APP_ID configuré manuellement
- ✅ ONESIGNAL_API_KEY configuré manuellement

---

## ⏳ CE QUI RESTE À FAIRE

### Edge Function `send-notification`

**Voici le code prêt à déployer** (vous avez déjà déployé d'autres Edge Functions, utilisez la même méthode) :

#### Fichier : `supabase/functions/send-notification/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, userIds, filters, type, title, message, data, channel, templateId } = await req.json();

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      throw new Error('OneSignal credentials not configured');
    }

    if (!title && !templateId) {
      throw new Error('Either title or templateId is required');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: title ? { en: title, fr: title } : undefined,
      contents: message ? { en: message, fr: message } : undefined,
      data: { type, ...data },
      android_channel_id: channel || 'default',
      ios_sound: 'notification.wav',
      android_sound: 'notification',
      priority: channel === 'urgent' ? 10 : 5,
      template_id: templateId,
    };

    if (userId) {
      payload.include_external_user_ids = [userId];
    } else if (userIds && userIds.length > 0) {
      payload.include_external_user_ids = userIds;
    } else if (filters && filters.length > 0) {
      payload.filters = filters;
    } else {
      throw new Error('No targeting specified');
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.errors ? JSON.stringify(result.errors) : 'Failed to send notification');
    }

    const notificationId = result.id;

    if (userId) {
      await supabase.from('notification_logs').insert({
        notification_id: notificationId,
        user_id: userId,
        action: 'sent',
        type,
        title,
        message,
        data,
        channel,
        success: true,
      });
    }

    return new Response(
      JSON.stringify({ success: true, notificationId, recipients: result.recipients || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

---

## 🚀 DÉPLOIEMENT (Même méthode que vos autres Edge Functions)

### Option 1 : Via Dashboard Supabase

1. **Ouvrir** : https://supabase.com/dashboard/project/erdxgujquowvkhmudaai/functions
2. **Create function** → Nom : `send-notification`
3. **Copier-coller** le code ci-dessus
4. **Deploy** ✅

### Option 2 : Via CLI (comme pour dynamic-api, send-email, etc.)

```powershell
# Même commande que vous avez utilisée pour vos autres functions
cd supabase/functions
supabase functions deploy send-notification --project-ref erdxgujquowvkhmudaai
```

---

## 🧪 TESTER L'EDGE FUNCTION

Une fois déployée, testez avec :

```powershell
# Via Dashboard → Functions → send-notification → Invoke
# Ou via curl/Postman
```

Payload test :
```json
{
  "userId": "test-user",
  "type": "SYSTEM_UPDATE",
  "title": "🔔 Test OneSignal",
  "message": "Configuration réussie !",
  "channel": "updates"
}
```

---

## 📱 TESTER L'APP MOBILE

```powershell
cd mobile
npx expo start -c
```

Dans les logs, vous devriez voir :
```
🔔 Initializing OneSignal...
🔔 Setting OneSignal user: [votre-user-id]
```

---

## ✅ CHECKLIST FINALE

- [x] Configuration OneSignal (APP_ID, API_KEY)
- [x] Plugin Expo configuré
- [x] Service OneSignal créé
- [x] Migration SQL exécutée
- [x] Secrets Supabase configurés
- [x] App.tsx initialisé
- [ ] **Edge Function déployée** ⚠️ À FAIRE
- [ ] **Test notification** ⚠️ À FAIRE

---

## 🎯 PROCHAINE ÉTAPE

**Déployer l'Edge Function `send-notification`** en utilisant la même méthode que pour vos Edge Functions existantes (create-payment, mollie-webhook, send-email, dynamic-api).

Le code est prêt dans : `supabase/functions/send-notification/index.ts` ✅

**Voulez-vous que je vous aide à déployer cette function via Dashboard ?**
