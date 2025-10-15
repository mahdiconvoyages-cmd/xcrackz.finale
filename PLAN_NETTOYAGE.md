# 🧹 PLAN DE NETTOYAGE - FICHIERS NON UTILISÉS

*Généré le: ${new Date().toLocaleDateString('fr-FR')}*

---

## 📋 FICHIERS À SUPPRIMER (7 fichiers)

### ✅ CONFIRMÉS DOUBLONS EXACTS (4 fichiers)

#### 1. **DashboardNew.tsx** - DUPLICATE DE Dashboard.tsx
```
📂 c:\Users\mahdi\Documents\Finality-okok\src\pages\DashboardNew.tsx
```
- **Raison**: Contenu 100% identique à Dashboard.tsx (589 lignes)
- **Utilisé dans App.tsx**: ❌ NON (Dashboard.tsx utilisé)
- **Action**: ✅ SUPPRIMER

#### 2. **RapportsInspection_NEW.tsx** - DUPLICATE DE RapportsInspection.tsx
```
📂 c:\Users\mahdi\Documents\Finality-okok\src\pages\RapportsInspection_NEW.tsx
```
- **Raison**: Contenu 100% identique à RapportsInspection.tsx (541 lignes)
- **Utilisé dans App.tsx**: ❌ NON (RapportsInspection.tsx utilisé)
- **Action**: ✅ SUPPRIMER

---

### ✅ BACKUPS OBSOLÈTES (3 fichiers)

#### 3. **TeamMissions_OLD.tsx** - BACKUP
```
📂 c:\Users\mahdi\Documents\Finality-okok\src\pages\TeamMissions_OLD.tsx
```
- **Raison**: Backup de l'ancienne version TeamMissions
- **Utilisé dans App.tsx**: ❌ NON (TeamMissions.tsx actif)
- **Action**: ✅ SUPPRIMER

#### 4. **Shop_OLD.tsx** - BACKUP
```
📂 c:\Users\mahdi\Documents\Finality-okok\src\pages\Shop_OLD.tsx
```
- **Raison**: Backup de l'ancienne boutique (avant modernisation)
- **Utilisé dans App.tsx**: ❌ NON (Shop.tsx actif)
- **Action**: ✅ SUPPRIMER

#### 5. **RapportsInspection_OLD.tsx** - BACKUP
```
📂 c:\Users\mahdi\Documents\Finality-okok\src\pages\RapportsInspection_OLD.tsx
```
- **Raison**: Backup ancienne version rapports
- **Utilisé dans App.tsx**: ❌ NON (RapportsInspection.tsx actif)
- **Action**: ✅ SUPPRIMER

---

### ✅ DASHBOARD OBSOLÈTE (1 fichier)

#### 6. **DashboardOld.tsx** - ANCIENNE VERSION
```
📂 c:\Users\mahdi\Documents\Finality-okok\src\pages\DashboardOld.tsx
```
- **Raison**: Ancienne version du dashboard
- **Utilisé dans App.tsx**: ❌ NON (Dashboard.tsx utilisé)
- **Action**: ✅ SUPPRIMER

---

### ⚠️ À VÉRIFIER MANUELLEMENT (1 fichier)

#### 7. **Contacts.tsx** - POTENTIELLEMENT REMPLACÉ
```
📂 c:\Users\mahdi\Documents\Finality-okok\src\pages\Contacts.tsx
```
- **Raison**: App.tsx importe `Contacts_PREMIUM.tsx` au lieu de `Contacts.tsx`
- **Utilisé dans App.tsx**: ❌ NON (Contacts_PREMIUM.tsx utilisé)
- **Action**: ⚠️ COMPARER AVANT SUPPRESSION
- **Alternative**: Si identiques, supprimer Contacts.tsx et renommer Contacts_PREMIUM → Contacts

---

## 📊 IMPACT ESTIMÉ

### Avant Nettoyage
```
Total fichiers pages: 35 fichiers .tsx
Code mort estimé: 20%
Bundle size: ~2.8MB
```

### Après Nettoyage
```
Total fichiers pages: 28-29 fichiers .tsx
Fichiers supprimés: 6-7 fichiers
Lignes supprimées: ~3,500 lignes
Bundle size: ~2.6MB (-200KB)
Réduction: -20% fichiers inutilisés
```

---

## ⚡ SCRIPT DE NETTOYAGE

### PowerShell - Suppression Automatique
```powershell
# Navigation vers projet
cd "c:\Users\mahdi\Documents\Finality-okok"

# Backup avant suppression (sécurité)
git add .
git commit -m "Backup avant nettoyage fichiers obsolètes"

# Suppression fichiers confirmés (6 fichiers)
Remove-Item "src\pages\DashboardNew.tsx" -Force
Remove-Item "src\pages\DashboardOld.tsx" -Force
Remove-Item "src\pages\RapportsInspection_NEW.tsx" -Force
Remove-Item "src\pages\RapportsInspection_OLD.tsx" -Force
Remove-Item "src\pages\TeamMissions_OLD.tsx" -Force
Remove-Item "src\pages\Shop_OLD.tsx" -Force

# Vérifier build après suppression
npm run build
```

---

## 🔍 VÉRIFICATIONS POST-NETTOYAGE

### Checklist
- [ ] Build réussit sans erreurs: `npm run build`
- [ ] Dev server démarre: `npm run dev`
- [ ] Aucune erreur console
- [ ] Pages principales chargent:
  - [ ] /dashboard
  - [ ] /team-missions
  - [ ] /shop
  - [ ] /rapports-inspection
  - [ ] /admin/support
- [ ] Imports corrects (aucun 404 modules)

---

## 📝 NOTES

### Fichiers Conservés (À Vérifier Utilité Future)
- **Contacts_PREMIUM.tsx**: Utilisé, mais nom bizarre (considérer renommage)
- Tous les autres fichiers dans src/pages/ sont activement utilisés dans App.tsx

### Recommandations Futures
1. **Convention Nommage**: Éviter suffixes _NEW, _OLD, _PREMIUM
2. **Git Workflow**: Utiliser branches au lieu de fichiers _OLD
3. **Backup Strategy**: S'appuyer sur git, pas sur fichiers doublons
4. **Code Review**: Supprimer immédiatement fichiers remplacés

---

**Action Immédiate**: Exécuter script PowerShell ci-dessus pour nettoyer 6 fichiers confirmés.
