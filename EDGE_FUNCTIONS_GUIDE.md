# 🚀 Edge Functions & Secrets - Guide Complet

## ✅ **Ce qui a été déployé**

### **Edge Functions Actives**

✅ **create-payment**
- URL: `https://oxzjxjxonmlrcepszskh.supabase.co/functions/v1/create-payment`
- Statut: ACTIVE
- JWT vérifié: Oui (nécessite authentification)
- Fonction: Créer un paiement Mollie pour acheter des crédits

✅ **mollie-webhook**
- URL: `https://oxzjxjxonmlrcepszskh.supabase.co/functions/v1/mollie-webhook`
- Statut: ACTIVE
- JWT vérifié: Non (webhook public)
- Fonction: Recevoir les notifications de paiement de Mollie

---

## 🔐 **Configuration des Secrets**

### **Secret Mollie API Key**

Vous devez configurer votre clé API Mollie dans Supabase :

1. **Obtenir votre clé API Mollie :**
   - Allez sur https://www.mollie.com/dashboard/settings/profiles
   - Choisissez votre profil
   - Copiez votre **API Key** (commence par `live_` en production ou `test_` en test)

2. **Configurer dans Supabase :**

   **Option A : Via Dashboard (Recommandé)**
   ```
   1. Ouvrez: https://supabase.com/dashboard/project/oxzjxjxonmlrcepszskh/settings/functions
   2. Cliquez sur "Secrets"
   3. Ajoutez un nouveau secret:
      Nom: MOLLIE_API_KEY
      Valeur: live_dRzc5UMWs52bWwuRcQxvqfE6KKTkRq (votre clé)
   4. Cliquez "Save"
   ```

   **Option B : Via CLI**
   ```bash
   export SUPABASE_ACCESS_TOKEN=sbp_1f59297979c044418ec71b86ab9ab0b99fb7dfe8
   
   npx supabase secrets set MOLLIE_API_KEY=live_dRzc5UMWs52bWwuRcQxvqfE6KKTkRq
   ```

3. **Vérifier le secret :**
   ```bash
   npx supabase secrets list
   ```

---

## 📋 **Secrets Disponibles Automatiquement**

Ces secrets sont déjà configurés automatiquement par Supabase :

✅ `SUPABASE_URL` - URL de votre projet Supabase
✅ `SUPABASE_ANON_KEY` - Clé publique anonyme
✅ `SUPABASE_SERVICE_ROLE_KEY` - Clé service role (admin)
✅ `SUPABASE_DB_URL` - URL de connexion à la base de données

**Vous n'avez PAS besoin de les configurer manuellement !**

---

## 🧪 **Tester les Edge Functions**

### **1. Tester create-payment**

```bash
# Obtenir un token d'authentification d'abord
# (créez un compte et connectez-vous pour obtenir le token)

curl -X POST \
  https://oxzjxjxonmlrcepszskh.supabase.co/functions/v1/create-payment \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94emp4anhvbm1scmNlcHN6c2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMTU0NTAsImV4cCI6MjA3NTU5MTQ1MH0.7Jr6niKkPJnZ66DIQD5IKjbE5s-9iDUNDmVGEpqG8hQ" \
  -d '{
    "package_id": "plan-id",
    "user_id": "user-uuid",
    "amount": 9.99,
    "credits": 100
  }'
```

**Réponse attendue :**
```json
{
  "checkoutUrl": "https://www.mollie.com/checkout/...",
  "paymentId": "tr_xxxxx"
}
```

### **2. Tester mollie-webhook (Simulation)**

```bash
curl -X POST \
  https://oxzjxjxonmlrcepszskh.supabase.co/functions/v1/mollie-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "tr_xxxxx"
  }'
```

**Note :** En production, c'est Mollie qui appellera ce webhook automatiquement.

---

## 🔗 **Utiliser les Edge Functions dans l'Application**

### **Frontend - Créer un Paiement**

```typescript
// src/services/paymentService.ts
import { supabase } from '@/lib/supabase';

export async function createPayment(packageId: string, amount: number, credits: number) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        package_id: packageId,
        user_id: user.id,
        amount,
        credits,
      }),
    }
  );

  if (!response.ok) {
    throw new Error('Payment creation failed');
  }

  const data = await response.json();
  
  // Rediriger vers Mollie
  window.location.href = data.checkoutUrl;
}
```

### **Utilisation dans un Composant**

```tsx
// src/pages/Shop.tsx
import { createPayment } from '@/services/paymentService';

function Shop() {
  const handlePurchase = async (plan: ShopItem) => {
    try {
      await createPayment(plan.id, plan.price, plan.credits);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erreur lors de la création du paiement');
    }
  };

  return (
    <button onClick={() => handlePurchase(selectedPlan)}>
      Acheter maintenant
    </button>
  );
}
```

