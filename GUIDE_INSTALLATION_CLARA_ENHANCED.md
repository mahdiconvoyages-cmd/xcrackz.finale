# 🚀 Guide d'Application - Clara Enhanced

## Étape 1 : Appliquer la Migration SQL

### Option A : Via l'interface Supabase (RECOMMANDÉ)

1. **Ouvrir Supabase Dashboard:**
   - Aller sur https://app.supabase.com
   - Sélectionner votre projet

2. **Accéder au SQL Editor:**
   - Cliquer sur "SQL Editor" dans le menu gauche
   - Cliquer sur "+ New query"

3. **Copier la migration:**
   - Ouvrir le fichier: `supabase/migrations/20251012_enhanced_mission_system.sql`
   - Copier **tout le contenu** du fichier
   - Coller dans le SQL Editor

4. **Exécuter:**
   - Cliquer sur "Run" ou `Ctrl+Enter`
   - Attendre la confirmation (quelques secondes)
   - Vérifier qu'il n'y a pas d'erreurs

### Option B : Via CLI Supabase

```powershell
# Dans le terminal PowerShell
cd C:\Users\mahdi\Documents\Finality-okok

# Appliquer la migration
supabase db push

# OU si vous voulez appliquer juste cette migration
supabase migration up
```

---

## Étape 2 : Vérifier l'Installation

### Vérifier les tables créées:

Dans le SQL Editor de Supabase, exécuter:

```sql
-- Vérifier contact_requests
SELECT * FROM contact_requests LIMIT 1;

-- Vérifier mission_revenue_logs
SELECT * FROM mission_revenue_logs LIMIT 1;

-- Vérifier nouvelles colonnes missions
SELECT 
  mission_total_ht,
  provider_amount_ht,
  company_commission
FROM missions LIMIT 1;
```

### Vérifier les fonctions:

```sql
-- Test fonction log_mission_revenue
SELECT log_mission_revenue(
  '00000000-0000-0000-0000-000000000000'::uuid, -- mission_id (fake)
  auth.uid(), -- user_id
  'TEST-001', -- mission_reference
  'received_mission', -- revenue_type
  300, -- amount
  'Test' -- description
);

-- Test fonction get_monthly_revenue
SELECT get_monthly_revenue(auth.uid());
```

---

## Étape 3 : Tester les Fonctionnalités

### Test 1 : Création Mission avec Revenu

Dans Clara (ChatAssistant):

```
User: "Crée une mission"
Clara: "Marque du véhicule ?"
User: "BMW"
... (suivre le workflow)
User: "300€" (montant)

✅ Vérifier: Dashboard → Revenu du mois = +300€
```

### Test 2 : Assignation avec Commission

```
User: "Assigne la mission MISSION-XXX à contact@example.com"
Clara: "Combien le prestataire gagne (HT) ?"
User: "200€"
Clara: "Combien tu gagnes en commission (HT) ?"
User: "100€"

✅ Vérifier: Dashboard → Revenu du mois = +100€
```

### Test 3 : Demande de Contact

```
User: "Ajoute le contact test@example.com"

✅ Vérifier:
- Supabase → Table contact_requests → nouvelle ligne
- Statut = "pending"
```

### Test 4 : Analyse Mission

```
User: "Analyse la mission MISSION-XXX"

✅ Vérifier:
- Clara donne le statut détaillé
- Infos chauffeur si "en cours"
- Rapport si "terminée"
```

### Test 5 : Revenu du Mois

```
User: "Combien j'ai gagné ce mois ?"

✅ Vérifier:
- Clara affiche le total
- Détail missions reçues vs commissions
```

---

## Étape 4 : Vérifications Base de Données

### Vérifier les logs de revenus:

```sql
SELECT 
  mission_reference,
  revenue_type,
  amount,
  month_key,
  created_at
FROM mission_revenue_logs
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

### Vérifier les demandes de contact:

```sql
SELECT 
  target_email,
  target_name,
  status,
  created_at
FROM contact_requests
WHERE requester_id = auth.uid()
ORDER BY created_at DESC;
```

### Vérifier le total des revenus:

```sql
SELECT get_monthly_revenue(auth.uid()) as revenu_mois_en_cours;
```

---

## 🔧 Dépannage

### Problème : Migration échoue

**Solution:**
```sql
-- Vérifier si les tables existent déjà
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contact_requests', 'mission_revenue_logs');

-- Si elles existent, supprimer d'abord:
DROP TABLE IF EXISTS contact_requests CASCADE;
DROP TABLE IF EXISTS mission_revenue_logs CASCADE;

-- Puis re-exécuter la migration
```

### Problème : Fonctions non trouvées

**Solution:**
```sql
-- Lister les fonctions créées
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%revenue%' OR routine_name LIKE '%contact%';

-- Si absentes, re-exécuter juste la partie FONCTIONS de la migration
```

### Problème : RLS bloque les requêtes

**Solution:**
```sql
-- Vérifier les policies
SELECT * FROM pg_policies 
WHERE tablename IN ('contact_requests', 'mission_revenue_logs');

-- Si besoin, désactiver temporairement RLS (DEV uniquement)
ALTER TABLE contact_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE mission_revenue_logs DISABLE ROW LEVEL SECURITY;
```

---

## ✅ Checklist Finale

Avant de dire que tout fonctionne:

- [ ] Migration SQL appliquée sans erreur
- [ ] Tables `contact_requests` et `mission_revenue_logs` créées
- [ ] Colonnes ajoutées à `missions`
- [ ] Fonctions SQL disponibles
- [ ] Vues créées
- [ ] RLS policies actives
- [ ] Test création mission → Revenu enregistré
- [ ] Test assignation mission → Commission enregistrée
- [ ] Test demande contact → Demande créée
- [ ] Test analyse mission → Infos détaillées
- [ ] Test revenu du mois → Total affiché
- [ ] Dashboard met à jour "Revenu du mois"

---

## 📞 Support

Si problème:
1. Vérifier les logs Supabase (Dashboard → Logs)
2. Vérifier la console navigateur (F12)
3. Tester les requêtes SQL manuellement
4. Vérifier que l'utilisateur est bien authentifié

**Tout devrait fonctionner parfaitement ! 🎉**
