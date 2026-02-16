# 🔧 FIX: npm install bloqué

## 🚨 PROBLÈME DÉTECTÉ

`npm install` est bloqué/tourne indéfiniment.

## ✅ SOLUTION

### Étape 1: Arrêter le processus
1. Appuyez sur **Ctrl+C** dans le terminal où npm tourne
2. OU fermez complètement VS Code et rouvrez-le

### Étape 2: Nettoyer complètement
```powershell
# Supprimer les fichiers de verrouillage et cache
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .npm -ErrorAction SilentlyContinue

# Nettoyer le cache npm
npm cache clean --force
```

### Étape 3: Réinstaller avec options
```powershell
# Option 1: Installation standard (recommandée)
npm install --no-optional --legacy-peer-deps

# Option 2: Si l'option 1 ne fonctionne pas
npm install --legacy-peer-deps --force

# Option 3: Si toujours bloqué
npm install --prefer-offline --no-audit --legacy-peer-deps
```

### Étape 4: Vérifier l'installation
```powershell
# Compter les packages installés (devrait être >100)
(Get-ChildItem node_modules).Count

# Tester le démarrage
npm run dev
```

## 🎯 COMMANDES COMPLÈTES (Copier-Coller)

```powershell
# TOUT EN UNE FOIS
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install --legacy-peer-deps
```

## ⚠️ SI ÇA NE FONCTIONNE PAS

1. **Fermer VS Code complètement**
2. **Rouvrir VS Code**
3. **Réessayer l'installation**

OU

1. **Utiliser un terminal externe** (PowerShell hors VS Code)
2. **Naviguer vers le projet**
3. **Exécuter npm install**

## 📊 VÉRIFICATIONS

### Avant installation (devrait être vide)
```powershell
Get-ChildItem node_modules | Measure-Object
# Count: 0 ou très peu
```

### Après installation (devrait être nombreux)
```powershell
Get-ChildItem node_modules | Measure-Object
# Count: >100 packages
```

## 🔍 DIAGNOSTIC

Si l'installation reste bloquée:
1. **Vérifier la connexion internet**
2. **Vérifier l'antivirus** (peut bloquer npm)
3. **Vérifier l'espace disque**
4. **Essayer en mode administrateur**

## 💡 ALTERNATIVE RAPIDE

Si vraiment bloqué, utilisez **yarn** au lieu de **npm**:

```powershell
# Installer yarn globalement
npm install -g yarn

# Utiliser yarn pour installer
yarn install
```

---

**Créé**: 14 octobre 2025  
**Problème**: npm install bloqué  
**Solution**: Nettoyer et réinstaller
