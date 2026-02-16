# ⚠️ NPM INSTALL BLOQUÉ - SOLUTION RAPIDE

## 🔴 PROBLÈME
`npm install` tourne indéfiniment et ne se termine jamais.

---

## ✅ SOLUTION EN 2 ÉTAPES

### ÉTAPE 1️⃣: Arrêter npm install

**Dans le terminal où npm install tourne:**
```
Appuyez sur Ctrl + C
```

Ou fermez complètement VS Code.

---

### ÉTAPE 2️⃣: Exécuter le script de correction

**Ouvrez un NOUVEAU terminal PowerShell et exécutez:**

```powershell
.\fix-npm-install.ps1
```

**Le script va:**
1. ✅ Arrêter tous les processus npm
2. ✅ Supprimer node_modules et package-lock.json
3. ✅ Nettoyer le cache npm
4. ✅ Réinstaller proprement les dépendances

---

## 🎯 SI LE SCRIPT NE FONCTIONNE PAS

**Exécutez manuellement:**

```powershell
# 1. Nettoyer
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force

# 2. Réinstaller
npm install --legacy-peer-deps
```

---

## 🚀 APRÈS L'INSTALLATION

**Vérifiez que ça fonctionne:**

```powershell
# Tester le démarrage web
npm run dev
```

Devrait ouvrir http://localhost:5173

---

## 💡 ALTERNATIVE: Utiliser YARN

Si npm continue de bloquer:

```powershell
# Installer yarn globalement
npm install -g yarn

# Utiliser yarn pour installer
yarn install

# Démarrer avec yarn
yarn dev
```

---

## 📊 VÉRIFICATION

**Nombre de packages installés:**
```powershell
(Get-ChildItem node_modules).Count
```

Devrait être **> 100** pour une installation complète.

Si c'est **< 10**, l'installation n'est pas terminée.

---

## 🆘 TOUJOURS BLOQUÉ ?

1. **Fermez VS Code complètement**
2. **Rouvrez VS Code**
3. **Réexécutez `.\fix-npm-install.ps1`**

OU

1. **Ouvrez PowerShell EN DEHORS de VS Code**
2. **Naviguez vers le projet**
3. **Exécutez les commandes manuelles ci-dessus**

---

**Date**: 14 octobre 2025  
**Fichier**: fix-npm-install.ps1  
**Doc**: FIX_NPM_INSTALL_BLOQUE.md
