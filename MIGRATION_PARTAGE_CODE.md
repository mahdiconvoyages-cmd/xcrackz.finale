# 🔄 Migration: Système de Partage par Code

## ✅ IMPLÉMENTATION TERMINÉE

Date: 27 octobre 2025  
Status: **Prêt à tester**

---

## 📋 Résumé des Changements

### Ancien Système
- Assignation manuelle via interface équipe
- Gestion de contacts/utilisateurs
- Permissions complexes

### Nouveau Système
- **Code de partage unique** par mission (format: `XZ-ABC-123`)
- Partage simple par SMS, email, WhatsApp
- Auto-assignation via code
- **Plus besoin de gérer une équipe!**

---

## 🗂️ Fichiers Créés

### Backend (SQL)
```
database/migrations/add_mission_share_code.sql
```
- Colonne `share_code` (unique, auto-générée)
- Colonne `assigned_user_id` (référence auth.users)
- Fonction `generate_share_code()` 
- Fonction `join_mission_with_code()`
- Trigger auto-génération
- Politiques RLS mises à jour

### Web (TypeScript/React)
```
src/lib/shareCode.ts                          # Utilitaires génération/validation
src/components/ShareCodeDisplay.tsx           # Affichage code après création
src/components/JoinMissionModal.tsx           # Modal pour rejoindre
src/components/MissionShareCodeBadge.tsx      # Badge code sur cartes missions
src/pages/MissionCreate.tsx                   # Modifié: affiche code après création
src/pages/TeamMissions.tsx                    # Modifié: bouton "Rejoindre"
```

### Mobile (TypeScript/React Native)
```
mobile/src/lib/shareCode.ts                   # Utilitaires mobile
mobile/src/components/JoinMissionModal.tsx    # Modal rejoindre (native)
mobile/src/components/ShareCodeDisplay.tsx    # Affichage code (native)
mobile/src/screens/MissionsScreen.tsx         # Modifié: bouton "Rejoindre"
```

---

## 🚀 Comment Appliquer la Migration

### 1. Exécuter le SQL sur Supabase

```sql
-- Copier tout le contenu de:
database/migrations/add_mission_share_code.sql

-- Et l'exécuter dans:
Supabase Dashboard → SQL Editor → New Query
```

**Important:** Cette migration est **non-destructive**:
- ✅ Génère des codes pour toutes les missions existantes
- ✅ Conserve toutes les données actuelles
- ✅ Compatible avec l'ancien système (transition douce)

### 2. Vérifier la Migration

```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'missions' 
AND column_name IN ('share_code', 'assigned_user_id');

-- Vérifier quelques codes générés
SELECT id, share_code, status, assigned_user_id 
FROM missions 
LIMIT 5;

-- Tous les codes doivent avoir le format XZ-ABC-123
```

### 3. Déployer le Code

```bash
# Web
git add .
git commit -m "feat: Système de partage de missions par code"
git push origin main

# Mobile (rebuild nécessaire)
cd mobile
eas build -p android --profile production
```

---

## 📱 Flow Utilisateur

### Créer une Mission

**Web:**
1. Aller sur `/missions/create`
2. Remplir le formulaire
3. Cliquer "Créer la mission"
4. ✨ **Code généré automatiquement** (ex: `XZ-ABC-123`)
5. Modal s'affiche avec le code
6. Boutons "Copier" et "Partager"

**Mobile:**
1. Ouvrir l'app
2. Missions → Bouton "+"
3. Remplir le formulaire
4. Créer
5. Modal avec code
6. Partage natif disponible

### Rejoindre une Mission

**Web:**
1. Aller sur `/team-missions`
2. Cliquer "Rejoindre une mission" (bouton bleu)
3. Entrer le code reçu
4. Cliquer "Rejoindre"
5. ✅ Mission ajoutée à "Mes missions"

**Mobile:**
1. Ouvrir Missions
2. Cliquer "Rejoindre" (bouton bleu)
3. Entrer le code
4. Rejoindre
5. ✅ Mission dans l'onglet "Assignées"

---

## 🔧 Fonctionnalités Implémentées

### Génération de Code
- ✅ Format: `XZ-ABC-123` (10 caractères)
- ✅ Caractères sans confusion (pas de I, O, 0, 1)
- ✅ Unique garanti (vérification en boucle)
- ✅ Auto-généré à la création (trigger SQL)

### Validation
- ✅ Format vérifié côté client
- ✅ Nettoyage automatique (espaces, casse)
- ✅ Messages d'erreur clairs
- ✅ Vérification existence en base

### Partage
- ✅ **Web:** Copier + API Web Share (mobile)
- ✅ **Mobile:** Copier + Share natif Android/iOS
- ✅ Message pré-formaté avec instructions
- ✅ Lien téléchargement APK inclus

### Sécurité
- ✅ RLS Supabase: seul le créateur + assigné voient la mission
- ✅ Un code = une mission = un utilisateur assigné
- ✅ Impossible de rejoindre si déjà assigné à quelqu'un d'autre
- ✅ Fonction SQL `SECURITY DEFINER` pour join_mission_with_code

---

## 🎨 UI/UX

### Composants Web
1. **ShareCodeDisplay** - Carte gradientée cyan/blue
   - Code en grand (police mono)
   - Boutons Copier + Partager
   - Instructions détaillées
   - Message de partage prévisualisé

2. **JoinMissionModal** - Modal centré
   - Input code auto-formaté
   - Validation temps réel
   - Messages d'erreur explicites
   - Animation succès

