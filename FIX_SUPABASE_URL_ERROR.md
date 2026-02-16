# 🔧 FIX: Erreur Supabase "Invalid supabaseUrl"

## ❌ Erreur

```
Uncaught Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

## 🔍 Cause

Le fichier `.env` existe avec les bonnes valeurs, mais **Vite n'a pas rechargé les variables d'environnement**.

## ✅ Solution

### Option 1: Redémarrer le Serveur Vite (Recommandé)

1. **Arrêter le serveur** en cours :
   - Dans le terminal où `npm run dev` tourne
   - Appuyez sur `Ctrl+C`

2. **Relancer le serveur** :
   ```powershell
   npm run dev
   ```

3. **Rafraîchir le navigateur** :
   - Appuyez sur `F5` ou `Ctrl+R`

### Option 2: Hard Reload du Navigateur

Si le serveur refuse de redémarrer :

1. **Dans le navigateur** (Chrome/Edge/Firefox) :
   - Appuyez sur `Ctrl+Shift+R` (Windows)
   - Ou `Ctrl+F5`
   - Ou ouvrir DevTools → Clic droit sur refresh → "Empty Cache and Hard Reload"

2. **Si ça ne fonctionne toujours pas**, vider le cache Vite :
   ```powershell
   # Arrêter le serveur (Ctrl+C)
   
   # Supprimer le cache Vite
   Remove-Item -Recurse -Force node_modules/.vite
   
   # Relancer
   npm run dev
   ```

### Option 3: Clean Install (Dernier Recours)

```powershell
# Arrêter le serveur (Ctrl+C)

# Supprimer node_modules et cache
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force .vite

# Réinstaller
npm install

# Relancer
npm run dev
```

---

## 🧪 Vérifier que ça Fonctionne

Une fois le serveur redémarré, ouvrir la console du navigateur (F12) et taper :

```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
// Devrait afficher: https://bfrkthzovwpjrvqktdjn.supabase.co

console.log(import.meta.env.VITE_SUPABASE_ANON_KEY);
// Devrait afficher: eyJhbGciOiJ...
```

Si ça affiche `undefined`, c'est que les variables ne sont toujours pas chargées.

---

## 📝 Contenu du Fichier `.env`

Vérifier que le fichier `.env` à la **racine du projet** (pas dans `mobile/`) contient :

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://bfrkthzovwpjrvqktdjn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcmt0aHpvdndwanJ2cWt0ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzgwNzgsImV4cCI6MjA3NTU1NDA3OH0.ml0TkLYk53U6CqP_iCc8XkZMusFCSI-nYOS0WyV43Nc

# Mapbox Configuration
VITE_MAPBOX_TOKEN=YOUR_MAPBOX_TOKEN_HERE
```

⚠️ **Important** : Les variables DOIVENT commencer par `VITE_` pour être accessibles dans le code frontend !

---

## 🎯 Checklist de Debugging

- [ ] Le fichier `.env` existe à la racine du projet
- [ ] Les variables commencent par `VITE_`
- [ ] Le serveur Vite a été redémarré après création/modification du `.env`
- [ ] Le navigateur a été rafraîchi avec `Ctrl+Shift+R`
- [ ] Les variables s'affichent dans la console avec `import.meta.env.VITE_SUPABASE_URL`
- [ ] Aucune erreur dans la console du navigateur

---

## 🔄 Pourquoi ça Arrive ?

### Comportement de Vite

Vite charge les variables d'environnement **au démarrage du serveur**, pas dynamiquement. Donc :

1. ✅ Si `.env` existe **avant** `npm run dev` → Variables chargées
2. ❌ Si `.env` créé **pendant** que `npm run dev` tourne → Variables NON chargées
3. ✅ Redémarrage du serveur → Variables rechargées

### Hot Module Replacement (HMR)

Le HMR de Vite met à jour le code JavaScript/TypeScript automatiquement, mais **PAS les variables d'environnement**. Il faut toujours redémarrer pour ça.

---

## 🚀 Solution Rapide (TL;DR)

```powershell
# 1. Arrêter le serveur (Ctrl+C dans le terminal)
# 2. Relancer
npm run dev
# 3. Rafraîchir le navigateur (Ctrl+Shift+R)
```

**C'est tout !** ✨

---

**Créé le**: 11 octobre 2025  
**Problème**: Variables d'environnement Vite non chargées  
**Solution**: Redémarrer le serveur `npm run dev`
