# ⚠️ PROBLÈME RÉSEAU DÉTECTÉ - npm install

**Date**: 14 octobre 2025  
**Problème**: npm et yarn ne peuvent pas se connecter au registre

---

## 🔴 DIAGNOSTIC

### Symptômes:
- ❌ npm install tourne indéfiniment sans télécharger
- ❌ yarn install: `ECONNREFUSED` (connexion refusée)
- ❌ 0 package installé après plusieurs minutes

### Cause probable:
**Problème de connexion réseau** vers registry.npmjs.org

Causes possibles:
1. **Pare-feu** bloque les connexions npm
2. **Antivirus** interfère avec les téléchargements
3. **Proxy d'entreprise** non configuré
4. **VPN** actif qui bloque les connexions
5. **Connexion internet** instable

---

## ✅ SOLUTIONS PAR ORDRE DE PRIORITÉ

### Solution 1: Vérifier la connexion (FAITES ÇA D'ABORD)

```powershell
# Tester la connexion au registre npm
Test-NetConnection registry.npmjs.org -Port 443

# Si ça échoue, le problème est réseau
```

**Résultat attendu**: `TcpTestSucceeded : True`

---

### Solution 2: Désactiver temporairement l'antivirus

1. Désactivez temporairement votre antivirus (Windows Defender ou autre)
2. Réessayez l'installation:
   ```powershell
   npm install --legacy-peer-deps
   ```
3. Réactivez l'antivirus après

---

### Solution 3: Désactiver le VPN

Si vous utilisez un VPN:
1. Déconnectez-vous du VPN
2. Réessayez l'installation
3. Reconnectez après

---

### Solution 4: Utiliser un autre réseau

- **Partage de connexion** depuis votre téléphone
- **WiFi public** (café, bibliothèque)
- **Réseau domestique** différent

---

### Solution 5: Installation manuelle (MODE HORS LIGNE)

Si vous avez accès à un autre ordinateur avec connexion:

#### Sur l'autre ordinateur:
```powershell
# Cloner le même package.json
npm install --legacy-peer-deps

# Compresser node_modules
Compress-Archive -Path node_modules -DestinationPath node_modules.zip
```

#### Sur cet ordinateur:
```powershell
# Décompresser
Expand-Archive -Path node_modules.zip -DestinationPath .
```

---

### Solution 6: Configurer un proxy (si en entreprise)

```powershell
# Si vous êtes derrière un proxy d'entreprise
npm config set proxy http://proxy.entreprise.com:8080
npm config set https-proxy http://proxy.entreprise.com:8080

# Puis réessayer
npm install --legacy-peer-deps
```

---

### Solution 7: Utiliser un miroir npm alternatif

```powershell
# Utiliser le miroir Taobao (Chine) - plus rapide parfois
npm config set registry https://registry.npmmirror.com

# Ou le miroir Cloudflare
npm config set registry https://registry.npmjs.cf

# Réessayer
npm install --legacy-peer-deps

# Remettre le registre officiel après
npm config set registry https://registry.npmjs.org/
```

---

## 🔧 COMMANDES DE DIAGNOSTIC

```powershell
# 1. Vérifier la configuration npm
npm config list

# 2. Tester la connexion au registre
Test-NetConnection registry.npmjs.org -Port 443

# 3. Vérifier le proxy
npm config get proxy
npm config get https-proxy

# 4. Vérifier les processus qui bloquent
Get-Process | Where-Object {$_.ProcessName -like "*npm*"}

# 5. Vérifier l'espace disque
Get-PSDrive C | Select-Object Used,Free
```

---

## ⚡ SOLUTION RAPIDE SI URGENCE

### Option A: Utiliser l'application mobile uniquement

Vous avez déjà séparé les projets. Le mobile fonctionne indépendamment:

```powershell
cd mobile
npm install --legacy-peer-deps

# Si ça marche, vous pouvez développer l'app mobile
npm start
```

### Option B: Développer sans node_modules (temporaire)

Pour certaines tâches, vous pouvez travailler sur le code sans lancer le serveur de dev.

---

## 📊 STATISTIQUES

| Tentative | Méthode | Résultat |
|-----------|---------|----------|
| 1 | npm install | ❌ Bloqué |
| 2 | npm install --legacy-peer-deps | ❌ Bloqué |
| 3 | yarn install | ❌ ECONNREFUSED |
| 4 | npm (config ajustée) | ⏳ En test |

---

## 🎯 PROCHAINE ACTION

1. **Vérifier la connexion**:
   ```powershell
   Test-NetConnection registry.npmjs.org -Port 443
   ```

2. **Si connexion OK**: Le problème est local (antivirus/pare-feu)
3. **Si connexion KO**: Le problème est réseau (proxy/VPN)

---

## 💡 WORKAROUND TEMPORAIRE

En attendant de résoudre le problème réseau, vous pouvez:

1. **Travailler sur le code** (pas besoin de node_modules pour éditer)
2. **Installer le mobile** (tester cd mobile && npm install)
3. **Utiliser un autre PC** pour l'installation web
4. **Attendre** que le réseau se stabilise

---

**Status**: 🔴 Problème réseau détecté  
**Priorité**: 🔥 HAUTE - Bloque le développement  
**Action**: Suivre les solutions ci-dessus dans l'ordre
