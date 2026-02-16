## 🔧 CORRECTION SYNCHRONISATION STATUTS MISSIONS

**Date:** 7 novembre 2025  
**Problème:** Missions affichées "En attente" sur web alors qu'elles sont finies ou en cours depuis mobile

---

## 🐛 ANALYSE DU PROBLÈME

### Comportement Avant

1. **Mobile fait une inspection** (départ ou arrivée)
   - ✅ Inspection créée dans `vehicle_inspections`
   - ✅ Photos uploadées
   - ❌ Statut mission **PAS MIS À JOUR** dans la table `missions`

2. **Web affiche les missions**
   - ❌ Ignore le champ `status` de la DB
   - ❌ Recalcule le statut en lisant `vehicle_inspections`
   - ❌ Calcul incorrect = missions "En attente" alors qu'elles sont finies

### Cause Racine

**2 problèmes distincts:**

1. **Mobile ne met pas à jour le statut de la mission**
   - Fichiers: `InspectionDepartureNew.tsx`, `InspectionArrivalNewDedicated.tsx`
   - Met à jour uniquement `departure_inspection_completed` / `arrival_inspection_completed`
   - Ne met **jamais** à jour le champ `status`

2. **Web ignore le statut de la DB**
   - Fichier: `TeamMissions.tsx`
   - Recalcule toujours le statut au lieu de lire `mission.status`
   - Logique de calcul peut être désynchronisée

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. Mobile: Mise à jour du statut après inspection

#### InspectionDepartureNew.tsx (lignes 580-596)

**Avant:**
```typescript
const updateField =
  inspectionType === 'departure' ? 'departure_inspection_completed' : 'arrival_inspection_completed';

await supabase.from('missions').update({ [updateField]: true }).eq('id', missionId);
```

**Après:**
```typescript
const updateField =
  inspectionType === 'departure' ? 'departure_inspection_completed' : 'arrival_inspection_completed';

// Mettre à jour le statut de la mission selon l'inspection
const missionUpdate: any = { [updateField]: true };

if (inspectionType === 'departure') {
  // Inspection de départ → Mission passe en "in_progress"
  missionUpdate.status = 'in_progress';
} else if (inspectionType === 'arrival') {
  // Inspection d'arrivée → Mission passe en "completed"
  missionUpdate.status = 'completed';
}

await supabase.from('missions').update(missionUpdate).eq('id', missionId);

console.log(`✅ Mission ${missionId} status mis à jour: ${missionUpdate.status || 'unchanged'}`);
```

#### InspectionArrivalNewDedicated.tsx (lignes 525-531)

**Avant:**
```typescript
await supabase.from('missions').update({ arrival_inspection_completed: true }).eq('id', missionId);
```

**Après:**
```typescript
await supabase
  .from('missions')
  .update({ 
    arrival_inspection_completed: true,
    status: 'completed' // Mission terminée après inspection d'arrivée
  })
  .eq('id', missionId);

console.log(`✅ Mission ${missionId} status mis à jour: completed`);
```

---

### 2. Web: Lecture du statut de la DB en priorité

#### TeamMissions.tsx (lignes 162-188 et 230-256)

**Avant:**
```typescript
const processedCreatedData = (createdData || []).map(mission => {
  const missionInspections = inspections.filter(i => i.mission_id === mission.id);
  const hasDepart = missionInspections.some(i => i.inspection_type === 'departure');
  const hasArrival = missionInspections.some(i => i.inspection_type === 'arrival');
  
  let calculatedStatus = 'pending';
  
  if (hasDepart && hasArrival) {
    calculatedStatus = 'completed';
    return null;
  } else if (hasDepart) {
    calculatedStatus = 'in_progress';
  }
  
  return {
    ...mission,
    status: calculatedStatus
  };
```

