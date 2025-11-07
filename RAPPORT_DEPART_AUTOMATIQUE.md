## 📧 ENVOI AUTOMATIQUE RAPPORT DE DÉPART

**Date:** 7 novembre 2025  
**Fonctionnalité:** Envoyer le rapport d'inspection de départ à l'expéditeur

---

## 🎯 PROBLÉMATIQUE

**Scénario:**
1. Convoyeur arrive chez l'expéditeur
2. Fait l'inspection de départ
3. Valide l'inspection
4. ❌ **Expéditeur n'a pas de copie du rapport**

**Besoin:**
L'expéditeur doit recevoir immédiatement une copie du rapport de départ pour:
- Confirmer l'état du véhicule au départ
- Garder une preuve pour assurance
- Avoir les photos et signatures

---

## ✅ SOLUTION IMPLÉMENTÉE

### 1. Proposition automatique après validation

**Fichier:** `mobile/src/screens/inspections/InspectionDepartureNew.tsx`

**Avant:**
```typescript
Alert.alert('✅ Succès', 'Inspection départ enregistrée !', [
  {
    text: 'OK',
    onPress: () => navigation.goBack(),
  },
]);
```

**Après:**
```typescript
// Si inspection de départ, proposer d'envoyer le rapport à l'expéditeur
if (inspectionType === 'departure') {
  Alert.alert(
    '✅ Inspection enregistrée',
    `${uploadedCount} photos uploadées\n\n📧 Voulez-vous envoyer le rapport de départ à l'expéditeur ?`,
    [
      {
        text: 'Plus tard',
        style: 'cancel',
        onPress: () => navigation.goBack(),
      },
      {
        text: 'Envoyer rapport',
        onPress: () => {
          navigation.navigate('InspectionSendReport', { 
            inspectionId: createdInspection.id,
            inspectionType: 'departure',
            missionId: missionId
          });
        },
      },
    ]
  );
}
```

---

### 2. Nouvel écran d'envoi de rapport

**Fichier:** `mobile/src/screens/inspections/InspectionSendReportScreen.tsx` (423 lignes)

**Fonctionnalités:**

#### A) Envoi par Email
- Pré-rempli avec email expéditeur (si renseigné dans mission)
- Champs personnalisables:
  - Email destinataire *
  - Nom destinataire
  - Votre nom (expéditeur)
- Appel à l'Edge Function Supabase pour génération + envoi

#### B) Téléchargement PDF
- Génère le PDF du rapport de départ seul
- Partage via système natif (WhatsApp, email, etc.)
- Sauvegarde locale optionnelle

#### C) Interface utilisateur
```
┌─────────────────────────────────┐
│  📄  Rapport de Départ          │
│  Renault Master - AB-123-CD     │
├─────────────────────────────────┤
│  📧 Envoyer par email           │
│                                 │
│  Email destinataire *           │
│  [contact@example.com        ]  │
│                                 │
│  Nom destinataire              │
│  [Jean Dupont                ]  │
│                                 │
│  Votre nom                     │
│  [Pierre Martin              ]  │
│                                 │
│  [ 📧 Envoyer le rapport ]     │
├─────────────────────────────────┤
│  📄 Télécharger le PDF          │
│                                 │
│  [ 📥 Télécharger PDF ]        │
├─────────────────────────────────┤
│  [ Plus tard ]                  │
└─────────────────────────────────┘
```

---

## 🔄 FLUX UTILISATEUR

### Scénario 1: Envoi immédiat

1. **Convoyeur** valide inspection départ
2. **Popup** s'affiche: "Envoyer rapport à l'expéditeur ?"
3. **Convoyeur** clique "Envoyer rapport"
4. **Écran d'envoi** s'ouvre avec email pré-rempli
5. **Convoyeur** vérifie/ajuste les infos
6. **Convoyeur** clique "Envoyer le rapport"
7. **Email envoyé** avec PDF en pièce jointe
8. **Confirmation** "Email envoyé à contact@example.com"
9. **Retour** à l'écran précédent

### Scénario 2: Téléchargement PDF

1. **Convoyeur** valide inspection départ
2. **Convoyeur** clique "Envoyer rapport"
3. **Convoyeur** clique "Télécharger PDF"
4. **PDF généré** et partagé via système natif
5. **Convoyeur** peut:
   - Envoyer via WhatsApp
   - Envoyer via email personnel
   - Sauvegarder dans fichiers

### Scénario 3: Plus tard

1. **Convoyeur** valide inspection départ
2. **Convoyeur** clique "Plus tard"
3. **Retour** à l'écran missions
4. **Note:** Possibilité d'envoyer depuis l'historique des rapports

---

## 🛠️ IMPLÉMENTATION TECHNIQUE

### Frontend Mobile

**Nouveau fichier:** `InspectionSendReportScreen.tsx`

**States:**
```typescript
- loading: boolean (chargement données)
- sending: boolean (envoi email en cours)
- generatingPDF: boolean (génération PDF en cours)
- inspection: any (données inspection)
- mission: any (données mission)
- recipientEmail: string
- recipientName: string
- senderName: string
```

**Méthodes principales:**
```typescript
loadInspectionData(): Promise<void>
  → Charge inspection + mission
  → Pré-remplit email/nom depuis contacts mission

handleSendEmail(): Promise<void>
  → Valide email présent
  → Appelle Edge Function send-inspection-report
  → Affiche confirmation

handleGeneratePDF(): Promise<void>
  → Appelle Edge Function generate-inspection-pdf
  → Télécharge blob
  → Convertit en base64
  → Sauvegarde localement
  → Partage via Sharing API
