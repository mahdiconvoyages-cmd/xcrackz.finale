# ✅ INSPECTION ARRIVÉE - DOCUMENTS & FRAIS - 2025-11-07

## 🎯 Objectifs accomplis

### 1. ✅ Tables SQL créées
**Fichier**: `ADD_INSPECTION_DOCUMENTS_EXPENSES.sql`

#### Table `inspection_documents`
```sql
CREATE TABLE inspection_documents (
  id UUID PRIMARY KEY,
  inspection_id UUID REFERENCES vehicle_inspections(id),
  document_type TEXT, -- 'delivery_receipt', 'damage_report', 'other'
  document_title TEXT NOT NULL,
  document_url TEXT NOT NULL, -- URL du PDF scanné
  pages_count INTEGER DEFAULT 1,
  file_size_kb INTEGER,
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Table `inspection_expenses`
```sql
CREATE TABLE inspection_expenses (
  id UUID PRIMARY KEY,
  inspection_id UUID REFERENCES vehicle_inspections(id),
  expense_type TEXT CHECK (expense_type IN ('carburant', 'peage', 'transport', 'imprevu')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  receipt_url TEXT, -- URL du justificatif scanné
  receipt_pages_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Storage Bucket
- `inspection-documents` créé pour stocker PDF et justificatifs
- Policies RLS configurées (SELECT, INSERT, DELETE pour authenticated)

#### RLS Policies
- `inspection_documents`: Accès limité au créateur de la mission ou assigné
- `inspection_expenses`: Accès limité au créateur de la mission ou assigné

---

## 📱 MOBILE - InspectionArrivalNewDedicated.tsx

### ✅ Fichier créé
**Chemin**: `mobile/src/screens/inspections/InspectionArrivalNewDedicated.tsx`

### 🔑 Fonctionnalités implémentées

#### Étape 1: Photos (8 obligatoires)
- 6 vues extérieures
- Tableau de bord
- Intérieur véhicule
- ❌ **RETIRÉ**: Photos optionnelles intérieur (maintenant obligatoires)

#### Étape 2: Documents scannés
```typescript
interface ScannedDocument {
  id: string;
  title: string; // "PV de livraison", "Constat dommages"
  uri: string;
  pages: string[]; // URIs des pages
  pagesCount: number;
}
```

**Fonctionnalités**:
- Bouton "Scanner un document"
- Demande du titre avant scan
- Utilise `CamScannerLikeScanner` (scanner intégré ML)
- Génère un PDF multi-pages
- Upload vers `inspection-documents` bucket
- Enregistrement dans `inspection_documents` table

**Code clé**:
```typescript
const handleDocumentScanned = async (scannedPageUri: string) => {
  const newDoc: ScannedDocument = {
    id: `doc-${Date.now()}`,
    title: currentDocTitle || `Document ${scannedDocuments.length + 1}`,
    uri: scannedPageUri,
    pages: [scannedPageUri],
    pagesCount: 1,
  };
  setScannedDocuments((prev) => [...prev, newDoc]);
};

// Génération PDF
const generatePDFFromPages = async (pages: string[], title: string) => {
  const imagesHtml = pages.map((uri) => 
    `<img src="${uri}" style="width:100%; page-break-after:always;"/>`
  ).join('');
  
  const html = `<html><body>${imagesHtml}</body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
};
```

#### Étape 3: Frais de mission
```typescript
interface Expense {
  id: string;
  type: 'carburant' | 'peage' | 'transport' | 'imprevu';
  amount: string;
  description: string;
  receiptUri: string | null; // Justificatif scanné
}
```

**Types de frais**:
- ⛽ **Carburant**: Essence, diesel
- 🛣️ **Péage**: Autoroutes
- 🚌 **Transport**: Train, taxi
- ❗ **Imprévu**: Autres frais

**Fonctionnalités**:
- Modal d'ajout de frais
- Sélection du type (Picker)
- Montant en euros (2 décimales)
- Description optionnelle
- Scanner justificatif avec `CamScannerLikeScanner`
- Conversion justificatif en PDF
- Upload vers `inspection-documents`
- Total automatique des frais

**Code clé**:
```typescript
const handleSaveExpense = () => {
  const newExpense: Expense = {
    id: `exp-${Date.now()}`,
    type: newExpenseType,
    amount: parseFloat(newExpenseAmount).toFixed(2),
    description: newExpenseDesc.trim(),
    receiptUri: newExpenseReceipt,
  };
  setExpenses((prev) => [...prev, newExpense]);
};
```

#### Étape 4: Signatures
- Nom du client *
- Signature du client *
- Nom du convoyeur *
- Signature du convoyeur *

#### 🗑️ Champs RETIRÉS (comparé au départ)
- ❌ Nombre de clés (`keys_count`)
- ❌ Documents véhicule (`has_vehicle_documents`)
- ❌ Carte grise (`has_registration_card`)
- ❌ Réservoir plein (`vehicle_is_full`)
- ❌ Pare-brise (`windshield_condition`)
- ❌ Propreté (`external_cleanliness`, `internal_cleanliness`)
- ❌ Roue de secours (`has_spare_wheel`)
- ❌ Kit réparation (`has_repair_kit`)
- ❌ Conditions photo (`photo_time`, `photo_location`, `photo_weather`)
- ❌ État général (`condition`)

#### ✅ Champs CONSERVÉS (essentiels à l'arrivée)
- ✅ Photos (8 obligatoires)
- ✅ Documents scannés (nouveau)
- ✅ Frais de mission (nouveau)
- ✅ Kilométrage
- ✅ Niveau carburant
- ✅ Notes
- ✅ Nom client + signature
- ✅ Nom convoyeur + signature

---

### 🔄 Flux de sauvegarde (handleSubmit)

```typescript
async handleSubmit() {
  // 1. Créer inspection arrivée
  const inspection = await supabase
    .from('vehicle_inspections')
    .insert({
      mission_id,
      inspector_id: user.id,
      inspection_type: 'arrival',
      fuel_level: parseInt(fuelLevel),
      mileage_km: parseInt(mileage),
      notes,
      client_name: clientName,
      client_signature: clientSignature,
      driver_name: driverName,
      driver_signature: driverSignature,
      status: 'completed',
    });

  // 2. Upload photos (8)
  for (const photo of photos) {
    // Upload vers inspection-photos bucket
    // Insert dans inspection_photos_v2
  }

  // 3. Upload documents scannés
  for (const doc of scannedDocuments) {
    // Générer PDF multi-pages
    const pdfUri = await generatePDFFromPages(doc.pages, doc.title);
    
    // Upload PDF vers inspection-documents bucket
    // Insert dans inspection_documents table
  }

  // 4. Enregistrer frais
  for (const expense of expenses) {
    // Si justificatif présent, upload vers inspection-documents
    
    // Insert dans inspection_expenses table
    await supabase.from('inspection_expenses').insert({
      inspection_id,
      expense_type: expense.type,
      amount: parseFloat(expense.amount),
      description: expense.description,
      receipt_url: receiptUrl,
    });
  }

  // 5. Marquer mission comme terminée
  await supabase.from('missions')
    .update({ arrival_inspection_completed: true })
    .eq('id', missionId);
}
```

---

## 🌐 WEB - InspectionArrivalNew.tsx

### ⏳ TODO (Non implémenté - besoin upload fichiers)

#### Étape 2: Upload documents
Au lieu du scanner mobile, utiliser:
```tsx
<input 
  type="file" 
  accept="application/pdf,image/*" 
  multiple 
  onChange={handleDocumentUpload}
/>
```

#### Étape 3: Frais
Identique au mobile mais avec:
- Upload fichier justificatif au lieu de scanner
- `<input type="file" accept="image/*,application/pdf" />`

**Code à ajouter**:
```tsx
const [documents, setDocuments] = useState<File[]>([]);
const [expenses, setExpenses] = useState<Expense[]>([]);

const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  setDocuments(prev => [...prev, ...files]);
};

const handleExpenseReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setNewExpenseReceipt(file);
  }
};
```

---

## 📊 Base de données - Schéma complet

```
vehicle_inspections (inspection d'arrivée)
  ├─ id (UUID)
  ├─ mission_id (FK → missions)
  ├─ inspector_id (FK → profiles)
  ├─ inspection_type = 'arrival'
  ├─ mileage_km (INTEGER)
  ├─ fuel_level (INTEGER)
  ├─ notes (TEXT)
  ├─ client_name (TEXT)
  ├─ client_signature (TEXT base64)
  ├─ driver_name (TEXT)
  ├─ driver_signature (TEXT base64)
  ├─ status = 'completed'
  └─ completed_at (TIMESTAMPTZ)

inspection_photos_v2 (8 photos)
  ├─ id (UUID)
  ├─ inspection_id (FK → vehicle_inspections)
  ├─ photo_type (TEXT)
  ├─ full_url (TEXT)
  └─ taken_at (TIMESTAMPTZ)

inspection_documents (nouveaux documents scannés)
  ├─ id (UUID)
  ├─ inspection_id (FK → vehicle_inspections)
  ├─ document_type (TEXT: delivery_receipt, damage_report, other)
  ├─ document_title (TEXT: "PV livraison", "Constat")
  ├─ document_url (TEXT: https://.../*.pdf)
  ├─ pages_count (INTEGER)
  └─ scanned_at (TIMESTAMPTZ)

inspection_expenses (nouveaux frais)
  ├─ id (UUID)
  ├─ inspection_id (FK → vehicle_inspections)
  ├─ expense_type (TEXT: carburant, peage, transport, imprevu)
  ├─ amount (NUMERIC(10,2))
  ├─ description (TEXT)
  ├─ receipt_url (TEXT: URL du justificatif)
  └─ created_at (TIMESTAMPTZ)
```

---

## 🔐 Sécurité (RLS)

### inspection_documents
```sql
-- SELECT: Voir ses propres documents ou ceux des missions assignées
CREATE POLICY "Documents - SELECT own or assigned"
ON inspection_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM vehicle_inspections vi
    JOIN missions m ON m.id = vi.mission_id
    WHERE vi.id = inspection_documents.inspection_id
      AND (m.user_id = auth.uid() OR m.assigned_to_user_id = auth.uid())
  )
);

