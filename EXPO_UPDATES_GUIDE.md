# 📲 Guide Expo Updates (OTA - Over The Air)

## ✅ Configuration Activée

Votre application supporte maintenant les **mises à jour OTA** (Over-The-Air) via Expo Updates.

## 🎯 Ce qui a été configuré

### 1. `mobile/app.json`
```json
"updates": {
  "url": "https://u.expo.dev/ba5fcd57-97ee-4ed7-93ff-9c79b7c6e2e9",
  "enabled": true,
  "checkAutomatically": "ON_LOAD",
  "fallbackToCacheTimeout": 0
},
"runtimeVersion": {
  "policy": "appVersion"
}
```

### 2. `mobile/eas.json`
Ajout de channels pour preview et production :
```json
"preview": {
  "channel": "preview",
  ...
},
"production": {
  "channel": "production",
  ...
}
```

### 3. Package installé
```bash
npm install expo-updates
```

---

## 🚀 Comment publier une mise à jour (sans rebuild APK)

### Étape 1 : Modifier votre code
Faites vos modifications dans `mobile/src/...` (composants, écrans, logique métier, etc.)

### Étape 2 : Publier l'update OTA

#### Pour le canal `preview` (test)
```powershell
cd mobile
eas update --branch preview --message "Fix bug tracking GPS"
```

#### Pour le canal `production` (utilisateurs finaux)
```powershell
cd mobile
eas update --branch production --message "Amélioration UX missions"
```

### Étape 3 : Les utilisateurs reçoivent l'update
- Au prochain **démarrage** de l'app (car `checkAutomatically: "ON_LOAD"`)
- L'app télécharge la mise à jour en arrière-plan
- Au redémarrage suivant, la nouvelle version est active

---

## 📋 Workflow recommandé

### Première installation (une seule fois)
1. **Build l'APK** avec Expo Updates activé :
   ```powershell
   cd mobile
   eas build --platform android --profile preview
   ```
2. Distribuer l'APK aux utilisateurs (page de téléchargement)

### Mises à jour ultérieures (sans rebuild)
1. **Modifier le code** dans `mobile/src/`
2. **Publier OTA** :
   ```powershell
   eas update --branch preview --message "Description du changement"
   ```
3. **Les utilisateurs ont la nouvelle version** au prochain démarrage !

---

## ⚠️ Limitations : Quand FAUT-IL rebuilder l'APK ?

Les updates OTA **NE FONCTIONNENT PAS** pour :

### ❌ Changements nécessitant un rebuild complet
- **Permissions Android/iOS** (modification de `android.permissions` dans app.json)
- **Nouveaux plugins natifs** (ajout de `expo-camera`, `expo-location`, etc. dans `plugins`)
- **Assets natifs** (icons, splash screen)
- **Changements dans `app.json`** (nom, version, bundleIdentifier, permissions)
- **Dépendances natives** (ajout de packages avec code natif)

### ✅ Ce qui fonctionne avec OTA uniquement
- **Code JavaScript/TypeScript** (React Native, composants, écrans)
- **Logique métier** (hooks, contexts, utils)
- **Styles** (StyleSheet, couleurs, layouts)
- **Images/assets importés** (via `require()` ou `import`)
- **Navigation** (ajout/modification de routes React Navigation)
- **API calls** (Supabase queries, REST calls)
- **UI fixes** (bugs visuels, textes, traductions)

---

## 🔍 Commandes utiles

### Voir les updates publiés
```powershell
cd mobile
eas update:list --branch production
```

### Rollback vers une version précédente
```powershell
cd mobile
eas update:republish --group <group-id>
```

### Voir les détails d'un update
```powershell
cd mobile
eas update:view <update-id>
```

### Créer un nouveau build avec updates
```powershell
cd mobile
# Preview
eas build --platform android --profile preview

# Production
eas build --platform android --profile production
```

---

## 💡 Stratégie recommandée

### Canal `preview`
- Pour les **testeurs internes**
- Déployer fréquemment sans crainte
- Tester les nouvelles fonctionnalités

### Canal `production`
- Pour les **utilisateurs finaux**
- Déployer après validation sur `preview`
- Updates stables uniquement

### Exemple de workflow
```powershell
# 1. Développement local
npm run android

# 2. Test sur preview
eas update --branch preview --message "Test nouvelle feature"

# 3. Validation OK ? Publier en production
eas update --branch production --message "Release v1.1.0"
```

---

## 🎉 Avantages

✅ **Pas de redistribution APK** pour les changements JS  
✅ **Mises à jour instantanées** (quelques secondes)  
✅ **Pas de validation Play Store** requise  
✅ **Rollback rapide** en cas de bug  
✅ **Plusieurs canaux** (preview, production, staging...)  
✅ **Gratuit** jusqu'à 50 000 MAU (Monthly Active Users)  

---

## 📊 Monitoring

- Dashboard EAS : https://expo.dev/accounts/xcrackz123/projects/xcrackz-mobile/updates
- Voir combien d'utilisateurs ont téléchargé chaque update
- Rollback en 1 clic si problème

---

## 🔐 Sécurité

- Les updates sont signés cryptographiquement
- Impossible de publier sans les credentials EAS
- Les utilisateurs ne téléchargent que des updates validés par votre compte Expo

---

## 📝 Checklist avant le premier OTA

- [x] `expo-updates` installé
- [x] `app.json` configuré avec `updates` et `runtimeVersion`
- [x] `eas.json` configuré avec channels
- [x] Un APK buildé avec EAS (contenant expo-updates)
- [ ] APK distribué aux utilisateurs
- [ ] Tester un premier update OTA sur `preview`

---

## 🆘 En cas de problème

### L'app ne télécharge pas les updates
1. Vérifier que l'APK a été buildé **APRÈS** l'ajout de `expo-updates`
2. Check les logs :
   ```javascript
   import * as Updates from 'expo-updates';
   
   // Dans App.tsx
   useEffect(() => {
     async function checkUpdates() {
       const update = await Updates.checkForUpdateAsync();
       console.log('Update available:', update.isAvailable);
     }
     checkUpdates();
   }, []);
   ```

### Forcer le téléchargement immédiat
```javascript
import * as Updates from 'expo-updates';

async function forceUpdate() {
  try {
    const update = await Updates.fetchUpdateAsync();
    if (update.isNew) {
      await Updates.reloadAsync();
    }
  } catch (e) {
    console.error(e);
  }
}
```

---

## 🎯 Prochaines étapes

1. **Rebuilder l'APK** une dernière fois avec Expo Updates :
   ```powershell
   cd mobile
   eas build --platform android --profile preview
   ```

2. **Distribuer le nouvel APK** (avec support OTA intégré)

3. **Publier votre premier update OTA** :
   ```powershell
   eas update --branch preview --message "First OTA update!"
   ```

4. **Profiter** : désormais, tous vos changements JS se déploient en quelques secondes ! 🚀