3. **MissionShareCodeBadge** - Badge compact
   - Affiché sur chaque carte mission
   - Bouton copier inline
   - Tailles sm/md/lg

### Composants Mobile
1. **ShareCodeDisplay** - Bottom sheet
   - Design natif Android/iOS
   - Share natif intégré
   - Scroll si contenu long

2. **JoinMissionModal** - Modal fullscreen
   - Clavier optimisé
   - KeyboardAvoidingView
   - Loading states

---

## 📊 Base de Données

### Nouvelles Colonnes `missions`

| Colonne | Type | Description |
|---------|------|-------------|
| `share_code` | VARCHAR(10) UNIQUE | Code de partage (XZ-ABC-123) |
| `assigned_user_id` | UUID → auth.users | Utilisateur ayant rejoint la mission |

### Nouvelles Fonctions SQL

```sql
-- Générer un code aléatoire
generate_share_code() → TEXT

-- Rejoindre une mission
join_mission_with_code(code TEXT, user_id UUID) → JSON

-- Trigger auto-génération
auto_generate_share_code() → TRIGGER
```

### Politiques RLS Mises à Jour

```sql
-- Lecture: créateur OU assigné
"Users can view missions they joined"
USING (auth.uid() = user_id OR auth.uid() = assigned_user_id)

-- Modification: créateur OU assigné
"Assigned users can update missions"  
USING (auth.uid() = user_id OR auth.uid() = assigned_user_id)
```

---

## 🧪 Tests à Effectuer

### 1. Test Création + Partage (5 min)
- [ ] Créer une mission web
- [ ] Code généré automatiquement
- [ ] Copier le code fonctionne
- [ ] Partager ouvre le dialogue natif

### 2. Test Rejoindre (5 min)
- [ ] Ouvrir modal "Rejoindre"
- [ ] Entrer code valide
- [ ] Mission ajoutée à la liste
- [ ] Visible dans onglet "Assignées"

### 3. Test Mobile (5 min)
- [ ] Créer mission mobile
- [ ] Code affiché
- [ ] Share natif fonctionne
- [ ] Rejoindre via modal mobile

### 4. Test Erreurs (3 min)
- [ ] Code invalide → message erreur
- [ ] Code inexistant → "Aucune mission trouvée"
- [ ] Rejoindre 2x → "Déjà assignée"

### 5. Test Permissions (3 min)
- [ ] User A crée mission
- [ ] User B rejoint avec code
- [ ] User B voit la mission
- [ ] User C ne la voit pas
- [ ] User B peut faire inspection

---

## ⚠️ Points d'Attention

### 1. Ancienne Interface Équipe
**Status:** Pas encore supprimée  
**Action:** Décider si on garde en parallèle ou si on supprime

**Option A - Suppression:**
```bash
# Supprimer ces pages
rm src/pages/Team.tsx
rm src/components/TeamManagement.tsx
# Mettre à jour les routes
```

**Option B - Coexistence:**
- Garder l'ancien système pour compatibilité
- Nouveau système par défaut
- Ancien accessible via paramètres

### 2. Migrations Futures

**Codes existants:**
- Tous les codes déjà générés resteront valides
- Pas besoin de régénérer

**Changement de format:**
Si besoin de changer le format plus tard:
```sql
-- Régénérer tous les codes
UPDATE missions SET share_code = NULL;
-- Le trigger régénérera automatiquement
```

### 3. Analytics

**À suivre:**
- Taux d'utilisation codes vs assignation manuelle
- Temps moyen entre création et join
- Codes les plus partagés
- Erreurs de codes invalides

**Requête SQL:**
```sql
-- Missions avec code utilisé (assigné)
SELECT COUNT(*) FROM missions WHERE assigned_user_id IS NOT NULL;

-- Missions avec code non utilisé
SELECT COUNT(*) FROM missions WHERE assigned_user_id IS NULL;
```

---

## 🎯 Prochaines Étapes

### Améliorations Possibles

1. **QR Code** (Mobile)
   ```typescript
   // Générer QR du code pour scan rapide
   <QRCode value={shareCode} />
   ```

2. **Deep Links**
   ```
   xcrackz://join-mission/XZ-ABC-123
   ```

3. **Statistiques par Code**
   - Combien de fois partagé
   - Temps avant join
   - Taux de conversion

4. **Expiration de Code**
   ```sql
   ALTER TABLE missions ADD COLUMN code_expires_at TIMESTAMP;
   ```

5. **Codes Personnalisés**
   - Permettre à l'admin de choisir le code
   - Format: `XZ-CUSTOM-CODE`

---

## 📞 Support

**Documentation:**
- Ce fichier (MIGRATION_PARTAGE_CODE.md)
- Commentaires dans le code SQL
- JSDoc dans les utilitaires

**En cas de problème:**
1. Vérifier que la migration SQL est appliquée
2. Vérifier les logs Supabase (Dashboard → Logs)
3. Tester en mode dev avant prod
4. Rollback possible (colonnes nullables)

---

## ✅ Checklist Déploiement

- [ ] Migration SQL exécutée sur Supabase
- [ ] Vérification: codes générés pour missions existantes
- [ ] Code web déployé sur Vercel
- [ ] APK mobile rebuild (si changes mobile)
- [ ] Tests manuels effectués
- [ ] Documentation utilisateur mise à jour
- [ ] Monitoring activé
- [ ] Backup base de données fait

---

**Félicitations! Le système de partage par code est prêt! 🎉**

*Temps total d'implémentation: ~2h*  
*Complexité: Moyenne*  
*Impact utilisateur: Majeur (simplification)*
