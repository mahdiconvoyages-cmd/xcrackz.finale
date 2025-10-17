# 🧪 Test Images - xCrackz

## ✅ Nouveau Déploiement

**Date:** 15 octobre 2025  
**URL Production:** https://xcrackz-fqpuvncwm-xcrackz.vercel.app  
**Build:** 3 secondes  
**Status:** ✅ Ready

---

## 🔍 URLs à Tester MAINTENANT

### 1. Images Directes (doivent s'afficher)

**Image CRM:**
```
https://xcrackz-fqpuvncwm-xcrackz.vercel.app/crm-illustration.png
```

**Image Inspection:**
```
https://xcrackz-fqpuvncwm-xcrackz.vercel.app/inspection-banner.png
```

➡️ **Action:** Ouvrez ces URLs dans votre navigateur.  
✅ **Résultat attendu:** Les images doivent s'afficher directement.  
❌ **Si 404:** Les fichiers ne sont pas dans dist/ (problème de build).

---

### 2. Page CRM avec Image

```
https://xcrackz-fqpuvncwm-xcrackz.vercel.app/
```

**Étapes:**
1. Ouvrir l'URL ci-dessus
2. Cliquer sur l'onglet **"CRM"**
3. L'image banner devrait être visible en haut

---

### 3. Page Rapports d'Inspection avec Image

```
https://xcrackz-fqpuvncwm-xcrackz.vercel.app/
```

**Étapes:**
1. Ouvrir l'URL ci-dessus
2. Cliquer sur **"Rapports d'Inspection"**
3. L'image hero devrait être visible en haut

---

## 🌐 Test sur Domaine Personnalisé

Attendez **30 secondes à 2 minutes** pour que le domaine pointe vers le nouveau déploiement, puis testez :

### xcrackz.com

**CRM:**
```
https://xcrackz.com/
→ Cliquer sur "CRM"
```

**Rapports:**
```
https://xcrackz.com/
→ Cliquer sur "Rapports d'Inspection"
```

### www.xcrackz.com

**CRM:**
```
https://www.xcrackz.com/
→ Cliquer sur "CRM"
```

**Rapports:**
```
https://www.xcrackz.com/
→ Cliquer sur "Rapports d'Inspection"
```

---

## 🛠️ Si Problème Persiste

### A. Images 404 sur URL Vercel Directe

**Cause:** Fichiers pas dans dist/  
**Solution:**
```powershell
# Vérifier localement
Test-Path "dist\crm-illustration.png"
Test-Path "dist\inspection-banner.png"

# Si False, problème de configuration Vite
# Vérifier que les fichiers sont bien dans public/
```

### B. Images OK sur Vercel mais 404 sur xcrackz.com

**Cause:** Domaine pointe vers ancien déploiement  
**Solution:**
```bash
# Forcer l'alias
vercel alias set xcrackz-fqpuvncwm-xcrackz.vercel.app xcrackz.com --token=d9CwKN7EL6dX75inkamfvbNZ
vercel alias set xcrackz-fqpuvncwm-xcrackz.vercel.app www.xcrackz.com --token=d9CwKN7EL6dX75inkamfvbNZ
```

### C. Images invisibles mais status 200

**Cause:** CSS cache le problème  
**Debug:**
1. F12 (DevTools)
2. Onglet Elements
3. Chercher `<img src="/crm-illustration.png">`
4. Vérifier styles appliqués (display: none ?)

---

## 📊 Checklist Complète

- [ ] ✅ Build réussi (npm run build)
- [ ] ✅ Images dans dist/ (crm + inspection)
- [ ] ✅ Déploiement Vercel réussi
- [ ] ⏳ Test image CRM direct: `/crm-illustration.png`
- [ ] ⏳ Test image Inspection direct: `/inspection-banner.png`
- [ ] ⏳ Test page CRM sur Vercel URL
- [ ] ⏳ Test page Rapports sur Vercel URL
- [ ] ⏳ Test page CRM sur xcrackz.com
- [ ] ⏳ Test page Rapports sur xcrackz.com

---

## 🔧 Déploiements Disponibles

| Âge | URL | Status |
|-----|-----|--------|
| **0m** | https://xcrackz-fqpuvncwm-xcrackz.vercel.app | ✅ **ACTUEL** |
| 8m | https://xcrackz-l761bb95m-xcrackz.vercel.app | ✅ Ready |
| 25m | https://xcrackz-b0evqsxs8-xcrackz.vercel.app | ✅ Ready |

---

## 🎯 Résultat Attendu

Après ce nouveau déploiement :

1. ✅ **Images directes** accessibles sur `/crm-illustration.png` et `/inspection-banner.png`
2. ✅ **Page CRM** affiche l'image banner responsive
3. ✅ **Page Rapports** affiche l'image hero
4. ✅ **Domaine xcrackz.com** pointe vers le nouveau déploiement (après 30s-2min)

---

**Testez maintenant et dites-moi le résultat !**
