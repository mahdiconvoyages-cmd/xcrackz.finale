# 🐛 Debug: Bouton Partage Mobile

## ✅ Modifications Appliquées

### 1. Logs de Débogage Ajoutés

**InspectionReportAdvanced.tsx** - Bouton de partage:
```typescript
onPress={() => {
  console.log('📤 Share button pressed! MissionId:', missionId);
  console.log('📋 Mission Reference:', missionReference);
  console.log('🚗 Vehicle:', vehicleLabel, plate);
  setSendVisible(true);
}}
```

**ShareReportSheet.tsx** - Génération du lien:
```typescript
useEffect(() => {
  console.log('🔍 ShareReportSheet useEffect:', { visible, missionId });
  if (visible && missionId) {
    console.log('🔗 ShareReportSheet: Generating link for mission:', missionId);
    generateShareLink();
  } else if (visible && !missionId) {
    console.log('⚠️ ShareReportSheet opened without missionId');
    setError('Mission introuvable. Veuillez réessayer.');
  }
}, [visible, missionId]);

const generateShareLink = async () => {
  console.log('📝 Starting link generation...');
  // ...
  console.log('📡 Calling RPC with missionId:', missionId);
  const { data, error: rpcError } = await supabase.rpc(...);
  console.log('📊 RPC Response:', { data, error: rpcError });
  // ...
}
```

### 2. Condition Modifiée

**Avant:**
```typescript
{ missionId && (
  <ShareReportSheet ... />
)}
```

**Après:**
```typescript
<ShareReportSheet
  visible={sendVisible}
  missionId={missionId || ''}
  ...
/>
```
✅ Le modal s'affiche toujours, même si `missionId` est vide (affichera une erreur explicite)

### 3. Gestion d'Erreur Améliorée

```typescript
if (data?.success) {
  console.log('✅ Share URL generated:', data.share_url);
  setShareUrl(data.share_url);
} else {
  console.log('❌ RPC call failed:', data);
  throw new Error('Impossible de générer le lien');
}
```

Alert ajouté:
```typescript
Alert.alert('Erreur', err.message || 'Impossible de générer le lien de partage');
```

---

## 🔍 Comment Déboguer

### Étape 1: Vérifier que le bouton est cliqué
1. Ouvrir l'app mobile
2. Aller dans un rapport d'inspection
3. Cliquer sur **"Partager le rapport"** (bouton cyan)
4. Regarder les logs React Native:

**Logs attendus:**
```
📤 Share button pressed! MissionId: [uuid]
📋 Mission Reference: CONV-2024-001
🚗 Vehicle: Mercedes Sprinter AB-123-CD
```

**Si le missionId est `undefined`:**
```
📤 Share button pressed! MissionId: undefined
⚠️ Problème: Le missionId n'est pas récupéré depuis la base
```

### Étape 2: Vérifier l'ouverture du modal
**Logs attendus:**
```
🔍 ShareReportSheet useEffect: { visible: true, missionId: 'abc-123' }
🔗 ShareReportSheet: Generating link for mission: abc-123
```

**Si missionId est vide:**
```
🔍 ShareReportSheet useEffect: { visible: true, missionId: '' }
⚠️ ShareReportSheet opened without missionId
```
→ Le modal affichera: "Mission introuvable. Veuillez réessayer."

### Étape 3: Vérifier l'appel RPC
**Logs attendus:**
```
📝 Starting link generation...
📡 Calling RPC with missionId: abc-123
📊 RPC Response: { data: { success: true, share_url: 'https://...' }, error: null }
✅ Share URL generated: https://xcrackz.com/rapport/ABC123XYZ
```

**Si erreur RPC:**
```
📊 RPC Response: { data: null, error: { message: 'function ... does not exist' } }
❌ Error generating share link: [error message]
```

---

## 🔧 Problèmes Possibles & Solutions

### Problème 1: `missionId` est `undefined`

**Cause:** La requête Supabase ne récupère pas le `mission.id`

**Solution:**
```typescript
// Dans InspectionReportAdvanced.tsx ligne ~93
const { data: d, error: dErr } = await supabase
  .from('vehicle_inspections')
  .select('*, mission:missions(id, vehicle:vehicles(brand, model, plate))')
  .eq('id', departureId)
  .single();

// Vérifier que d.mission existe
if (d?.mission) {
  setMissionId(d.mission.id); // ✅ Doit être défini
}
```

**Vérification:**
Ajouter un log:
```typescript
console.log('🎯 Mission data:', d?.mission);
```

---

### Problème 2: Fonction RPC n'existe pas

**Erreur:**
```
function create_or_update_public_report(p_mission_id uuid) does not exist
```

**Cause:** Le script SQL `CREATE_PUBLIC_REPORTS_SYSTEM.sql` n'a pas été exécuté sur Supabase

**Solution:**
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans **SQL Editor**
4. Copier-coller le contenu de `CREATE_PUBLIC_REPORTS_SYSTEM.sql`
5. Exécuter (**RUN**)

