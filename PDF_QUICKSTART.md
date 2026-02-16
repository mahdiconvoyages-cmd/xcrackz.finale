# ⚡ QUICK START - PDF avec Documents & Frais

## 🚀 UTILISATION IMMÉDIATE

### 1. Récupérer inspection avec documents et frais

```typescript
import { supabase } from '../lib/supabase';
import { generateInspectionPDFPro, downloadInspectionPDFPro } from '../services/inspectionPdfGeneratorPro';

// Récupérer inspection complète
const { data: inspection, error } = await supabase
  .from('vehicle_inspections')
  .select(`
    *,
    missions(*),
    photos:inspection_photos_v2(*),
    documents:inspection_documents(*),
    expenses:inspection_expenses(*)
  `)
  .eq('id', inspectionId)
  .single();

if (error) {
  console.error('Erreur récupération:', error);
  return;
}
```

### 2. Générer et télécharger le PDF

```typescript
// Télécharger automatiquement
const success = await downloadInspectionPDFPro(inspection);

if (success) {
  console.log('✅ PDF téléchargé avec documents et frais');
} else {
  console.error('❌ Erreur génération PDF');
}
```

### 3. Ou générer seulement (sans téléchargement)

```typescript
// Pour prévisualiser ou envoyer par email
const { success, blob } = await generateInspectionPDFPro(inspection);

if (success && blob) {
  // Créer URL pour aperçu
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}
```

---

## 📋 CE QUI SERA DANS LE PDF

### Si `inspection.documents` existe:
```
┌────────────────────────────────────────────────┐
│ 📄 Documents Annexes                           │
├──────────────┬──────┬────────┬────────────────┤
│ PV livraison │ 1 p  │ 245 KB │ [Télécharger]  │
│ Constat      │ 3 p  │ 1.2 MB │ [Télécharger]  │
└──────────────┴──────┴────────┴────────────────┘
```

### Si `inspection.expenses` existe:
```
┌────────────────────────────────────────────────┐
│ 💰 Récapitulatif des Frais                     │
├──────────────┬──────────────┬─────────────────┤
│ ⛽ carburant │ Plein Lyon   │ 65.00 €  [Voir] │
│ 🛣️ peage    │ Autoroute    │ 45.50 €  [Voir] │
│ TOTAL        │              │ 110.50 €        │
└──────────────┴──────────────┴─────────────────┘
```

---

## 🔧 MODIFICATION PAGES EXISTANTES

### RapportsInspection.tsx

**Ligne ~182** - Modifier la fonction `handleDownloadPDF`:

```typescript
const handleDownloadPDF = async (report: InspectionReport) => {
  try {
    setGeneratingPDF(true);
    
    if (report.departure_inspection && report.arrival_inspection) {
      // Départ
      const { data: dept } = await supabase
        .from('vehicle_inspections')
        .select(`*, missions(*), documents:inspection_documents(*), expenses:inspection_expenses(*)`)
        .eq('id', report.departure_inspection.id)
        .single();
      
      if (dept) await downloadInspectionPDFPro(dept);

      // Arrivée
      const { data: arr } = await supabase
        .from('vehicle_inspections')
        .select(`*, missions(*), documents:inspection_documents(*), expenses:inspection_expenses(*)`)
        .eq('id', report.arrival_inspection.id)
        .single();
      
      if (arr) await downloadInspectionPDFPro(arr);
      
      toast.success('2 PDF téléchargés (départ + arrivée)');
    } else {
      // Une seule inspection
      const inspection = report.departure_inspection || report.arrival_inspection;
      const { data: fullInsp } = await supabase
        .from('vehicle_inspections')
        .select(`*, missions(*), documents:inspection_documents(*), expenses:inspection_expenses(*)`)
        .eq('id', inspection.id)
        .single();
      
      if (fullInsp) {
        await downloadInspectionPDFPro(fullInsp);
        toast.success('PDF téléchargé');
      }
    }
  } catch (error) {
    console.error('Erreur PDF:', error);
    toast.error('Erreur génération PDF');
  } finally {
    setGeneratingPDF(false);
  }
};
```

### PublicInspectionReport.tsx

**Modifier la récupération des données**:

