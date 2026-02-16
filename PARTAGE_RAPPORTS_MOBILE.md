# 🔗 Système de Partage de Rapports d'Inspection - Mobile

## 📋 Vue d'ensemble

Le système de partage de rapports d'inspection mobile est **identique** à la version web. Il permet de générer des liens sécurisés pour partager les rapports complets d'inspection avec les clients.

## 🏗️ Architecture

### Composants Créés

#### 1. **ShareInspectionModal.tsx**
- Localisation: `mobile/src/components/ShareInspectionModal.tsx`
- Modal React Native pour générer et partager des liens
- Fonctionnalités:
  - Authentification multi-fallback (session → getUser → AsyncStorage)
  - Génération de lien via RPC Supabase
  - Copie dans le presse-papiers
  - Partage natif (WhatsApp, Email, SMS, etc.)
  - Interface mobile-first

```tsx
<ShareInspectionModal
  visible={showShareModal}
  onClose={() => setShowShareModal(false)}
  missionId="mission-uuid"
  reportType="complete"
/>
```

#### 2. **PublicInspectionReportShared.tsx**
- Localisation: `mobile/src/screens/PublicInspectionReportShared.tsx`
- Page publique accessible sans authentification
- Affiche:
  - Informations mission et véhicule
  - Points de départ/arrivée
  - Métriques (KM, temps, convoyeur)
  - Inspections départ/arrivée complètes
  - Photos (modal avec navigation)
  - Signatures
  - Documents et équipements
- Responsive mobile-first

### Routing

#### App.tsx
```tsx
<Stack.Screen 
  name="PublicReport" 
  component={PublicInspectionReportShared}
  options={{ headerShown: false }}
/>
```

La route publique est accessible AVANT l'authentification pour permettre aux clients de consulter les rapports sans compte.

### Intégration dans InspectionReportScreen

Bouton "Partager" ajouté à côté du bouton PDF :

```tsx
<TouchableOpacity
  style={styles.actionButton}
  onPress={(e) => {
    e.stopPropagation();
    setShareModalMissionId(inspection.mission_id);
    setShowShareModal(true);
  }}
>
  <Ionicons name="share-social" size={18} color="#3b82f6" />
  <Text style={styles.actionText}>Partager</Text>
</TouchableOpacity>
```

## 🔄 Flux de Fonctionnement

### 1. Génération du lien (Convoyeur/Admin)

```
Utilisateur clique "Partager"
  ↓
ShareInspectionModal s'ouvre
  ↓
Authentification multi-fallback:
  - Essai getSession()
  - Fallback getUser() (service_role)
  - Fallback AsyncStorage
  ↓
Appel RPC create_or_get_inspection_share
  ↓
Token généré (Base64, 16 bytes)
  ↓
Lien construit: https://www.xcrackz.com/rapport-inspection/{token}
  ↓
Affichage avec boutons:
  - Copier (Clipboard)
  - Partager natif (WhatsApp, SMS, Email, etc.)
```

### 2. Consultation du rapport (Client)

```
Client reçoit le lien
  ↓
Clique sur le lien
  ↓
Ouvre dans navigateur OU app mobile
  ↓
PublicInspectionReportShared charge
  ↓
Appel RPC get_inspection_report_by_token
  ↓
SQL récupère:
  - Données mission
  - Véhicule
  - Inspections départ/arrivée
  - Photos (avec ORDER BY inside json_agg)
  - Métadonnées partage
  ↓
Affichage complet du rapport
  ↓
Client peut:
  - Voir toutes les photos
  - Consulter les signatures
  - Voir les équipements/documents
  - [Future] Télécharger ZIP + PDF
```

## 🗄️ Base de Données

### Tables Utilisées (IDENTIQUES AU WEB)