---

## 🔄 **Configurer Mollie Webhook**

### **Dans votre Dashboard Mollie**

1. Allez sur https://www.mollie.com/dashboard/settings/webhooks
2. Ajoutez l'URL webhook :
   ```
   https://oxzjxjxonmlrcepszskh.supabase.co/functions/v1/mollie-webhook
   ```
3. Sauvegardez

**Important :** Le webhook est automatiquement configuré dans chaque paiement créé, donc cette étape n'est nécessaire que pour un webhook global.

---

## 📊 **Surveiller les Edge Functions**

### **Logs en Temps Réel**

```bash
# Via CLI
export SUPABASE_ACCESS_TOKEN=sbp_1f59297979c044418ec71b86ab9ab0b99fb7dfe8

npx supabase functions logs create-payment
npx supabase functions logs mollie-webhook
```

### **Via Dashboard**

```
https://supabase.com/dashboard/project/oxzjxjxonmlrcepszskh/logs/edge-functions
```

---

## 🐛 **Debugging**

### **Erreur : "MOLLIE_API_KEY is not defined"**

**Solution :**
1. Vérifiez que le secret est bien configuré :
   ```bash
   npx supabase secrets list
   ```
2. Si absent, ajoutez-le :
   ```bash
   npx supabase secrets set MOLLIE_API_KEY=your_key
   ```
3. Redéployez les fonctions (automatique après ajout de secret)

### **Erreur : "Transaction not found"**

**Cause :** La table `transactions` n'existe pas ou a un schéma différent.

**Solution :**
1. Vérifiez que la table existe :
   ```sql
   SELECT * FROM pg_tables WHERE tablename = 'transactions';
   ```
2. Créez-la si nécessaire :
   ```sql
   CREATE TABLE IF NOT EXISTS transactions (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES profiles(id) NOT NULL,
     package_id uuid REFERENCES shop_items(id),
     amount decimal NOT NULL,
     credits integer NOT NULL,
     payment_status text DEFAULT 'pending',
     payment_id text,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );
   ```

### **Erreur : "Payment not found in Mollie"**

**Cause :** Clé API Mollie invalide ou paiement inexistant.

**Solution :**
1. Vérifiez votre clé API Mollie
2. Assurez-vous d'utiliser la bonne clé (test vs live)
3. Vérifiez les logs Mollie : https://www.mollie.com/dashboard/payments

---

## 🔐 **Sécurité**

### **Bonnes Pratiques**

✅ **Toujours utiliser les secrets d'environnement**
- Jamais de clés API en dur dans le code
- Utilisez `Deno.env.get('SECRET_NAME')`

✅ **Vérifier JWT pour les fonctions privées**
- `verify_jwt: true` pour les fonctions nécessitant authentification
- `verify_jwt: false` uniquement pour les webhooks publics

✅ **Valider les données entrantes**
- Vérifiez que tous les champs requis sont présents
- Validez les types et formats

✅ **Logger les erreurs (mais pas les secrets)**
- `console.error()` pour les erreurs
- Ne loggez jamais les clés API ou tokens

### **Configuration CORS**

Les deux fonctions ont CORS configuré pour accepter toutes les origines (`*`).

Pour la production, il est recommandé de restreindre :

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.xcrackz.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};
```

---

## 📚 **URLs Utiles**

### **Supabase**
- Dashboard Functions: https://supabase.com/dashboard/project/oxzjxjxonmlrcepszskh/functions
- Logs: https://supabase.com/dashboard/project/oxzjxjxonmlrcepszskh/logs/edge-functions
- Secrets: https://supabase.com/dashboard/project/oxzjxjxonmlrcepszskh/settings/functions

### **Mollie**
- Dashboard: https://www.mollie.com/dashboard
- API Keys: https://www.mollie.com/dashboard/settings/profiles
- Webhooks: https://www.mollie.com/dashboard/settings/webhooks
- Paiements: https://www.mollie.com/dashboard/payments
- Documentation: https://docs.mollie.com/

### **Edge Functions URLs**
- create-payment: `https://oxzjxjxonmlrcepszskh.supabase.co/functions/v1/create-payment`
- mollie-webhook: `https://oxzjxjxonmlrcepszskh.supabase.co/functions/v1/mollie-webhook`

---

## 🎉 **Résumé**

✅ 2 Edge Functions déployées et actives
✅ Secrets automatiquement configurés (sauf MOLLIE_API_KEY)
✅ CORS configuré correctement
✅ Webhooks prêts à recevoir les notifications
✅ Code sécurisé (pas de clés en dur)

**Action Requise :**
Ajoutez votre `MOLLIE_API_KEY` dans les secrets Supabase (voir section "Configuration des Secrets")

**Une fois fait, tout est prêt pour accepter des paiements ! 🚀**
