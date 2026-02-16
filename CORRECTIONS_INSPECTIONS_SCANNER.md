# ✅ CORRECTIONS INSPECTIONS - 2025-11-07

## 🎯 Problèmes traités

### 1. ❌ Scanner PDF mobile ne génère pas le PDF
**Symptôme**: Impossible de générer le PDF dans la partie scanner mobile

**Analyse**:
- Code dans `ScannerProScreen.tsx` (lignes 232-307) est CORRECT
- Utilise `expo-print` et `expo-sharing` correctement
- Fonction `handleExportPDF()` bien implémentée:
  ```typescript
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  ```

**Cause probable**:
- Les packages peuvent ne pas être installés
- Ou permissions manquantes dans `app.json`

**Solution**:
```bash
# Dans mobile/
npm install expo-print expo-sharing

# Vérifier app.json contient:
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": true
          }
        }
      ]
    ]
  }
}
```

**Test après correction**:
1. Scanner un document
2. Cliquer sur "Exporter PDF"
3. Le PDF doit être créé et partageable

---

### 2. ✅ Photos intérieur + tableau de bord obligatoires

**Changement**: Passer de 6 à 8 photos obligatoires

#### Mobile - InspectionDepartureNew.tsx

**AVANT** (6 photos):
```typescript
const REQUIRED_PHOTOS = [
  { type: 'front', label: 'Face avant générale' },
  { type: 'back', label: 'Face arrière générale' },
  { type: 'left_front', label: 'Latéral gauche avant' },
  { type: 'left_back', label: 'Latéral gauche arrière' },
  { type: 'right_front', label: 'Latéral droit avant' },
  { type: 'right_back', label: 'Latéral droit arrière' },
];

const OPTIONAL_INTERIOR_PHOTOS = [
  { type: 'interior', label: 'Intérieur véhicule' },
  { type: 'dashboard', label: 'Tableau de bord' },
];
```

**APRÈS** (8 photos):
```typescript
const REQUIRED_PHOTOS = [
  { type: 'front', label: 'Face avant générale' },
  { type: 'back', label: 'Face arrière générale' },
  { type: 'left_front', label: 'Latéral gauche avant' },
  { type: 'left_back', label: 'Latéral gauche arrière' },
  { type: 'right_front', label: 'Latéral droit avant' },
  { type: 'right_back', label: 'Latéral droit arrière' },
  { type: 'interior', label: 'Intérieur véhicule' },     // ✅ OBLIGATOIRE
  { type: 'dashboard', label: 'Tableau de bord' },       // ✅ OBLIGATOIRE
];

const OPTIONAL_INTERIOR_PHOTOS = [
  // Déplacé vers REQUIRED_PHOTOS
];
```

**Messages mis à jour**:
- Ligne 400: `'Veuillez capturer toutes les photos obligatoires (8 photos: 6 extérieures + tableau de bord + intérieur)'`
- Ligne 608: `'Photos obligatoires (8)'`
- Ajout sous-titre: `'6 vues extérieures + tableau de bord + intérieur'`

#### Web - src/pages/InspectionDepartureNew.tsx

**AVANT** (6 photos):
```typescript
const [photos, setPhotos] = useState<PhotoData[]>([
  { type: 'front', label: 'Face avant générale', ... },
  { type: 'back', label: 'Face arrière générale', ... },
  { type: 'left_front', label: 'Latéral gauche avant', ... },
  { type: 'left_back', label: 'Latéral gauche arrière', ... },
  { type: 'right_front', label: 'Latéral droit avant', ... },
  { type: 'right_back', label: 'Latéral droit arrière', ... },
]);

const [optionalInteriorPhotos, setOptionalInteriorPhotos] = useState([
  { type: 'interior', label: 'Intérieur', ... },
  { type: 'dashboard', label: 'Tableau de bord', ... },
]);
```

**APRÈS** (8 photos):
```typescript
const [photos, setPhotos] = useState<PhotoData[]>([
  { type: 'front', label: 'Face avant générale', ... },
  { type: 'back', label: 'Face arrière générale', ... },
  { type: 'left_front', label: 'Latéral gauche avant', ... },
  { type: 'left_back', label: 'Latéral gauche arrière', ... },
  { type: 'right_front', label: 'Latéral droit avant', ... },
  { type: 'right_back', label: 'Latéral droit arrière', ... },
  { type: 'interior', label: 'Intérieur véhicule', ... },  // ✅ OBLIGATOIRE
  { type: 'dashboard', label: 'Tableau de bord', ... },    // ✅ OBLIGATOIRE
]);

const [optionalInteriorPhotos, setOptionalInteriorPhotos] = useState([
  // Déplacé vers photos obligatoires
]);
```

