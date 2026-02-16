# Corrections v4.5.0 (Build 13)

## 🔧 Problèmes corrigés

### 1. ✅ Scanner - Images ne s'enregistrent pas
**Problème**: Le scanner fonctionnait parfaitement mais les images scannées n'apparaissaient pas dans la liste.

**Corrections apportées**:
- **CamScannerLikeScanner.tsx**: Ajout de la réinitialisation de l'état `scannedImage` quand le modal se ferme
- **ScannerProScreen.tsx**: Ajout de logs de débogage pour tracer l'ajout des images
- **Ordre d'exécution**: Fermeture du modal APRÈS l'ajout de l'image dans l'état

```typescript
// Avant: scannedImage n'était jamais reset
useEffect(() => {
  if (visible && !isScanning && !scannedImage) {
    handleScanDocument();
  }
}, [visible]);

// Après: reset de l'état à la fermeture
useEffect(() => {
  if (visible && !isScanning && !scannedImage) {
    handleScanDocument();
  }
  
  if (!visible) {
    setScannedImage(null);
    setIsScanning(false);
  }
}, [visible]);
```

### 2. ✅ Export PDF ne fonctionne pas
**Problème**: La génération PDF plantait à cause de l'utilisation de `atob`/`btoa` qui ne fonctionnent pas correctement en React Native.

**Corrections apportées**:
- Remplacement de **pdf-lib** par **expo-print**
- Génération via HTML + base64 (beaucoup plus fiable)
- Partage natif du PDF généré

```typescript
// Avant: pdf-lib avec atob/btoa (ne marche pas en RN)
const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
const image = await pdfDoc.embedJpg(imageBytes);

// Après: expo-print avec HTML
const html = `
  <!DOCTYPE html>
  <html>
    <body>
      ${imagesHtml.join('')}
    </body>
  </html>
`;
const { uri } = await Print.printToFileAsync({ html });
```

### 3. 🔍 Photos départ invisibles dans rapports
**Problème**: Les photos de l'inspection de départ n'apparaissent pas dans les rapports finaux (web + mobile).

**Investigations**:
- Ajout de logs de débogage dans `InspectionReportAdvanced.tsx` (web)
- Le code de chargement semble correct dans `listInspectionReports`
- Les logs permettront d'identifier si:
  - Les photos ne sont pas chargées depuis la DB
  - Les photos sont chargées mais les URLs sont invalides
  - Les photos sont chargées mais le composant ne les affiche pas

**Fichiers modifiés**:
- `src/components/InspectionReportAdvanced.tsx`: Ajout de console.log

**À tester**:
```javascript
// Les logs afficheront:
console.log('📸 InspectionReportAdvanced - Données:', {
  missionReference,
  departurePhotos: departure?.photos?.length || 0,
  arrivalPhotos: arrival?.photos?.length || 0,
});
```

### 4. ✅ Page mot de passe manquante
**Problème**: Pas de page pour gérer le lien de réinitialisation envoyé par Supabase.

**Corrections apportées**:
- Création de `src/pages/ResetPassword.tsx`
- UI moderne avec:
  - Validation du mot de passe (min 8 caractères)
  - Indicateur de force du mot de passe
  - Boutons show/hide password
  - Gestion des erreurs
  - Redirection automatique après succès
- Route ajoutée: `/reset-password` dans `App.tsx`

**Fonctionnalités**:
- Vérification automatique du token Supabase au chargement
- Gestion des tokens via URL params (access_token, refresh_token)
- Mise à jour sécurisée du mot de passe via `supabase.auth.updateUser()`
- Redirection vers `/login` après 2 secondes

### 5. 🔧 Scanner - Erreurs de types corrigées
**Problème**: Erreurs TypeScript avec react-native-document-scanner-plugin.

**Corrections**:
- Suppression de `letUserAdjustCrop` (option non supportée)
- Type casting avec `as any` pour les options avancées
- Utilisation de `responseType: 'base64'` au lieu de `'imageFilePath'`

## 📦 Changements techniques

### Dépendances
- ✅ expo-print (déjà présent, maintenant utilisé)
- ✅ react-native-document-scanner-plugin (déjà installé)

### Versions
- Version: **4.4.0** → **4.5.0**
- VersionCode: **12** → **13**

## 🧪 À tester

### Scanner
1. Ouvrir le scanner
2. Scanner un document
3. Vérifier que l'image apparaît dans la liste
4. Scanner plusieurs pages
5. Vérifier que toutes les pages sont sauvegardées

### Export PDF
1. Scanner 2-3 documents
2. Cliquer sur "Exporter en PDF"
3. Vérifier la génération du PDF
4. Tester le partage du PDF

### Photos départ
1. Créer une inspection de départ avec photos
2. Créer une inspection d'arrivée
3. Ouvrir le rapport comparatif
4. **Vérifier la console**: Logs `📸 InspectionReportAdvanced`
5. Vérifier que les photos de départ s'affichent

### Reset password
1. Sur web, aller sur `/forgot-password`
2. Entrer un email
3. Cliquer sur le lien reçu par email
4. Devrait rediriger vers `/reset-password?access_token=...`
5. Entrer un nouveau mot de passe
6. Vérifier la redirection vers login

## 📋 Problèmes non corrigés (besoin d'infos)

### Page tracking bugs (web)
- **Status**: Examiné mais bugs non identifiés
- **Raison**: L'utilisateur a mentionné "bugs" sans préciser lesquels
- **Action requise**: Tester et identifier les bugs spécifiques

### Rapport d'inspection mobile
- **Status**: Code examiné
- **Raison**: "Ne s'affiche pas correctement" est vague
- **Action requise**: Screenshots ou description précise des problèmes d'affichage

## 🚀 Build

```bash
cd mobile
eas build --platform android --profile production
```

Build en cours sur EAS...

## 📝 Notes de déploiement

1. **Scanner**: Les changements nécessitent un rebuild (code natif)
2. **PDF**: Changement côté JavaScript uniquement mais nécessite rebuild pour tester
3. **Reset password**: Web uniquement, déployable indépendamment
4. **Photos départ**: Logs ajoutés pour diagnostic, aucun changement fonctionnel

## 🔗 Liens utiles

- Build EAS: En cours d'upload
- Changelog complet: Ce fichier
- Documentation scanner: react-native-document-scanner-plugin