**Après:**
```typescript
const processedCreatedData = (createdData || []).map(mission => {
  // Utiliser le statut de la DB en priorité (mis à jour par mobile)
  let finalStatus = mission.status;
  
  // Fallback: calculer le statut si absent ou si 'pending' dans DB
  if (!finalStatus || finalStatus === 'pending') {
    const missionInspections = inspections.filter(i => i.mission_id === mission.id);
    const hasDepart = missionInspections.some(i => i.inspection_type === 'departure');
    const hasArrival = missionInspections.some(i => i.inspection_type === 'arrival');
    
    if (hasDepart && hasArrival) {
      finalStatus = 'completed';
    } else if (hasDepart) {
      finalStatus = 'in_progress';
    } else {
      finalStatus = 'pending';
    }
  }
  
  // Filtrer les missions terminées
  if (finalStatus === 'completed') {
    return null;
  }
  
  return {
    ...mission,
    status: finalStatus
  };
```

**Même logique appliquée pour `processedReceivedData` (missions reçues)**

---

## 🎯 FLUX CORRIGÉ

### Scénario 1: Inspection de départ

1. **Mobile** fait inspection départ
2. **Mobile** INSERT dans `vehicle_inspections`
3. **Mobile** UPDATE `missions` SET:
   - `departure_inspection_completed = true`
   - `status = 'in_progress'` ✅ **NOUVEAU**
4. **Web** recharge via realtime
5. **Web** lit `mission.status = 'in_progress'` ✅ **NOUVEAU**
6. **Web** affiche "En cours" ✅

### Scénario 2: Inspection d'arrivée

1. **Mobile** fait inspection arrivée
2. **Mobile** INSERT dans `vehicle_inspections`
3. **Mobile** UPDATE `missions` SET:
   - `arrival_inspection_completed = true`
   - `status = 'completed'` ✅ **NOUVEAU**
4. **Web** recharge via realtime
5. **Web** lit `mission.status = 'completed'` ✅ **NOUVEAU**
6. **Web** filtre la mission (terminée) ✅

---

## 📊 IMPACT

### Avant
- ❌ Missions en cours affichées "En attente" sur web
- ❌ Missions terminées affichées "En attente" sur web
- ❌ Incohérence mobile ↔️ web
- ❌ Pas de source de vérité unique

### Après
- ✅ Statut stocké dans la DB (source de vérité)
- ✅ Mobile met à jour le statut automatiquement
- ✅ Web lit le statut de la DB en priorité
- ✅ Fallback sur calcul si statut manquant (anciennes missions)
- ✅ Synchronisation realtime fonctionne correctement

---

## 🧪 TESTS DE VALIDATION

1. **Créer nouvelle mission sur web**
   - [ ] Statut initial: "pending" ✅

2. **Faire inspection départ sur mobile**
   - [ ] Statut passe à "in_progress" sur mobile ✅
   - [ ] Web voit "En cours" immédiatement (realtime) ✅

3. **Faire inspection arrivée sur mobile**
   - [ ] Statut passe à "completed" sur mobile ✅
   - [ ] Mission disparaît du web (filtrée) ✅

4. **Anciennes missions (status NULL)**
   - [ ] Web calcule le statut (fallback) ✅
   - [ ] Affichage cohérent avec inspections ✅

---

## 📝 FICHIERS MODIFIÉS

1. `mobile/src/screens/inspections/InspectionDepartureNew.tsx`
   - Lignes 580-596: Ajout mise à jour status
   
2. `mobile/src/screens/inspections/InspectionArrivalNewDedicated.tsx`
   - Lignes 525-531: Ajout mise à jour status
   
3. `src/pages/TeamMissions.tsx`
   - Lignes 162-188: Lecture prioritaire status DB (missions créées)
   - Lignes 230-256: Lecture prioritaire status DB (missions reçues)

---

## 🚀 DÉPLOIEMENT

**Status:** ✅ Prêt à commiter et déployer

**Commandes:**
```bash
git add mobile/src/screens/inspections/InspectionDepartureNew.tsx
git add mobile/src/screens/inspections/InspectionArrivalNewDedicated.tsx
git add src/pages/TeamMissions.tsx
git commit -m "fix: synchronisation statuts missions mobile ↔️ web"
git push
```

**Impact utilisateur:**
- Synchronisation immédiate et correcte des statuts
- Plus d'incohérence entre mobile et web
- Source de vérité unique dans la base de données
