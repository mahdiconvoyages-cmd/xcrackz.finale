# 🐛 Guide Debug - App Mobile xCrackz

## 📱 Build Réussi avec Système de Debug

**Build ID :** 8442370f-54c1-45b0-b772-d19311cdde67  
**Status :** ✅ **BUILD FINISHED**  
**Download :** https://expo.dev/accounts/xcrackz123/projects/xcrackz-mobile/builds/8442370f-54c1-45b0-b772-d19311cdde67

## 🎯 Problème Rapporté

**Symptôme :** "Une erreur est survenue" au lancement de l'app, sans détails supplémentaires

**Cause Probable :** Erreur non catchée dans DashboardScreen ou au niveau de l'initialisation

## ✅ Solutions Appliquées

### 1. Error Boundary Détaillé

Créé `mobile/src/components/ErrorBoundary.tsx` avec :

```tsx
export class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('❌ Error caught:', error);
    console.error('📍 Error info:', errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={styles.container}>
          <Text>🔴 Erreur: {this.state.error?.toString()}</Text>
          <Text>💬 Message: {this.state.error?.message}</Text>
          <Text>📚 Stack Trace: {this.state.error?.stack}</Text>
          <Text>🧩 Component Stack: {this.state.errorInfo?.componentStack}</Text>
          <Pressable onPress={retry}>Réessayer</Pressable>
        </ScrollView>
      )
    }
    return this.props.children;
  }
}
```

**Avantages :**
- ✅ Affiche l'erreur complète à l'écran
- ✅ Montre le stack trace
- ✅ Affiche quel composant a planté
- ✅ Bouton "Réessayer"

### 2. Logs Console Ajoutés

Dans `DashboardScreen.tsx` :

```tsx
export default function DashboardScreen() {
  console.log('🚀 DashboardScreen: Rendering...');
  
  useEffect(() => {
    console.log('🔍 DashboardScreen: useEffect - loadUserId');
    loadUserId();
  }, []);
  
  const loadUserId = async () => {
    try {
      console.log('🔑 loadUserId - Fetching user...');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('❌ loadUserId - Error:', error);
        throw error;
      }
      console.log('✅ loadUserId - User:', user?.id);
    } catch (error) {
      console.error('💥 loadUserId - Catch error:', error);
    }
  };
  
  const loadDashboardData = async () => {
    try {
      console.log('📊 loadDashboardData - Starting...');
      // ... code ...
      console.log('✅ loadDashboardData - Success');
    } catch (error) {
      console.error('❌ loadDashboardData - Error:', error);
    }
  };
}
```

**Permet de tracer :**
- 🚀 Quand le composant s'affiche
- 🔑 Authentification Supabase
- 📊 Chargement des données
- ❌ Erreurs précises avec contexte

### 3. App.tsx Mis à Jour

```tsx
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            </QueryClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
      <Toast />
    </ErrorBoundary>
  );
}
```

## 📋 Comment Lire les Logs

### Ouvrir les Logs Android

**Méthode 1 : Expo Go / Dev Client**
```bash
npx expo start
# Puis scanner le QR code
# Les logs s'affichent dans le terminal
```

**Méthode 2 : ADB (Android Debug Bridge)**
```bash
# Installer ADB
adb devices

# Voir les logs en temps réel
adb logcat | grep -E "(ReactNativeJS|Expo)"

# Filtrer uniquement vos console.log
adb logcat | grep "🚀\|🔍\|🔑\|📊\|✅\|❌\|💥"
```

**Méthode 3 : Logcat dans Android Studio**
1. Connecter téléphone via USB
2. Ouvrir Android Studio
3. View → Tool Windows → Logcat
4. Filtrer : `package:com.finality.app`

### Interpréter les Emojis

| Emoji | Signification | Action |
|-------|---------------|--------|
| 🚀 | Composant démarre | Normal |
| 🔍 | Hook useEffect | Normal |
| 🔑 | Auth en cours | Normal |
| 📊 | Chargement données | Normal |
| ✅ | Succès | Tout va bien |
| ❌ | Erreur catchée | **Regarder le message** |
| 💥 | Erreur critique | **Erreur à résoudre** |

### Exemples de Logs Normaux

```
🚀 DashboardScreen: Rendering...
🔍 DashboardScreen: useEffect - loadUserId
🔑 DashboardScreen: loadUserId - Fetching user...
✅ DashboardScreen: loadUserId - User: ccce1fdc-xxxx-xxxx
👀 DashboardScreen: useFocusEffect - userId: ccce1fdc-xxxx-xxxx
📊 DashboardScreen: loadDashboardData - Starting...
✅ DashboardScreen: loadDashboardData - Success
```

### Exemples d'Erreurs Possibles

**Erreur 1 : Supabase Auth**
```
🔑 DashboardScreen: loadUserId - Fetching user...
❌ DashboardScreen: loadUserId - Error: {
  message: "Invalid JWT token",
  code: "PGRST301"
}
```
→ **Solution :** Déconnexion/reconnexion nécessaire

**Erreur 2 : Fetch Data**
```
📊 DashboardScreen: loadDashboardData - Starting...
❌ DashboardScreen: loadDashboardData - Error: {
  message: "Failed to fetch",
  code: "NetworkError"
}
```
→ **Solution :** Vérifier connexion Internet

**Erreur 3 : Render**
```
🚀 DashboardScreen: Rendering...
❌ Error caught by boundary: TypeError: Cannot read property 'map' of undefined
📍 Error info: at DashboardScreen.render (DashboardScreen.tsx:450)
```
→ **Solution :** Variable non définie, ajouter vérification null

