# 📸 Guide d'Utilisation - Document Scanner Web

## 🎯 Fonctionnalités

Le scanner de documents Dynamsoft offre :

✅ **Détection automatique des bords** - Identifie les contours du document  
✅ **Correction de perspective** - Redresse automatiquement le document  
✅ **Amélioration d'image** - Contraste et netteté optimisés  
✅ **Interface guidée** - Cadre de visée pour un positionnement optimal  
✅ **Prévisualisation** - Vérification avant validation  

## 📦 Installation

```bash
npm install dynamsoft-document-normalizer dynamsoft-core dynamsoft-license dynamsoft-capture-vision-router
```

## 🚀 Utilisation

### Exemple 1: Scanner une carte grise

```typescript
import { useState } from 'react';
import DocumentScanner from '../components/inspection/DocumentScanner';

function MyComponent() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);

  const handleCapture = (file: File) => {
    setScannedFile(file);
    setShowScanner(false);
    // Uploader le fichier ou l'afficher
  };

  return (
    <>
      <button onClick={() => setShowScanner(true)}>
        Scanner Carte Grise
      </button>

      {showScanner && (
        <DocumentScanner
          onCapture={handleCapture}
          onCancel={() => setShowScanner(false)}
          documentType="registration"
          title="Scanner la Carte Grise"
        />
      )}
    </>
  );
}
```

### Exemple 2: Scanner une assurance

```typescript
<DocumentScanner
  onCapture={handleCapture}
  onCancel={handleClose}
  documentType="insurance"
  title="Scanner l'Attestation d'Assurance"
/>
```

### Exemple 3: Scanner un PV de livraison

```typescript
<DocumentScanner
  onCapture={handleCapture}
  onCancel={handleClose}
  documentType="receipt"
  title="Scanner le PV de Livraison"
/>
```

## 🔧 Props du Composant

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `onCapture` | `(file: File) => void` | ✅ | Callback appelé avec le fichier scanné |
| `onCancel` | `() => void` | ✅ | Callback appelé lors de l'annulation |
| `documentType` | `'registration' \| 'insurance' \| 'receipt' \| 'generic'` | ❌ | Type de document (pour UI) |
| `title` | `string` | ❌ | Titre personnalisé |

## 📝 Types de Documents Supportés

- **registration** : Carte grise
- **insurance** : Attestation d'assurance  
- **receipt** : PV de livraison/restitution
- **generic** : Document générique

## 🎨 Personnalisation

Le scanner utilise automatiquement les couleurs de ton thème :
- Couleur primaire : `#14B8A6` (Teal)
- Détection des bords en temps réel
- Guide visuel pour le cadrage optimal

## 🔐 License

Le composant utilise une license de test publique Dynamsoft.

**Pour la production**, obtiens une license sur :
👉 https://www.dynamsoft.com/customer/license/trialLicense

Remplace la license dans `DocumentScanner.tsx` ligne 53 :
```typescript
await LicenseManager.initLicense('TA_NOUVELLE_LICENSE_ICI');
```

## ⚡ Performance

- Détection en temps réel : ~30ms
- Traitement d'image : ~100-200ms
- Format de sortie : JPEG optimisé (qualité 95%)
- Taille moyenne : 200-500KB par document

## 🐛 Résolution de Problèmes

### La caméra ne démarre pas
- Vérifier les permissions navigateur
- HTTPS requis (ou localhost)
- Vérifier que la caméra n'est pas utilisée ailleurs

### La détection ne fonctionne pas
- Améliorer l'éclairage
- Positionner le document dans le cadre
- Éviter les reflets et ombres

### Erreur de license
- Vérifier la connexion internet lors de l'initialisation
- Utiliser une license valide pour la production

## 📱 Compatibilité

- ✅ Chrome/Edge (recommandé)
- ✅ Firefox
- ✅ Safari (iOS 14.3+)
- ✅ Responsive (mobile & desktop)

## 💡 Astuces

1. **Éclairage** : Utiliser un bon éclairage naturel ou artificiel
2. **Contraste** : Fond uni différent du document
3. **Stabilité** : Maintenir le téléphone stable pendant la capture
4. **Distance** : Document bien visible dans le cadre (marges)

## 🔗 Ressources

- [Documentation Dynamsoft](https://www.dynamsoft.com/document-normalizer/docs/)
- [API Reference](https://www.dynamsoft.com/document-normalizer/docs/web/programming/javascript/)
- [Exemples](https://github.com/Dynamsoft/document-normalizer-javascript-samples)