-- INSERT: Créer documents pour ses missions
-- DELETE: Supprimer documents pour ses missions
```

### inspection_expenses
```sql
-- SELECT/INSERT/UPDATE/DELETE: Mêmes règles que documents
```

### Storage (inspection-documents bucket)
```sql
-- INSERT: Authenticated users peuvent uploader
-- SELECT: Tous les authenticated peuvent lire
-- DELETE: Authenticated users peuvent supprimer leurs fichiers
```

---

## 🎨 UI/UX Mobile

### Étape 2: Documents
```
┌─────────────────────────────────────┐
│  📄 Documents à scanner             │
│  PV de livraison, constats, etc.    │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  📷 Scanner un document        │ │ ← Bouton bleu
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  📄 PV de livraison            │ │
│  │  1 page                     🗑️ │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  📄 Constat dommages           │ │
│  │  3 pages                    🗑️ │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Étape 3: Frais
```
┌─────────────────────────────────────┐
│  💰 Frais de mission                │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  ➕ Ajouter un frais           │ │ ← Bouton vert
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  ⛽ Autoroute A6                │ │
│  │  45.50€ • Justificatif ✓   🗑️  │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🛣️ Péage Lyon-Paris           │ │
│  │  28.00€                     🗑️  │ │
│  └───────────────────────────────┘ │
│                                     │
│  ─────────────────────────────────  │
│  Total:                    73.50€  │
│                                     │
│  📍 Kilométrage *                   │
│  [50000____________]                │
│                                     │
│  ⛽ Niveau carburant: 50%            │
│  [  0%  ────●────  100%  ]         │
└─────────────────────────────────────┘
```