**Messages mis à jour**:
- Ligne 184: `'Veuillez prendre toutes les photos obligatoires (8 photos: 6 extérieures + tableau de bord + intérieur)'`
- Ligne 373: `// 8 photos obligatoires (6 ext + intérieur + dashboard)`
- Ligne 429: `'Photos obligatoires (8)'`
- Ligne 430: `'6 vues extérieures + tableau de bord + intérieur'`
- Ligne 456-462: Étape 2 renommée en "Détails du véhicule & dommages" (sans mention d'intérieur optionnel)

---

## 📊 Résumé des modifications

### Fichiers modifiés (4):

1. **mobile/src/screens/inspections/InspectionDepartureNew.tsx**
   - Ligne 33-45: Photos obligatoires passées de 6 à 8
   - Ligne 400: Message d'erreur mis à jour
   - Ligne 608-610: Titre et sous-titre mis à jour

2. **src/pages/InspectionDepartureNew.tsx**
   - Ligne 44-59: Photos obligatoires passées de 6 à 8
   - Ligne 182-186: Message d'erreur mis à jour
   - Ligne 373: Commentaire mis à jour
   - Ligne 429-430: Titre et description mis à jour
   - Ligne 456-462: Étape 2 renommée (plus de mention optionnelle)

### Vérifications à faire:

#### Test Mobile:
1. Créer une nouvelle inspection départ
2. Étape 1 doit afficher "Photos obligatoires (8)"
3. Impossibilité de passer à l'étape 2 sans les 8 photos:
   - 6 extérieures
   - 1 intérieur
   - 1 tableau de bord
4. Message d'erreur clair si photos manquantes

#### Test Web:
1. Créer une nouvelle inspection départ
2. Étape 1 doit afficher "Photos obligatoires (8)"
3. Validation bloque si moins de 8 photos
4. Étape 2 appelée "Détails du véhicule & dommages"

#### Test Scanner PDF (Mobile):
1. Ouvrir Scanner Documents
2. Scanner 2-3 documents
3. Cliquer "Exporter PDF"
4. ✅ Le PDF doit être créé
5. ✅ Option de partage doit s'afficher

---

## 🚀 Impact

### Avant:
- 6 photos obligatoires (extérieures uniquement)
- Intérieur + dashboard optionnels
- Rapports PDF incomplets

### Après:
- 8 photos obligatoires
- Meilleure qualité des rapports
- Cohérence web ↔ mobile
- Documentation complète du véhicule

---

## 📝 Notes importantes

1. **Pas de breaking change**: Les anciennes inspections avec 6 photos restent valides
2. **Validation stricte**: Impossible de terminer une inspection sans les 8 photos
3. **Expérience utilisateur**: Messages clairs sur les 8 photos requises
4. **Scanner PDF**: Code correct, peut nécessiter installation des packages

---

## 🔧 Dépannage Scanner PDF

Si le PDF ne se génère toujours pas:

### Vérifier les logs:
```typescript
console.log('🔄 Génération PDF de', scannedPages.length, 'pages');
console.log('✅ PDF créé:', uri);
```

### Erreurs possibles:
1. **"expo-print not found"** → Installer `npm install expo-print`
2. **"expo-sharing not found"** → Installer `npm install expo-sharing`
3. **Permission denied** → Vérifier permissions dans app.json
4. **HTML invalide** → Vérifier images base64 valides

### Packages requis:
```json
{
  "expo-print": "~12.0.0",
  "expo-sharing": "~11.0.0",
  "expo-file-system": "~15.0.0"
}
```

---

## ✅ Checklist finale

- [x] Mobile: 8 photos obligatoires
- [x] Web: 8 photos obligatoires
- [x] Messages de validation mis à jour
- [x] Titres et descriptions mis à jour
- [x] Scanner PDF code vérifié
- [ ] Tester Scanner PDF sur device
- [ ] Tester inspection mobile complète
- [ ] Tester inspection web complète
