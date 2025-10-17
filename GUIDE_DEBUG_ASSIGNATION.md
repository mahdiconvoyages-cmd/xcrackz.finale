# 🔧 GUIDE DÉPANNAGE ASSIGNATION MISSIONS

## ❌ Problème Signalé
"l'assignation ne fonctionne pas"

---

## 🔍 Diagnostics à Faire

### **1. Exécuter TEST_ASSIGNATION.sql**

**Fichier créé :** `TEST_ASSIGNATION.sql`

**Dans Supabase Dashboard :**
1. Ouvrir **SQL Editor**
2. Copier/coller `TEST_ASSIGNATION.sql`
3. Cliquer **Run**

**Vérifier les résultats :**

#### ✅ **Résultat NORMAL :**
```
Section 1: Table existe avec 10+ colonnes
Section 2: Colonnes incluent mission_id, contact_id, user_id, etc.
Section 3: RLS actif = true
Section 4: 4 policies (SELECT, INSERT, UPDATE, DELETE)
Section 5: Liste des assignations (peut être vide)
Section 9: Au moins 1 mission disponible
Section 9: Au moins 1 contact disponible
```

#### ❌ **Problème 1: Table n'existe pas**
```sql
-- Si Section 1 retourne 0 colonnes
-- Exécuter cette migration:
c:\Users\mahdi\Documents\Finality-okok\supabase\migrations\20251011_fix_mission_assignments_table.sql
```

#### ❌ **Problème 2: Aucun contact**
```
Section 9: Contacts = 0
→ Vous devez créer des contacts AVANT d'assigner
→ Aller dans TeamMissions → Onglet "Équipe" → Ajouter Contact
```

#### ❌ **Problème 3: RLS bloque INSERT**
```
Policy INSERT n'existe pas ou est mal configurée
→ Vérifier Section 4 du test SQL
```

---

## 🐛 Symptômes et Solutions

### **Symptôme 1 : Modal ne s'ouvre pas**

**Cause possible :**
- Erreur JavaScript dans la console
- État React bloqué

**Solution :**
1. Ouvrir DevTools (F12)
2. Onglet **Console**
3. Chercher erreurs rouges
4. Partager le message d'erreur

---

### **Symptôme 2 : Modal s'ouvre mais bouton "Assigner" ne fait rien**

**Cause possible :**
- Erreur Supabase (RLS, permissions)
- Champ requis manquant

**Solution :**
```javascript
// Ouvrir DevTools → Console
// Chercher: "Error assigning mission:"
// L'erreur complète sera affichée
```

**Erreurs courantes :**
```
❌ "insert or update on table violates foreign key constraint"
→ Le contact_id ou mission_id n'existe pas

❌ "new row violates row-level security policy"
→ RLS bloque l'insertion (policy mal configurée)

❌ "duplicate key value violates unique constraint"
→ Ce contact est déjà assigné à cette mission
```

---

### **Symptôme 3 : Message "Mission assignée" mais rien ne change**

**Cause possible :**
- L'assignation est créée mais la mission n'apparaît pas dans l'onglet "Assignations"
- Problème de rechargement des données

**Solution :**
```sql
-- Vérifier dans Supabase que l'assignation existe:
SELECT * FROM mission_assignments 
ORDER BY assigned_at DESC 
LIMIT 5;
```

Si l'assignation existe :
→ Problème d'affichage dans le frontend
→ Vérifier `loadAssignments()` dans TeamMissions.tsx

---

### **Symptôme 4 : Dropdown "Chauffeur" est vide**

**Cause :**
- Aucun contact créé
- Les contacts ne sont pas chargés

**Solution :**
```sql
-- Vérifier contacts existent:
SELECT id, name, role, email 
FROM contacts 
WHERE user_id = 'VOTRE_USER_ID';
```

Si contacts = 0 :
→ Créer des contacts dans l'onglet "Équipe"

Si contacts > 0 mais dropdown vide :
→ Vérifier console JavaScript pour erreur dans `loadContacts()`

---

## 📊 Vérifications Étape par Étape

### **Étape 1 : Vérifier la base de données**