### Modal Ajout Frais
```
┌─────────────────────────────────────┐
│  Ajouter un frais              ✕    │
│                                     │
│  Type de frais                      │
│  [⛽ Carburant         ▼]            │
│                                     │
│  Montant (€) *                      │
│  [45.50____________]                │
│                                     │
│  Description                        │
│  [Autoroute A6 Paris-Lyon_______]  │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  📷 Scanner un justificatif    │ │
│  └───────────────────────────────┘ │
│     ✓ Justificatif scanné          │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Enregistrer le frais          │ │ ← Bouton vert
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 📋 Checklist d'implémentation

### ✅ Complété
- [x] Créer tables SQL (`inspection_documents`, `inspection_expenses`)
- [x] Créer bucket Storage (`inspection-documents`)
- [x] Configurer RLS policies (documents + expenses)
- [x] Créer `InspectionArrivalNewDedicated.tsx` mobile
- [x] Intégrer `CamScannerLikeScanner` pour documents
- [x] Intégrer `CamScannerLikeScanner` pour justificatifs frais
- [x] Générer PDF multi-pages depuis images scannées
- [x] Upload documents vers Storage
- [x] Enregistrer documents dans DB
- [x] Formulaire frais avec 4 types
- [x] Upload justificatifs frais
- [x] Enregistrer frais dans DB
- [x] Retirer champs optionnels (clés, documents, etc.)
- [x] Garder uniquement essentiels (photos, km, carburant, signatures)
- [x] Mise à jour `InspectionArrivalNew.tsx` pour utiliser nouveau composant

### ⏳ TODO
- [ ] Exécuter `ADD_INSPECTION_DOCUMENTS_EXPENSES.sql` dans Supabase
- [ ] Tester scan document mobile
- [ ] Tester ajout frais mobile
- [ ] Tester génération PDF documents
- [ ] Tester upload justificatifs
- [ ] Modifier version WEB pour upload fichiers (pas de scanner)
- [ ] Ajouter documents/frais dans rapport PDF final
- [ ] Permettre consultation/téléchargement indépendant des documents dans rapport
- [ ] Tests end-to-end inspection arrivée complète

---

## 🚀 Utilisation

### Mobile
1. Ouvrir mission en cours
2. Cliquer "Inspection Arrivée"
3. **Étape 1**: Capturer 8 photos obligatoires
4. **Étape 2**: Scanner documents (PV livraison, constats)
5. **Étape 3**: Ajouter frais (carburant, péages, etc.) avec justificatifs
6. **Étape 4**: Signatures client + convoyeur
7. Terminer → Upload automatique vers Supabase

### Données sauvegardées
```json
{
  "inspection": {
    "type": "arrival",
    "mileage_km": 50000,
    "fuel_level": 75,
    "client_name": "Jean Dupont",
    "driver_name": "Marc Martin"
  },
  "photos": 8, // dans inspection_photos_v2
  "documents": [
    {
      "title": "PV de livraison",
      "url": "https://.../*.pdf",
      "pages": 1
    },
    {
      "title": "Constat dommages pare-choc",
      "url": "https://.../*.pdf",
      "pages": 3
    }
  ],
  "expenses": [
    {
      "type": "peage",
      "amount": 45.50,
      "description": "Autoroute A6",
      "receipt_url": "https://.../*.pdf"
    },
    {
      "type": "carburant",
      "amount": 65.00,
      "description": "Plein essence",
      "receipt_url": "https://.../*.pdf"
    }
  ],
  "total_expenses": 110.50
}
```

---

## 🎯 Avantages

### Pour le convoyeur
- 📸 Scanner professionnel ML intégré (comme CamScanner)
- 💰 Saisie frais en temps réel avec justificatifs
- 📄 Documents numérisés automatiquement
- ✅ Formulaire simplifié (retrait champs inutiles)
- 🚀 Process rapide et fluide

### Pour l'administrateur
- 📊 Traçabilité complète des frais
- 📄 Documents consultables dans rapport
- 💾 Tout centralisé dans Supabase
- 🔐 Sécurisé avec RLS
- 📈 Rapports financiers facilitrés

### Pour le client
- 📄 Accès aux documents scannés
- 💰 Transparence sur les frais
- 📥 Téléchargement indépendant des documents
- 📧 Rapport PDF complet avec annexes

---

## 🔧 Prochaines étapes

1. **Exécuter SQL**: Lancer `ADD_INSPECTION_DOCUMENTS_EXPENSES.sql`
2. **Tester Mobile**: Faire inspection arrivée complète
3. **Version Web**: Ajouter upload fichiers au lieu de scanner
4. **Rapport PDF**: Inclure documents et frais dans génération PDF
5. **Download**: Permettre téléchargement indépendant de chaque document

---

## 📝 Notes techniques

### Génération PDF multi-pages
```typescript
// Combine plusieurs images en un seul PDF
const generatePDFFromPages = async (pages: string[], title: string) => {
  const imagesHtml = pages
    .map((uri) => `<img src="${uri}" style="width:100%; page-break-after:always;"/>`)
    .join('');
  
  const html = `
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
      </head>
      <body style="margin:0; padding:0;">
        ${imagesHtml}
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  return uri;
};
```

### Upload vers Supabase Storage
```typescript
// Convert image/PDF to base64 then upload
const response = await fetch(localUri);
const arrayBuffer = await response.arrayBuffer();
const bytes = new Uint8Array(arrayBuffer);
let binary = '';
for (let i = 0; i < bytes.byteLength; i++) {
  binary += String.fromCharCode(bytes[i]);
}
const base64 = btoa(binary);

await supabase.storage
  .from('inspection-documents')
  .upload(filePath, decode(base64), {
    contentType: 'application/pdf',
    upsert: false,
  });
```

---

## ✅ Récapitulatif final

| Élément | Status | Détails |
|---------|--------|---------|
| Tables SQL | ✅ | `inspection_documents` + `inspection_expenses` |
| Storage | ✅ | Bucket `inspection-documents` |
| RLS | ✅ | Policies sur documents + expenses |
| Mobile Arrivée | ✅ | `InspectionArrivalNewDedicated.tsx` |
| Scanner Documents | ✅ | Intégration `CamScannerLikeScanner` |
| Frais | ✅ | 4 types + justificatifs scannables |
| PDF Multi-pages | ✅ | Génération avec expo-print |
| Upload | ✅ | Documents + justificatifs vers Storage |
| Champs retirés | ✅ | Clés, documents véhicule, etc. |
| Web | ⏳ | À faire: upload fichiers |
| Rapport PDF | ⏳ | À faire: inclure documents/frais |