#### inspection_report_shares
```sql
id UUID PRIMARY KEY
mission_id UUID REFERENCES missions(id)
report_type TEXT ('departure' | 'arrival' | 'complete')
share_token TEXT UNIQUE (Base64 16 bytes)
created_by UUID REFERENCES auth.users(id)
created_at TIMESTAMPTZ
expires_at TIMESTAMPTZ (nullable)
is_active BOOLEAN DEFAULT true
access_count INTEGER DEFAULT 0
last_accessed_at TIMESTAMPTZ
```

#### Fonctions RPC

**create_or_get_inspection_share**
- Paramètres: `p_mission_id`, `p_report_type`, `p_user_id`
- Retourne: `{ share_token, created_at, ... }`
- Sécurité: SECURITY DEFINER (nécessite auth)

**get_inspection_report_by_token**
- Paramètres: `p_token`
- Retourne: JSON complet du rapport
- Sécurité: SECURITY DEFINER (accessible publiquement)
- Incrémente: `access_count` et `last_accessed_at`

## 📱 Particularités Mobile

### Partage Natif
Le mobile utilise `Share.share()` d'Expo pour partager via:
- WhatsApp
- SMS
- Email
- Messenger
- Telegram
- etc.

```tsx
const result = await Share.share({
  message: `📄 Rapport d'Inspection\n\nConsultez le rapport complet via ce lien sécurisé:\n${shareLink}`,
  url: shareLink, // iOS seulement
  title: 'Partager le Rapport d\'Inspection',
});
```

### Clipboard
Copie optimisée pour mobile :

```tsx
if (Platform.OS === 'web') {
  await navigator.clipboard.writeText(shareLink);
} else {
  Clipboard.setString(shareLink);
}
```

### Navigation Photos
Modal natif avec gestures :
- Swipe pour fermer
- Boutons prev/next
- Compteur photos
- Zoom (Image resizeMode="contain")

## 🎨 Design Mobile-First

### Adaptations par rapport au Web

| Élément | Web | Mobile |
|---------|-----|--------|
| Layout | Grid 3 colonnes | Stack vertical |
| Cartes | Hover effects | TouchableOpacity |
| Modal | Overlay centré | Bottom sheet |
| Boutons | Buttons | TouchableOpacity |
| Photos | CSS Grid 3-5 cols | Flex wrap 30% width |
| Print | window.print() | ❌ Non disponible |
| ZIP Download | JSZip + saveAs | 🔄 À implémenter avec FileSystem |

### Styles Mobiles

```tsx
Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    elevation: 2,
  },
})
```

## 🔧 Configuration

### Variables d'environnement

Aucune configuration supplémentaire requise. Le système utilise les mêmes credentials Supabase que le reste de l'app.

### Domaine

Dans `ShareInspectionModal.tsx`, modifier si nécessaire :

```tsx
const baseUrl = __DEV__ 
  ? 'http://localhost:5173'  // Dev local
  : 'https://www.xcrackz.com'; // Production
```

## 🚀 Utilisation

### Pour l'utilisateur mobile

1. Ouvrir la liste des rapports d'inspection
2. Cliquer sur le bouton "Partager" d'un rapport
3. Modal s'ouvre avec le lien généré
4. Choisir :
   - **Copier** : Copie le lien pour le coller ailleurs
   - **Partager via...** : Ouvre le menu de partage natif

### Pour le client

1. Recevoir le lien (WhatsApp, SMS, Email)
2. Cliquer dessus
3. S'ouvre dans le navigateur mobile OU l'app
4. Consulter le rapport complet sans connexion

## 📊 Données Affichées

### Mission
- Référence
- Adresse départ/arrivée
- Contacts (nom, téléphone)
- Type véhicule

### Véhicule
- Marque/Modèle
- Plaque d'immatriculation
- Couleur
- VIN

### Métriques
- Convoyeur (nom, téléphone)
- KM parcourus (arrival.mileage_km - departure.mileage_km)
- Temps de livraison (heures)
- Date/heure départ et arrivée

### Inspection (Départ/Arrivée)
- **État véhicule** : Kilométrage, Carburant (/8), Propreté int/ext (/5)
- **Documents** : Carte grise, Assurance, Documents véhicule
- **Équipements** : Roue secours, Cric, Triangle, Trousse secours, Extincteur
- **Photos** : Grid avec modal plein écran
- **Signatures** : Convoyeur + Expéditeur/Réceptionnaire
- **Observations** : Notes textuelles

## 🔐 Sécurité

### Authentification Multi-Fallback

Le système s'adapte à différents contextes d'authentification :

```tsx
// 1. Session normale
const { data: { session } } = await supabase.auth.getSession();

