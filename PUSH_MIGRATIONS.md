# 🚀 Pousser les Migrations vers Supabase

## ✅ **Votre .env est à jour !**

```env
VITE_SUPABASE_URL=https://oxzjxjxonmlrcepszskh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🎯 **2 Méthodes pour Créer les Tables**

---

## **Méthode 1 : Supabase CLI (Recommandé) - 2 min**

### **Étape 1 : Installer et se connecter**

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter (ouvrira votre navigateur)
supabase login
```

**⚠️ Une page web va s'ouvrir → Cliquez sur "Authorize"**

### **Étape 2 : Lier le projet**

```bash
# Lier au nouveau projet
supabase link --project-ref oxzjxjxonmlrcepszskh
```

**Quand demandé le mot de passe :** Entrez le mot de passe de base de données que vous avez choisi lors de la création du projet.

### **Étape 3 : Pousser les migrations**

```bash
# Créer toutes les tables d'un coup
supabase db push
```

⏰ Attendez 1-2 minutes...

✅ **"Finished supabase db push"** → Parfait ! Toutes vos 36 migrations sont appliquées !

---

## **Méthode 2 : SQL Editor Manuel - 15 min**

Si la CLI ne fonctionne pas, vous pouvez exécuter les migrations manuellement.

### **Étape 1 : Aller dans SQL Editor**

1. Ouvrez https://supabase.com/dashboard/project/oxzjxjxonmlrcepszskh
2. Dans le menu de gauche → **SQL Editor**
3. Cliquez sur **"New query"**

### **Étape 2 : Exécuter les Migrations dans l'Ordre**

**IMPORTANT : Respectez l'ordre ci-dessous !**

Pour chaque migration :
1. Ouvrez le fichier dans votre éditeur de code
2. Copiez TOUT le contenu
3. Collez dans SQL Editor
4. Cliquez **"Run"** ▶️
5. Attendez ✅ "Success"
6. Passez au suivant

### **Liste des 36 Migrations (dans l'ordre)**

```bash
# Migrations de base (ordre crucial)
1.  supabase/migrations/20251007202039_create_fleetcheck_schema.sql
2.  supabase/migrations/20251007232540_create_shop_and_credits_system.sql
3.  supabase/migrations/20251007233052_add_admin_role_system_v2.sql
4.  supabase/migrations/20251007233646_add_first_last_name_to_profiles.sql
5.  supabase/migrations/20251008001931_create_inspections_system.sql
6.  supabase/migrations/20251008033053_create_gps_tracking_system.sql
7.  supabase/migrations/20251009104959_complete_fleetcheck_schema.sql
8.  supabase/migrations/20251009110444_add_clients_table.sql
9.  supabase/migrations/20251009142554_add_driver_system_to_contacts_v2.sql
10. supabase/migrations/20251009144826_add_user_type_and_address_to_profiles.sql
11. supabase/migrations/20251009150612_create_calendar_sharing_final.sql
12. supabase/migrations/20251009151525_create_inspection_gps_tracking_v2.sql
13. supabase/migrations/20251009194231_fix_inspection_client_name_field.sql
14. supabase/migrations/20251009202543_create_navigation_alerts_system.sql

# Migrations de corrections (peuvent être ignorées si duplicate)
15. supabase/migrations/20251009211206_20251007233052_add_admin_role_system_v2.sql
16. supabase/migrations/20251009211226_20251007233646_add_first_last_name_to_profiles.sql
17. supabase/migrations/20251009211304_20251008001931_create_inspections_system.sql
18. supabase/migrations/20251009211426_20251008033053_create_gps_tracking_system.sql

# Migrations des fonctionnalités
19. supabase/migrations/20251009221948_fix_user_credits_balance_column.sql
20. supabase/migrations/20251010001441_create_gdpr_tables.sql
21. supabase/migrations/20251010002313_add_unique_constraints_prevent_duplicate_accounts.sql
22. supabase/migrations/20251010005109_create_new_pricing_system_with_feature_costs.sql
23. supabase/migrations/20251010011552_create_support_system.sql
24. supabase/migrations/20251010012851_create_complete_carpooling_system.sql
25. supabase/migrations/20251010034917_create_subscriptions_and_admin_features.sql
26. supabase/migrations/20251010040424_create_billing_system.sql
27. supabase/migrations/20251010043035_create_subscriptions_system.sql
28. supabase/migrations/20251010044739_create_ai_chat_system.sql
29. supabase/migrations/20251010061543_add_commission_system.sql
30. supabase/migrations/20251010062921_auto_assign_credits_on_subscription.sql
31. supabase/migrations/20251010064359_fix_credit_assignment_radical.sql
32. supabase/migrations/20251010064413_force_credit_update_on_plan_change.sql
33. supabase/migrations/20251010064436_add_refresh_credits_function.sql
34. supabase/migrations/20251010065608_populate_shop_with_subscription_plans.sql
35. supabase/migrations/20251010065632_use_shop_data_for_credit_assignment.sql
36. supabase/migrations/20251010070257_replace_shop_with_correct_plans_fixed.sql
```

### **En cas d'erreur "already exists"**

C'est normal pour certaines migrations qui sont des doublons. Passez simplement à la suivante.

---

## **Vérifier que Tout est OK**

### **1. Dans Supabase Dashboard**

Allez dans **Table Editor** → Vous devriez voir :