```typescript
// Ligne ~50
useEffect(() => {
  const fetchInspection = async () => {
    const { data, error } = await supabase
      .from('vehicle_inspections')
      .select(`
        *,
        missions(*),
        photos:inspection_photos_v2(*),
        documents:inspection_documents(*),
        expenses:inspection_expenses(*)
      `)
      .eq('id', inspectionId)
      .single();
    
    if (error) {
      console.error('Erreur:', error);
      return;
    }
    
    setInspection(data);
  };
  
  fetchInspection();
}, [inspectionId]);
```

**Bouton téléchargement PDF**:

```typescript
const handleDownloadPDF = async () => {
  if (!inspection) return;
  
  setGeneratingPDF(true);
  try {
    const success = await downloadInspectionPDFPro(inspection);
    if (success) {
      toast.success('PDF téléchargé avec documents et frais');
    }
  } catch (error) {
    toast.error('Erreur génération PDF');
  } finally {
    setGeneratingPDF(false);
  }
};
```

---

## 📊 STRUCTURE DONNÉES REQUISE

```typescript
interface InspectionData {
  // Champs existants
  id: string;
  inspection_type: 'departure' | 'arrival';
  mileage_km: number;
  fuel_level: number;
  client_name: string;
  client_signature: string;
  driver_name: string;
  driver_signature: string;
  mission: {
    reference: string;
    vehicle_brand: string;
    vehicle_model: string;
    vehicle_plate: string;
  };
  photos: Array<{
    photo_url: string;
    photo_type: string;
  }>;
  
  // NOUVEAU - Optionnel
  documents?: Array<{
    id: string;
    document_title: string;
    document_url: string;
    pages_count: number;
    file_size_kb?: number;
  }>;
  
  expenses?: Array<{
    id: string;
    expense_type: 'carburant' | 'peage' | 'transport' | 'imprevu';
    amount: number;
    description?: string;
    receipt_url?: string;
  }>;
}
```

---

## ✅ CHECKLIST INTÉGRATION

- [ ] Modifier requête Supabase pour inclure `documents` et `expenses`
- [ ] Tester PDF sans documents ni frais (doit fonctionner normalement)
- [ ] Tester PDF avec documents uniquement
- [ ] Tester PDF avec frais uniquement
- [ ] Tester PDF avec documents ET frais
- [ ] Vérifier liens cliquables dans Adobe Reader
- [ ] Vérifier calcul total des frais correct
- [ ] Tester pagination si beaucoup de documents/frais (>10)

---

## 🐛 DÉPANNAGE

### Problème: Section vide apparaît
**Cause**: `documents: []` ou `expenses: []` (array vide)  
**Solution**: La logique vérifie `array.length > 0`, devrait être OK

### Problème: Liens ne fonctionnent pas
**Cause**: URLs Supabase pas publiques  
**Solution**: Vérifier RLS policies Storage + URLs signées si nécessaire

### Problème: Total frais incorrect
**Cause**: Montants en string au lieu de number  
**Solution**: Convertir avec `parseFloat(amount)` ou `Number(amount)`

### Problème: PDF ne se génère pas
**Cause**: Erreur TypeScript ou données manquantes  
**Solution**: Vérifier console pour erreurs, s'assurer que `inspection` n'est pas null

---

## 🎨 PERSONNALISATION

### Changer les icônes des frais

```typescript
// Ligne ~620 dans inspectionPdfGeneratorPro.ts
const expenseIcons: Record<string, string> = {
  carburant: '⛽',  // Modifier ici
  peage: '🛣️',
  transport: '🚌',
  imprevu: '❗'
};
```

### Changer couleur des liens

```typescript
// Ligne ~520
doc.setTextColor(0, 102, 204); // Bleu par défaut
// Remplacer par:
doc.setTextColor(255, 0, 0); // Rouge
```

### Ajouter une colonne dans les tableaux

```typescript
// Documents - Ligne ~490
const docColWidths = [80, 30, 25, 50]; // Largeurs actuelles
// Ajouter une colonne:
const docColWidths = [60, 30, 25, 30, 50]; // Total = pageWidth - 2*margin

// Ajouter header et données correspondants
```

---

## 📞 SUPPORT

**Fichier modifié**: `src/services/inspectionPdfGeneratorPro.ts`  
**Documentation complète**: `PDF_DOCUMENTS_FRAIS_COMPLETE.md`  
**Tables SQL**: `ADD_INSPECTION_DOCUMENTS_EXPENSES.sql`

**Tout fonctionne dès maintenant sur WEB** ✅  
Pour mobile, adapter `mobile/src/services/comparisonPdfGenerator.ts` (HTML version)