```

---

### Backend (Edge Functions)

**À créer/modifier:**

#### 1. Edge Function: `send-inspection-report`

**Endpoint:** `/functions/v1/send-inspection-report`

**Requête:**
```json
{
  "inspection_id": "uuid",
  "inspection_type": "departure",
  "recipient_email": "contact@example.com",
  "recipient_name": "Jean Dupont",
  "sender_name": "Pierre Martin"
}
```

**Traitement:**
1. Charger inspection + photos + mission
2. Générer PDF avec jsPDF
3. Composer email HTML
4. Attacher PDF
5. Envoyer via service email (Resend/SendGrid)

**Réponse:**
```json
{
  "success": true,
  "message": "Email envoyé à contact@example.com"
}
```

#### 2. Edge Function: `generate-inspection-pdf`

**Endpoint:** `/functions/v1/generate-inspection-pdf`

**Requête:**
```json
{
  "inspection_id": "uuid",
  "inspection_type": "departure"
}
```

**Traitement:**
1. Charger inspection + photos + mission
2. Générer PDF avec jsPDF
3. Retourner blob PDF

**Réponse:**
```
Content-Type: application/pdf
Binary data (PDF)
```

---

## 📧 TEMPLATE EMAIL

**Sujet:**
```
Rapport Inspection Départ - [REFERENCE MISSION] - [MARQUE MODÈLE]
```

**Corps HTML:**
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .header { background: #10b981; color: white; padding: 20px; }
    .content { padding: 20px; }
    .footer { background: #f3f4f6; padding: 15px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📋 Rapport Inspection Départ</h1>
  </div>
  
  <div class="content">
    <p>Bonjour [NOM_DESTINATAIRE],</p>
    
    <p>Veuillez trouver ci-joint le rapport d'inspection de départ pour :</p>
    
    <ul>
      <li><strong>Véhicule:</strong> [MARQUE] [MODÈLE]</li>
      <li><strong>Immatriculation:</strong> [PLAQUE]</li>
      <li><strong>Date:</strong> [DATE_INSPECTION]</li>
      <li><strong>Référence mission:</strong> [REFERENCE]</li>
    </ul>
    
    <p>Ce rapport contient:</p>
    <ul>
      <li>Photos du véhicule (8+ photos)</li>
      <li>État général et détails</li>
      <li>Signatures (convoyeur et expéditeur)</li>
      <li>Kilométrage et carburant</li>
    </ul>
    
    <p>Cordialement,<br>[NOM_EXPEDITEUR]</p>
  </div>
  
  <div class="footer">
    <p style="color: #64748b; font-size: 12px;">
      Ce rapport a été généré automatiquement par l'application Finality
    </p>
  </div>
</body>
</html>
```

---

## 🎨 UI/UX CONSIDÉRATIONS

### Avantages

✅ **Proposition automatique** → pas besoin de chercher dans les menus  
✅ **Email pré-rempli** → gain de temps  
✅ **Choix flexible** → email OU téléchargement OU plus tard  
✅ **Confirmation claire** → feedback immédiat  
✅ **Accessible ultérieurement** → depuis historique des rapports

### Points d'attention

⚠️ **Connexion internet requise** pour envoi email  
⚠️ **Edge Function doit être déployée** côté backend  
⚠️ **Service email configuré** (Resend/SendGrid/SMTP)  
⚠️ **Limites d'envoi** (quotas provider email)

---

## 📊 IMPACT UTILISATEUR

### Avant
- ❌ Inspection validée mais expéditeur sans copie
- ❌ Convoyeur doit noter d'envoyer plus tard
- ❌ Risque d'oubli
- ❌ Pas de preuve immédiate pour expéditeur

### Après
- ✅ Proposition immédiate après validation
- ✅ Email automatique avec PDF joint
- ✅ Expéditeur reçoit preuve instantanée
- ✅ Traçabilité complète
- ✅ Alternative téléchargement si pas d'email

---

## 🚀 DÉPLOIEMENT

### Phase 1: Frontend Mobile ✅

**Fichiers modifiés:**
- `InspectionDepartureNew.tsx` - Proposition après validation
- `InspectionSendReportScreen.tsx` - Nouvel écran d'envoi (CRÉÉ)

**Navigation:**
- Ajouter route `InspectionSendReport` dans `InspectionsNavigator.tsx`

### Phase 2: Backend (À FAIRE)

**Edge Functions à créer:**
1. `send-inspection-report.ts` - Envoi email avec PDF
2. `generate-inspection-pdf.ts` - Génération PDF seul

**Configuration requise:**
- Service email (Resend API key ou SendGrid)
- Template email HTML
- Génération PDF côté serveur (jsPDF)

### Phase 3: Tests

**Scénarios à tester:**
- [ ] Validation inspection départ → popup s'affiche
- [ ] Email pré-rempli avec contact mission
- [ ] Envoi email fonctionne
- [ ] PDF reçu en pièce jointe
- [ ] Téléchargement PDF fonctionne
- [ ] Partage via système natif OK
- [ ] "Plus tard" ferme proprement

---

## 📝 PROCHAINES ÉTAPES

### Immédiat
1. ✅ Modifier `InspectionDepartureNew.tsx` (FAIT)
2. ✅ Créer `InspectionSendReportScreen.tsx` (FAIT)
3. ⏳ Ajouter route navigation
4. ⏳ Tester popup après validation

### Court terme
1. Créer Edge Function `send-inspection-report`
2. Créer Edge Function `generate-inspection-pdf`
3. Configurer service email
4. Tester envoi complet

### Améliorations futures
- Historique des envois
- Renvoyer rapport depuis historique
- Support multi-destinataires
- Template email personnalisable
- Statistiques d'envoi

---

## ✅ STATUS

**Frontend:** ✅ Implémenté  
**Backend:** ⏳ À créer  
**Tests:** ⏳ À effectuer

**Prêt pour:** Commit frontend + création Edge Functions