// 2. Service role key
const { data: { user } } = await supabase.auth.getUser();

// 3. Cache local
const storedUser = await AsyncStorage.getItem('xcrackz-user');
```

### RLS Policies

Les mêmes policies que le web :
- `inspection_report_shares` : Accessible uniquement par l'utilisateur créateur
- Fonction RPC publique : SECURITY DEFINER pour bypass RLS
- Token sécurisé : Base64 aléatoire 16 bytes

## 🐛 Debugging

### Logs Console

```tsx
console.log('🔗 Génération lien partage...', { missionId, reportType });
console.log('✅ User ID depuis session:', userId);
console.log('📥 Réponse RPC:', { data, error });
console.log('✅ Lien généré:', fullUrl);
console.log('📊 Données rapport reçues:', data);
console.log('📸 Photos départ:', data.inspection_departure?.photos);
console.log('🔍 Inspection départ complète:', data.inspection_departure);
```

### Erreurs Courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Non authentifié" | Aucune méthode d'auth ne fonctionne | Vérifier session Supabase |
| "Token invalide" | Token expiré ou désactivé | Vérifier `is_active` et `expires_at` |
| Photos vides | Nom de colonne incorrect | Utiliser `mileage_km` pas `mileage` |
| "null/8" carburant | Valeur NULL en base | Normal si inspection non remplie |

## 🔄 Différences Web vs Mobile

### Identiques ✅
- SQL (tables, RPC, policies)
- Flux d'authentification
- Structure des données
- Logique métier
- Noms de champs (mileage_km, fuel_level, etc.)

### Différentes 🔧
- **UI** : React Native vs React DOM
- **Navigation** : React Navigation vs React Router
- **Partage** : Share API native vs navigator.share
- **Clipboard** : Clipboard vs navigator.clipboard
- **Photos** : Image vs img tag
- **Modal** : React Native Modal vs div overlay
- **ZIP Download** : FileSystem API (à venir) vs blob + saveAs

## 📦 Dépendances

```json
{
  "@react-native-async-storage/async-storage": "2.2.0",
  "expo-clipboard": "^8.0.7",
  "expo-file-system": "~19.0.17",
  "expo-sharing": "~14.0.7",
  "jszip": "^3.10.1"
}
```

## 🎯 TODO / Améliorations Futures

### À implémenter
- [ ] ZIP Download avec expo-file-system
- [ ] PDF embarqué dans le ZIP
- [ ] Deep linking pour ouvrir directement dans l'app
- [ ] Notifications push quand rapport consulté
- [ ] Statistiques de consultation
- [ ] QR Code pour partage rapide

### Optimisations
- [ ] Cache des rapports consultés
- [ ] Préchargement des images
- [ ] Pagination des photos
- [ ] Mode hors-ligne (sync)

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs console (🔗, 📊, 📸, 🔍)
2. Tester le SQL dans Supabase SQL Editor
3. Comparer avec la version web fonctionnelle
4. Vérifier les permissions RLS

## ✅ Checklist de Déploiement

- [x] ShareInspectionModal créé
- [x] PublicInspectionReportShared créé
- [x] Route navigation configurée
- [x] Bouton "Partager" ajouté
- [x] SQL identique au web
- [x] Authentification multi-fallback
- [x] Logs debug en place
- [ ] Tests en conditions réelles
- [ ] ZIP download implémenté
- [ ] Documentation utilisateur

---

**Version:** 1.0.0  
**Dernière mise à jour:** 4 novembre 2025  
**Compatibilité:** Identique au système web
