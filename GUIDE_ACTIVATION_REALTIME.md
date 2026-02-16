# 🔄 Guide d'Activation Realtime sur Supabase

## 🎯 Objectif

Activer la synchronisation temps réel pour que l'application mobile se mette à jour automatiquement **sans rafraîchir manuellement**.

---

## ✅ Méthode 1 : Interface Supabase (RECOMMANDÉ)

### Étape 1 : Accéder à Supabase Dashboard

1. Ouvrir [https://supabase.com](https://supabase.com)
2. Se connecter à ton compte
3. Sélectionner le projet **xcrackz** (ou ton nom de projet)

### Étape 2 : Activer Realtime par Table

#### Pour la table `missions`

1. Dans le menu latéral, cliquer sur **"Database"** 
2. Cliquer sur **"Replication"**
3. Dans la liste des tables, chercher **`missions`**
4. Cliquer sur l'icône **"Enable Realtime"** (ou cocher la case)
5. ✅ Vérifier que le statut passe à **"Enabled"**

#### Pour la table `vehicle_inspections`

1. Répéter les mêmes étapes
2. Chercher **`vehicle_inspections`**
3. Activer Realtime
4. ✅ Vérifier "Enabled"

#### Pour la table `carpooling`

1. Répéter les mêmes étapes
2. Chercher **`carpooling`**
3. Activer Realtime
4. ✅ Vérifier "Enabled"

#### (Optionnel) Pour la table `inspection_photos_v2`

1. Répéter les mêmes étapes
2. Chercher **`inspection_photos_v2`**
3. Activer Realtime
4. ✅ Vérifier "Enabled"

---

## ✅ Méthode 2 : SQL Editor (Alternative)

Si l'interface ne fonctionne pas, utiliser l'éditeur SQL :

### Étape 1 : Ouvrir SQL Editor

1. Dans le menu latéral Supabase, cliquer sur **"SQL Editor"**
2. Cliquer sur **"New query"**

### Étape 2 : Copier-Coller le Script

```sql
-- Activer Realtime sur les 4 tables principales
ALTER PUBLICATION supabase_realtime ADD TABLE missions;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_inspections;
ALTER PUBLICATION supabase_realtime ADD TABLE carpooling;
ALTER PUBLICATION supabase_realtime ADD TABLE inspection_photos_v2;
```

### Étape 3 : Exécuter

1. Cliquer sur **"Run"** (en bas à droite)
2. ✅ Vérifier le message de succès

---

## 🔍 Vérification

### Tester que Realtime est activé

Exécuter cette requête dans SQL Editor :

```sql
SELECT 
  schemaname, 
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime'
ORDER BY 
  tablename;
```

**Résultat attendu** :

| schemaname | tablename |
|------------|-----------|
| public | carpooling |
| public | inspection_photos_v2 |
| public | missions |
| public | vehicle_inspections |

---

## 🧪 Tester le Realtime

### Test 1 : Missions

1. **Web** : Créer une nouvelle mission
2. **Mobile** : L'application doit afficher la nouvelle mission automatiquement (sans pull-to-refresh)

### Test 2 : Inspections

1. **Mobile** : Créer une inspection de départ
2. **Web** : Le statut de la mission doit passer à "En cours" automatiquement

### Test 3 : Statut

1. **Mobile** : Terminer une inspection d'arrivée
2. **Web** : Le statut doit passer à "Terminée" automatiquement

---

## 📊 Ce qui Va Changer Après Activation

### Avant (Sans Realtime)

❌ **Mobile** :
- L'utilisateur doit "tirer vers le bas" pour rafraîchir
- Ne voit pas les changements faits sur web
- Risque de voir des données obsolètes

❌ **Web** :
- Ne voit pas les changements faits sur mobile
- Doit recharger la page manuellement

### Après (Avec Realtime)

✅ **Mobile** :
- Mise à jour automatique instantanée
- Voit immédiatement les missions créées sur web
- Plus besoin de rafraîchir manuellement

✅ **Web** :
- Voit immédiatement les inspections faites sur mobile
- Statuts des missions synchronisés en temps réel
- Pas besoin de recharger la page

---

## 🔧 Fonctionnalités Synchronisées

| Fonctionnalité | Avant | Après |
|----------------|-------|-------|
| **Nouvelle mission créée (web)** | ❌ Invisible sur mobile | ✅ Apparaît instantanément |
| **Mission assignée** | ❌ Doit rafraîchir | ✅ Notification automatique |
| **Inspection départ (mobile)** | ❌ Statut pas à jour web | ✅ Statut "En cours" immédiat |
| **Inspection arrivée (mobile)** | ❌ Statut pas à jour web | ✅ Statut "Terminée" immédiat |
| **Modification mission (web)** | ❌ Pas visible mobile | ✅ Mise à jour automatique |
| **Covoiturage créé** | ❌ Doit rafraîchir | ✅ Apparaît instantanément |

---

## 💰 Coûts Supabase

### Plan Gratuit
- ✅ **200 connexions simultanées** (largement suffisant)
- ✅ **Inclus sans surcoût**
- ✅ **Bandwidth illimité** pour Realtime

### Limites
- Maximum 200 utilisateurs connectés en même temps
- Pour ton usage actuel : **largement suffisant**
- Pas de limite de messages par seconde

---

## 🔒 Sécurité

### Row Level Security (RLS)

Realtime respecte **automatiquement** les politiques RLS :

```sql
-- Politique existante sur missions
CREATE POLICY "users_can_view_own_missions" ON missions
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_to_user_id);
```

✅ Les utilisateurs ne voient **que leurs propres données** en temps réel  
✅ Pas de risque de fuite de données  
✅ Sécurité identique à REST API  

---

## 📈 Performance

### Impact Base de Données
- ⚡ **Minimal** : Websocket léger
- ⚡ **Pas de polling** : Pas de requêtes répétées
- ⚡ **Push uniquement** : Mises à jour seulement si changement

### Impact Mobile/Web
- 📱 **Connexion permanente** : Websocket ouvert
- 📱 **Faible consommation** : Protocole optimisé
- 📱 **Reconnexion auto** : En cas de perte réseau

---

## ❓ Troubleshooting

### Problème : Realtime ne fonctionne pas

**Vérifications** :

1. ✅ Tables activées dans Supabase ?
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```

2. ✅ Application se connecte bien ?
   - Vérifier les logs mobile : `[Realtime] subscription status: SUBSCRIBED`

3. ✅ Politiques RLS configurées ?
   - Vérifier que l'utilisateur a bien les permissions SELECT

4. ✅ Connexion internet stable ?
   - Websocket nécessite connexion réseau

### Problème : Trop de reconnexions

**Solution** : Ajouter un debounce sur les souscriptions

```typescript
// Déjà implémenté dans useRealtimeSync.ts
useEffect(() => {
  const timer = setTimeout(() => {
    setupRealtime();
  }, 500); // Attendre 500ms avant de souscrire
  
  return () => clearTimeout(timer);
}, []);
```

---

## ✅ Checklist d'Activation

- [ ] Ouvrir Supabase Dashboard
- [ ] Aller dans Database → Replication
- [ ] Activer Realtime sur `missions`
- [ ] Activer Realtime sur `vehicle_inspections`
- [ ] Activer Realtime sur `carpooling`
- [ ] (Optionnel) Activer sur `inspection_photos_v2`
- [ ] Vérifier avec la requête SQL de vérification
- [ ] Tester sur mobile : créer mission sur web → voir apparaître sur mobile
- [ ] Tester sur web : faire inspection mobile → voir statut changer sur web

---

## 🚀 Résultat Final

Après activation :

✅ **Mobile et Web synchronisés en temps réel**  
✅ **Plus besoin de rafraîchir manuellement**  
✅ **Meilleure expérience utilisateur**  
✅ **Données toujours à jour**  
✅ **Pas de coût supplémentaire**  

---

## 📝 Documentation Officielle

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Realtime Subscriptions](https://supabase.com/docs/guides/realtime/subscriptions)
- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