## 🔧 Tests à Effectuer

### Test 1 : Installer l'APK

```bash
# Télécharger l'APK depuis :
https://expo.dev/accounts/xcrackz123/projects/xcrackz-mobile/builds/8442370f-54c1-45b0-b772-d19311cdde67

# Installer sur Android
adb install xcrackz-mobile.apk

# Lancer et observer
adb logcat | grep "DashboardScreen\|ErrorBoundary"
```

### Test 2 : Vérifier l'Erreur Affichée

Si l'app plante encore :
1. **Écran d'erreur s'affiche ?** → ✅ ErrorBoundary fonctionne
2. **Message d'erreur visible ?** → Lire le message
3. **Stack trace affiché ?** → Noter la ligne de code

### Test 3 : Scénarios Courants

**Scénario A : Erreur Auth Supabase**
```
Symptôme : "Invalid JWT token"
Cause : Session expirée
Solution : Déconnexion → Reconnexion
```

**Scénario B : Erreur Fetch**
```
Symptôme : "Failed to fetch"
Cause : Pas de connexion / RLS Supabase
Solution : Vérifier WiFi + RLS policies
```

**Scénario C : Erreur Render**
```
Symptôme : "Cannot read property X of undefined"
Cause : Données manquantes
Solution : Ajouter vérifications null
```

## 🐛 Debugging Avancé

### Option 1 : React Native Debugger

```bash
# Installer
npm install -g react-native-debugger

# Lancer
react-native-debugger

# Dans l'app, secouer téléphone → "Debug" → "Enable Remote Debugging"
```

### Option 2 : Flipper

```bash
# Installer Flipper Desktop
# https://fbflipper.com/

# Dans l'app compilée en debug
# Flipper détecte automatiquement l'app
# Voir : Logs, Network, Layout, etc.
```

### Option 3 : Sentry (Production)

```bash
npm install @sentry/react-native

# App.tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_DSN',
  tracesSampleRate: 1.0,
});

export default Sentry.wrap(App);
```

## 📊 Checklist Debug

### Avant de Contacter le Développeur

- [ ] APK installé sur téléphone Android
- [ ] App lancée au moins une fois
- [ ] **Screenshot de l'écran d'erreur** (avec message complet)
- [ ] **Logs ADB capturés** (si possible)
- [ ] Testé avec/sans WiFi
- [ ] Testé après déconnexion/reconnexion
- [ ] Version Android notée (ex: Android 12)
- [ ] Modèle téléphone noté (ex: Samsung Galaxy S21)

### Informations à Fournir

```
📱 Appareil : [Samsung Galaxy S21]
🤖 Android : [12]
📶 Connexion : [WiFi / 4G / 5G]
👤 Compte testé : [mahdi199409@gmail.com]

🐛 Erreur exacte :
[Copier-coller le message d'erreur de l'écran]

📚 Stack Trace :
[Si visible à l'écran, copier la partie "Stack Trace"]

📝 Logs ADB (optionnel) :
[Coller les logs si disponibles]
```

## 🚀 Prochaines Étapes

### Si l'Erreur Persiste

1. **Capturer l'écran d'erreur** → Envoyer screenshot
2. **Regarder les logs** → Noter l'emoji et le message
3. **Tester déconnexion** → Supprimer données app, relancer
4. **Rebuild avec logs** → Ajouter plus de console.log si besoin

### Si l'App Fonctionne

1. ✅ **Dashboard s'affiche** → Icône visible ?
2. ✅ **Navigation OK** → Tester tous les onglets
3. ✅ **Données chargées** → Missions, contacts, etc.
4. ✅ **Pas de crash** → Utiliser pendant 5-10 min

## 📝 Notes Techniques

### Fichiers Modifiés

1. **mobile/src/components/ErrorBoundary.tsx** ← Nouveau
   - Error boundary détaillé
   - Affichage complet de l'erreur
   - Bouton retry

2. **mobile/App.tsx**
   - Import ErrorBoundary
   - Suppression ancien RootErrorBoundary
   - Wrap de toute l'app

3. **mobile/src/screens/DashboardScreen.tsx**
   - Ajout console.log dans render
   - Ajout console.log dans useEffect
   - Ajout console.log dans loadUserId
   - Ajout console.log dans loadDashboardData
   - Try/catch améliorés

### Limitations

- ⚠️ Les logs `console.log` ne sont **pas** visibles dans l'APK production (il faut ADB)
- ⚠️ ErrorBoundary attrape les erreurs **React** uniquement (pas JS pur)
- ⚠️ Les erreurs async peuvent échapper à ErrorBoundary si pas de try/catch

### Améliorations Futures

- [ ] Ajouter Sentry pour tracking production
- [ ] Stocker les logs dans AsyncStorage
- [ ] Écran "Report Bug" avec envoi automatique
- [ ] Mode debug activable dans settings

## 🎯 Résumé

**Build avec Debug :** ✅ **Terminé**  
**Error Boundary :** ✅ **Actif**  
**Logs Console :** ✅ **Ajoutés**  
**APK Disponible :** ✅ **Téléchargeable**

**Prochaine Action :**
1. Télécharger APK
2. Installer sur Android
3. Lancer l'app
4. **Capturer l'écran d'erreur** si elle apparaît
5. Envoyer screenshot + description

---

**Build URL :** https://expo.dev/accounts/xcrackz123/projects/xcrackz-mobile/builds/8442370f-54c1-45b0-b772-d19311cdde67
