# 🔧 GUIDE DEBUG BUILD EAS - SDK 54

## 🐛 Problème Actuel

Tous les builds échouent après ~1 minute avec SDK 54.0.0.

**Builds échoués** :
- Build #3 (52a15042) : Errored après 1min 6sec
- Build #2 (278153a7) : Errored après 1min 3sec

## 🔍 Causes Possibles

1. **Dépendances incompatibles** avec SDK 54
2. **Cache EAS** corrompu
3. **package.json** avec legacy-peer-deps
4. **Taille archive** trop grande (171 MB)
5. **Plugins Expo** incompatibles

## ✅ Solutions à Tester

### Solution 1 : Build avec Clear Cache

```powershell
cd mobile
eas build --platform android --profile production --clear-cache
```

Cela force EAS à tout réinstaller depuis zéro.

---

### Solution 2 : Vérifier les Dépendances

Certaines dépendances peuvent être incompatibles avec SDK 54.

**Vérifier** :
```powershell
npx expo-doctor
```

**Mettre à jour Expo** :
```powershell
npx expo install --fix
```

---

### Solution 3 : Build Profile "preview" au lieu de "production"

Le profile "preview" génère un APK directement (plus simple).

```powershell
eas build --platform android --profile preview
```

---

### Solution 4 : Simplifier app.json

Retirer temporairement les plugins pour identifier le problème.

**app.json minimal** :
```json
{
  "expo": {
    "name": "Finality",
    "slug": "finality-app",
    "version": "1.0.0",
    "android": {
      "package": "com.finality.app"
    }
  }
}
```

Puis rajouter plugins un par un.

---

### Solution 5 : Voir les Logs Détaillés

Les logs complets sont sur :
https://expo.dev/accounts/xcrackz/projects/finality-app/builds/52a15042-49b5-4cc6-bfb7-8e2ebb89e385

**Chercher** :
- Erreurs NPM install
- Erreurs de permissions
- Erreurs de plugins
- Timeout

---

### Solution 6 : Build Local (Alternative)

Si EAS continue d'échouer, on peut builder localement.

**Prérequis** :
- Android Studio installé
- Java JDK 17
- Android SDK configuré

**Commande** :
```powershell
cd mobile
npx expo run:android --variant release
```

Génère un APK dans `android/app/build/outputs/apk/release/`

---

## 🎯 SOLUTION RECOMMANDÉE (Ordre)

1. **D'abord** : Build avec `--clear-cache`
2. **Si échec** : Build profile `preview`
3. **Si échec** : Vérifier logs EAS en ligne
4. **Si échec** : Build local
5. **Dernier recours** : Downgrade SDK 51

---

## 📝 Commandes Rapides

```powershell
# Solution 1 - Clear cache
cd C:\Users\mahdi\Documents\Finality-okok\mobile
eas build --platform android --profile production --clear-cache

# Solution 2 - Profile preview
eas build --platform android --profile preview

# Solution 3 - Vérifier santé projet
npx expo-doctor

# Solution 4 - Fix dépendances
npx expo install --fix

# Solution 5 - Voir logs
eas build:view 52a15042-49b5-4cc6-bfb7-8e2ebb89e385

# Solution 6 - Liste builds
eas build:list
```

---

## 🔗 Liens Utiles

- **Logs build #3** : https://expo.dev/accounts/xcrackz/projects/finality-app/builds/52a15042-49b5-4cc6-bfb7-8e2ebb89e385
- **Dashboard** : https://expo.dev/accounts/xcrackz/projects/finality-app
- **EAS Troubleshooting** : https://docs.expo.dev/build-reference/troubleshooting/

---

## 💡 Prochaine Action

**ESSAYER MAINTENANT** :
```powershell
cd C:\Users\mahdi\Documents\Finality-okok\mobile
eas build --platform android --profile production --clear-cache --non-interactive
```

Cela devrait résoudre le problème de cache ! 🚀
