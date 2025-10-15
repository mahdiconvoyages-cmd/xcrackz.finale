# ✅ SOLUTION RAPIDE - Bouton "Démarrer" Invisible

## 🔴 Problème

**Vous ne voyez pas le bouton "Démarrer" dans vos missions.**

---

## ⚡ Solution Immédiate

### 1. Vérifier le Statut de la Mission

Le bouton **"Démarrer"** n'apparaît QUE si la mission a le statut `pending`.

**Vérification dans Supabase:**
```sql
-- Ouvrir Supabase Dashboard → SQL Editor → Exécuter:
SELECT reference, status FROM missions 
WHERE user_id = auth.uid()
ORDER BY created_at DESC;
```

**Résultat attendu:**
| reference | status |
|-----------|--------|
| MIS-20251011-001 | **pending** ✅ |

---

### 2. Si Statut ≠ `pending`, le Forcer

```sql
-- Remplacer 'MIS-20251011-001' par votre référence
UPDATE missions 
SET status = 'pending' 
WHERE reference = 'MIS-20251011-001';
```

**Puis recharger la page web** → Bouton "Démarrer" devrait apparaître ✅

---

## 📋 Statuts des Missions

| Statut | Description | Boutons Visibles |
|--------|-------------|------------------|
| `pending` | Nouvelle mission créée | ✅ **"Démarrer"** + "Assigner" |
| `assigned` | Assignée à un contact | ✅ **"Démarrer"** + "Assigner" |
| `in_progress` | Inspection départ faite, GPS actif | "Inspection d'arrivée" + "États des lieux" |
| `completed` | Inspection arrivée faite | "États des lieux" |
| `cancelled` | Annulée | "Supprimer" |

**→ Seuls `pending` et `assigned` affichent le bouton "Démarrer"**

---

## 🎯 Workflow Complet

```
1. CRÉER MISSION
   └─> status = 'pending'
       └─> ✅ BOUTON "DÉMARRER" VISIBLE

2. CLIQUER "DÉMARRER"
   └─> Redirection: /inspection/departure/{missionId}
       └─> Inspection de départ

3. FINALISER INSPECTION DÉPART
   └─> status = 'in_progress'
       └─> ❌ Bouton "Démarrer" DISPARAÎT
       └─> ✅ Bouton "Inspection d'arrivée" APPARAÎT
       └─> 📍 GPS démarre automatiquement

4. CLIQUER "INSPECTION D'ARRIVÉE"
   └─> Redirection: /inspection/arrival/{missionId}
       └─> Inspection d'arrivée

5. FINALISER INSPECTION ARRIVÉE
   └─> status = 'completed'
       └─> ✅ Bouton "États des lieux" (rapport PDF)
       └─> 🛑 GPS arrêté
```

---

## 🔧 Réinitialiser une Mission

Si une mission est bloquée en `in_progress` et que vous voulez recommencer :

```sql
-- 1. Trouver l'ID de la mission
SELECT id FROM missions WHERE reference = 'MIS-20251011-001';

-- 2. Supprimer les inspections liées
DELETE FROM vehicle_inspections WHERE mission_id = 'votre-id-ici';

-- 3. Supprimer GPS (si existant)
DELETE FROM gps_location_points WHERE mission_id = 'votre-id-ici';
DELETE FROM gps_tracking_sessions WHERE mission_id = 'votre-id-ici';

-- 4. Remettre en pending
UPDATE missions SET status = 'pending' WHERE id = 'votre-id-ici';
```

**Recharger la page** → Bouton "Démarrer" réapparaît ✅

---

## 📸 Comment Faire une Inspection

### Étape 1: Cliquer "Démarrer"
- Mission avec status `pending`
- Bouton bleu avec icône ▶️

### Étape 2: Photos Requises (6)
1. Vue avant
2. Vue arrière
3. Côté gauche
4. Côté droit
5. Intérieur
6. Tableau de bord (kilométrage)

### Étape 3: Informations
- Kilométrage: Ex: 50000
- Carburant: Ex: 75%
- État: Excellent/Bon/Moyen/Mauvais
- Notes: Optionnel

### Étape 4: Finaliser
- Cliquer **"Finaliser l'inspection"**
- Mission passe en `in_progress`
- GPS démarre
- Bouton "Inspection d'arrivée" apparaît

---

## 🗺️ Inspection avec GPS

### Départ
1. Inspection de départ → Photos + infos
2. Finaliser → GPS **DÉMARRE** automatiquement 📍
3. Position enregistrée toutes les 2 secondes

### Navigation
- **Waze**: Bouton "Ouvrir dans Waze"
- **Google Maps**: Bouton "Ouvrir dans Google Maps"
- Trajet: Adresse départ → Adresse livraison

### Arrivée
1. Arriver à destination
2. Cliquer "Inspection d'arrivée"
3. Photos + infos finales
4. Finaliser → GPS **ARRÊTE** automatiquement 🛑
5. Mission passe en `completed`
6. **Rapport PDF généré** 📄

---

## ❓ FAQ

### Q: Je ne vois aucun bouton "Démarrer"
**R:** Vérifier le statut avec SQL ci-dessus, forcer à `pending` si besoin.

### Q: Le bouton était là puis a disparu
**R:** Vous avez déjà démarré l'inspection, la mission est en `in_progress`. Cliquez sur **"Inspection d'arrivée"** pour terminer.

### Q: GPS ne démarre pas
**R:** 
1. Vérifier permissions GPS (mobile)
2. Vérifier inspection départ est **terminée**
3. Vérifier status mission = `in_progress`

### Q: Comment voir le rapport d'inspection ?
**R:** 
- Mission `completed` ou `in_progress`
- Bouton **"États des lieux"**
- → Affiche photos départ + arrivée + GPS + PDF

### Q: Puis-je assigner ET démarrer ?
**R:** Oui ! 
- "Assigner" → Donne la mission à un contact
- "Démarrer" → Lance l'inspection (vous ou le contact)

---

## 📞 Si Problème Persiste

1. **Recharger la page** (Ctrl + F5)
2. **Vider cache navigateur**
3. **Vérifier console** (F12) pour erreurs
4. **Consulter** `GUIDE_INSPECTION_COMPLET.md` pour détails

---

## ✅ Checklist Démarrage

- [ ] Mission créée avec succès
- [ ] Status = `pending` (vérifier SQL)
- [ ] Bouton "Démarrer" visible (bleu avec ▶️)
- [ ] Clic "Démarrer" → Redirection OK
- [ ] 6 photos prises
- [ ] Kilométrage + carburant renseignés
- [ ] Clic "Finaliser" → Status = `in_progress`
- [ ] GPS démarré (points enregistrés)
- [ ] Bouton "Inspection d'arrivée" visible

---

**Temps de lecture:** 3 minutes  
**Difficulté:** Facile  
**Solution:** 95% du temps = Forcer status à `pending`

🚀 **Bon démarrage !**