```sql
-- 1. Table existe?
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name = 'mission_assignments';
-- Attendu: 1

-- 2. Contacts existent?
SELECT COUNT(*) FROM contacts;
-- Attendu: >= 1

-- 3. Missions existent?
SELECT COUNT(*) FROM missions WHERE status = 'pending';
-- Attendu: >= 1

-- 4. RLS configuré?
SELECT rowsecurity FROM pg_tables 
WHERE tablename = 'mission_assignments';
-- Attendu: true
```

### **Étape 2 : Tester assignation manuelle**

```sql
-- Récupérer un mission_id et contact_id valides
SELECT m.id as mission_id, c.id as contact_id, auth.uid() as user_id
FROM missions m
CROSS JOIN contacts c
LIMIT 1;

-- Puis insérer (remplacer les UUIDs):
INSERT INTO mission_assignments (
  mission_id,
  contact_id,
  user_id,
  assigned_by,
  payment_ht,
  commission,
  status
) VALUES (
  'MISSION_UUID'::UUID,
  'CONTACT_UUID'::UUID,
  auth.uid(),
  auth.uid(),
  1000.00,
  100.00,
  'assigned'
);
```

**Si erreur :**
→ Partager le message d'erreur complet

**Si succès :**
→ Le problème est dans le frontend (TeamMissions.tsx)

---

### **Étape 3 : Vérifier le code frontend**

**Ouvrir TeamMissions.tsx → Fonction `handleAssignMission`**

**Logs à ajouter pour debug :**
```typescript
const handleAssignMission = async (e: React.FormEvent) => {
  e.preventDefault();
  
  console.log('🔍 DEBUG - Données:', {
    selectedMission: selectedMission?.id,
    contact_id: assignmentForm.contact_id,
    user_id: user?.id,
    payment_ht: assignmentForm.payment_ht,
    commission: assignmentForm.commission
  });

  if (!selectedMission || !assignmentForm.contact_id) {
    console.error('❌ Validation échouée');
    return;
  }

  try {
    const insertData = {
      mission_id: selectedMission.id,
      contact_id: assignmentForm.contact_id,
      user_id: user!.id,
      assigned_by: user!.id,
      payment_ht: assignmentForm.payment_ht,
      commission: assignmentForm.commission,
      notes: assignmentForm.notes,
      status: 'assigned',
    };
    
    console.log('📤 Envoi INSERT:', insertData);

    const { data, error } = await supabase
      .from('mission_assignments')
      .insert([insertData])
      .select(); // ← AJOUTER .select() pour voir ce qui est créé

    console.log('📥 Réponse Supabase:', { data, error });

    if (error) {
      console.error('❌ Erreur Supabase:', error);
      throw error;
    }

    // ...reste du code
  } catch (error) {
    console.error('💥 Error assigning mission:', error);
    alert('❌ Erreur lors de l\'assignation: ' + (error as any).message);
  }
};
```

---

## 🚀 Actions Immédiates

### **1. Exécuter TEST_ASSIGNATION.sql**
→ Voir si la table et les données existent

### **2. Ouvrir DevTools Console**
→ Essayer d'assigner une mission
→ Copier TOUTES les erreurs rouges

### **3. Vérifier contacts existent**
```sql
SELECT * FROM contacts LIMIT 5;
```

### **4. Partager avec moi :**
- ✅ Résultats Section 1, 3, 4, 9 du TEST_ASSIGNATION.sql
- ✅ Messages d'erreur dans Console JavaScript
- ✅ Nombre de contacts disponibles

---

## 📋 Checklist Complète

- [ ] Table `mission_assignments` existe (10+ colonnes)
- [ ] RLS activé (rowsecurity = true)
- [ ] 4 policies RLS présentes
- [ ] Au moins 1 contact dans la table `contacts`
- [ ] Au moins 1 mission avec status = 'pending'
- [ ] Pas d'erreur dans Console JavaScript
- [ ] Modal "Assigner Mission" s'ouvre correctement
- [ ] Dropdown "Chauffeur" contient des contacts

---

## 🎯 Prochaines Étapes

**Selon les résultats du TEST_ASSIGNATION.sql, je pourrai :**
1. Corriger les policies RLS si nécessaire
2. Ajouter des logs de debug dans TeamMissions.tsx
3. Créer une migration si table manquante
4. Identifier l'erreur exacte

**Exécutez TEST_ASSIGNATION.sql et partagez les résultats ! 🔍**