**Vérification:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'create_or_update_public_report';
```
→ Doit retourner une ligne

---

### Problème 3: Permission RLS

**Erreur:**
```
permission denied for function create_or_update_public_report
```

**Cause:** La fonction RPC n'a pas les bonnes permissions

**Solution:**
```sql
GRANT EXECUTE ON FUNCTION create_or_update_public_report(uuid, uuid) TO authenticated;
```

**Vérification:**
L'utilisateur doit être authentifié (avoir un token JWT valide)

---

### Problème 4: Modal ne s'ouvre pas

**Cause:** Le state `sendVisible` ne passe pas à `true`

**Vérification:**
```typescript
console.log('Modal visible:', sendVisible); // Doit être true après le clic
```

**Solution:** 
Vérifier que le `TouchableOpacity` n'est pas désactivé ou masqué

---

### Problème 5: Boutons de partage ne fonctionnent pas

**WhatsApp:**
```typescript
Linking.openURL(`whatsapp://send?text=${encodeURIComponent(text)}`)
```
→ Vérifier que WhatsApp est installé

**Email:**
```typescript
Linking.openURL(`mailto:?subject=...&body=...`)
```
→ Vérifier qu'une app email est configurée

**SMS:**
```typescript
Linking.openURL(`sms:?body=...`)
```
→ Fonctionne sur tous les appareils

**Share natif:**
```typescript
Share.share({ message, url })
```
→ Menu système, fonctionne toujours

---

## 📊 Checklist de Vérification

### Backend
- [ ] SQL exécuté sur Supabase
- [ ] Table `public_inspection_reports` existe
- [ ] Fonction `create_or_update_public_report` existe
- [ ] Permissions GRANT correctes
- [ ] RLS policies activées

### Frontend Mobile
- [ ] `missionId` est bien récupéré (logs)
- [ ] Modal s'ouvre au clic (logs)
- [ ] Appel RPC réussit (logs)
- [ ] `shareUrl` est généré (logs)
- [ ] Boutons de partage fonctionnent

### Configuration
- [ ] `EXPO_PUBLIC_SUPABASE_URL` défini
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` défini
- [ ] Build APK contient les dernières modifications

---

## 🚀 Test Complet

1. **Ouvrir l'app mobile**
2. **Aller dans Rapports d'Inspection**
3. **Sélectionner un rapport avec inspection départ/arrivée**
4. **Cliquer sur "Partager le rapport"** (bouton cyan)
5. **Vérifier:**
   - ✅ Modal s'ouvre
   - ✅ Loading apparaît
   - ✅ Lien s'affiche: `https://xcrackz.com/rapport/ABC123XYZ`
   - ✅ Bouton "Copier" fonctionne
   - ✅ Boutons WhatsApp/Email/SMS fonctionnent
6. **Cliquer sur le lien** (ou scanner le QR code)
7. **Vérifier:**
   - ✅ Page publique s'affiche
   - ✅ Photos visibles
   - ✅ Bouton télécharger ZIP fonctionne

---

## 📝 Logs à Surveiller

### Logs Normaux (✅ Succès)
```
📤 Share button pressed! MissionId: abc-def-123
📋 Mission Reference: CONV-2024-001
🚗 Vehicle: Mercedes Sprinter AB-123-CD
🔍 ShareReportSheet useEffect: { visible: true, missionId: 'abc-def-123' }
🔗 ShareReportSheet: Generating link for mission: abc-def-123
📝 Starting link generation...
📡 Calling RPC with missionId: abc-def-123
📊 RPC Response: { data: { success: true, share_url: 'https://xcrackz.com/rapport/ABC123XYZ', ... }, error: null }
✅ Share URL generated: https://xcrackz.com/rapport/ABC123XYZ
```

### Logs d'Erreur (❌ à Corriger)

**MissionId manquant:**
```
📤 Share button pressed! MissionId: undefined
⚠️ ShareReportSheet opened without missionId
```

**Erreur RPC:**
```
📊 RPC Response: { data: null, error: { message: 'function does not exist' } }
❌ Error generating share link: function does not exist
```

**Permission refusée:**
```
📊 RPC Response: { data: null, error: { message: 'permission denied' } }
❌ Error generating share link: permission denied
```

---

## 🔄 Prochaine Étape

**Après avoir testé, regarder les logs et identifier:**

1. **Le bouton est-il cliqué ?**
   → Si non: problème UI (bouton masqué/désactivé)
   
2. **Le missionId est-il présent ?**
   → Si non: problème requête Supabase
   
3. **Le modal s'ouvre-t-il ?**
   → Si non: problème state React
   
4. **L'appel RPC réussit-il ?**
   → Si non: problème backend (SQL non exécuté)
   
5. **Le lien est-il généré ?**
   → Si non: problème fonction SQL

Une fois le problème identifié via les logs, appliquer la solution correspondante ci-dessus.