```
✅ profiles
✅ missions
✅ contacts
✅ clients
✅ inspections
✅ inspection_photos
✅ gps_tracking_sessions
✅ gps_location_points
✅ mission_tracking_positions
✅ user_credits
✅ shop_items
✅ credit_transactions
✅ subscriptions
✅ carpooling_trips
✅ carpooling_bookings
✅ carpooling_reviews
✅ support_tickets
✅ ai_chat_conversations
✅ ai_chat_messages
... et plus !
```

### **2. Tester la Connexion**

```bash
# Démarrer l'application
npm run dev

# Ouvrir http://localhost:5173
```

✅ **Si la page s'affiche → Tout fonctionne !**

---

## **Créer un Compte Admin**

### **1. Créer le Compte**

Allez sur http://localhost:5173/register

```
Email: admin@xcrackz.com
Nom complet: Admin xCrackz
Mot de passe: [votre choix sécurisé]
```

Cliquez **"Créer un compte"**

### **2. Donner les Droits Admin**

Dans **Supabase Dashboard** → **SQL Editor** :

```sql
-- Donner les droits admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'admin@xcrackz.com';

-- Vérifier
SELECT email, is_admin, full_name FROM profiles WHERE email = 'admin@xcrackz.com';
```

Cliquez **"Run"** ▶️

### **3. Ajouter des Crédits Initiaux**

```sql
-- Vérifier si des crédits existent
SELECT * FROM user_credits 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'admin@xcrackz.com');

-- Si aucun crédit, en ajouter
INSERT INTO user_credits (user_id, balance, total_earned)
SELECT id, 1000, 1000 
FROM profiles 
WHERE email = 'admin@xcrackz.com'
ON CONFLICT (user_id) DO NOTHING;

-- Ou mettre à jour le solde
UPDATE user_credits 
SET balance = 1000, total_earned = 1000
WHERE user_id = (SELECT id FROM profiles WHERE email = 'admin@xcrackz.com');
```

### **4. Se Connecter**

Allez sur http://localhost:5173/login

```
Email: admin@xcrackz.com
Mot de passe: [celui que vous avez choisi]
```

✅ **Vous devriez être connecté et voir le dashboard !**

### **5. Accéder au Panneau Admin**

Allez sur http://localhost:5173/admin

✅ **Si vous voyez le panneau → Parfait !**

---

## 🎉 **TERMINÉ !**

Vous avez maintenant :

✅ Nouveau projet Supabase configuré
✅ Toutes les tables créées (36 migrations)
✅ Application connectée
✅ Compte admin créé avec crédits
✅ Accès complet au panneau d'administration

---

## 🚀 **Prochaines Étapes**

### **1. Tester les Fonctionnalités**

```
✅ Créer une mission
✅ Ajouter un contact
✅ Créer une inspection
✅ Tester le covoiturage
✅ Acheter des crédits
✅ Voir les rapports
```

### **2. Configurer Google OAuth**

1. Allez sur https://console.cloud.google.com/apis/credentials
2. Mettez à jour "URI de redirection autorisés" :
   ```
   https://oxzjxjxonmlrcepszskh.supabase.co/auth/v1/callback
   ```
3. Dans Supabase → **Authentication** → **Providers** → **Google**
4. Activez et ajoutez Client ID + Secret

### **3. Déployer en Production**

Voir **DEPLOYMENT_CHECKLIST.md** pour :
- Déploiement Vercel
- Configuration domaine www.xcrackz.com
- Variables d'environnement production
- Configuration DNS

---

## 🆘 **Problèmes ?**

### **"supabase: command not found"**

```bash
# Installer globalement
npm install -g supabase

# Ou utiliser npx
npx supabase login
npx supabase link --project-ref oxzjxjxonmlrcepszskh
npx supabase db push
```

### **Erreur "permission denied" lors du push**

→ Vérifiez que vous êtes bien connecté : `supabase projects list`
→ Reliez le projet : `supabase link --project-ref oxzjxjxonmlrcepszskh`

### **Migration échoue dans SQL Editor**

→ Lisez l'erreur
→ Si "already exists" → C'est normal, passez à la suivante
→ Si autre erreur → Copiez l'erreur et cherchez dans le fichier

### **"Invalid API key"**

→ Vérifiez le `.env` (pas d'espaces, bonne clé)
→ Redémarrez : `npm run dev`

---

## 📋 **Checklist Complète**

```
Configuration:
[ ] .env mis à jour avec nouvelles clés
[ ] Connexion Supabase testée (curl ou navigateur)

Migrations:
[ ] Supabase CLI installé (npm i -g supabase)
[ ] supabase login OK
[ ] supabase link OK
[ ] supabase db push OK (ou SQL Editor manuel fait)
[ ] Tables visibles dans Table Editor

Compte Admin:
[ ] Compte créé via /register
[ ] is_admin = true dans SQL
[ ] Crédits ajoutés
[ ] Connexion /login OK
[ ] Accès /admin OK

Tests:
[ ] npm run dev fonctionne
[ ] Page d'accueil OK
[ ] Dashboard accessible
[ ] Panneau admin accessible
```

---

**⏱️ Temps Total : 5-15 minutes selon la méthode**

**🎯 Utilisez la Méthode 1 (CLI) si possible, c'est beaucoup plus rapide !**
