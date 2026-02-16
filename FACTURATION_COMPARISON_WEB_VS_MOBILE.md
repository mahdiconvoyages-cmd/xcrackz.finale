# 🧾 Comparaison Facturation - Web vs Mobile

## ⚠️ PROBLÈME IDENTIFIÉ

Il existe **2 fichiers de facturation** dans le mobile :
1. `FacturationScreenComplete.tsx` - Écran vide "Coming Soon" ❌
2. `FacturationScreen.tsx` - Écran fonctionnel mais **incomplet** ⚠️

---

## 📊 COMPARAISON DÉTAILLÉE

| Fonctionnalité | Web (Billing.tsx) | Mobile (FacturationScreen.tsx) | Status |
|---|---|---|---|
| **Affichage factures** | ✅ Liste complète | ✅ Liste basique | ⚠️ Partiel |
| **Affichage devis** | ✅ Liste complète | ✅ Liste basique | ⚠️ Partiel |
| **Création facture/devis** | ✅ Modal complet | ❌ Alert "à venir" | ❌ Manquant |
| **Sélection client** | ✅ ClientSelector | ❌ Pas de sélection | ❌ Manquant |
| **Ajout d'articles** | ✅ Tableau dynamique | ❌ Pas d'articles | ❌ Manquant |
| **Calcul automatique** | ✅ Sous-total/TVA/Total | ❌ Pas de calcul | ❌ Manquant |
| **Génération PDF** | ✅ Téléchargement + Aperçu | ❌ Pas de PDF | ❌ Manquant |
| **Envoi par email** | ✅ Bouton Send | ❌ Pas d'envoi | ❌ Manquant |
| **Changement de statut** | ✅ Menu déroulant | ❌ Pas de changement | ❌ Manquant |
| **Filtres** | ✅ Recherche + Statut | ❌ Pas de filtres | ❌ Manquant |
| **Vérification abonnement** | ✅ SubscriptionRequired | ❌ Pas de vérification | ❌ Manquant |
| **Mentions légales** | ✅ Menu CGV/Politique | ❌ Pas de mentions | ❌ Manquant |

---

## 🔍 ANALYSE FONCTIONNELLE

### ✅ Ce qui fonctionne sur Mobile

1. **Onglets Factures/Devis** - Toggle fonctionnel
2. **Affichage liste** - Cards avec numéro, client, date, montant
3. **Badges de statut** - Couleurs selon draft/paid/pending/overdue
4. **Pull to refresh** - Rechargement des données
5. **État vide** - Message "Aucune facture/devis"

### ❌ Ce qui manque sur Mobile (par rapport au Web)

#### 1. **Modal de création** (943 lignes sur web)

**Web** :
```tsx
<Modal show={showModal}>
  <form onSubmit={handleSubmit}>
    <ClientSelector onClientSelect={setSelectedClient} />
    
    {/* Formulaire complet */}
    <input name="client_name" />
    <input name="client_email" />
    <input name="client_siret" />
    <textarea name="client_address" />
    <input type="date" name="issue_date" />
    <input type="date" name="due_date" />
    
    {/* Tableau d'articles */}
    {items.map((item, index) => (
      <tr>
        <td><input name="description" /></td>
        <td><input type="number" name="quantity" /></td>
        <td><input type="number" name="unit_price" /></td>
        <td><select name="tax_rate" /></td>
        <td>{calculateItemAmount(item)}€</td>
        <td><button onClick={() => removeItem(index)}>×</button></td>
      </tr>
    ))}
    <button onClick={addItem}>+ Ajouter une ligne</button>
    
    {/* Totaux */}
    <div>Sous-total: {calculateSubtotal()}€</div>
    <div>TVA: {calculateTax()}€</div>
    <div>Total: {calculateTotal()}€</div>
    
    <button type="submit">Créer</button>
  </form>
</Modal>
```

**Mobile** :
```tsx
<TouchableOpacity onPress={() => {
  Alert.alert('Nouveau', 'Création de facture/devis à venir'); // ❌
}}>
```

---

#### 2. **Actions sur documents**

**Web** - Chaque document a 4 boutons :
- 👁️ **Aperçu PDF** → Ouvre le PDF dans un nouvel onglet
- 📥 **Télécharger PDF** → Génère et download le PDF
- 📧 **Envoyer par email** → Modal d'envoi
- 🔄 **Changer statut** → Menu déroulant (draft/sent/paid/overdue/cancelled)

**Mobile** :
```tsx
onPress={() => {
  Alert.alert('Facture', `${invoice.invoice_number}\n\nFonctionnalité de détail à venir`);
}}
```

---

#### 3. **Filtres et recherche**

**Web** :
```tsx
<input 
  type="search" 
  placeholder="Rechercher par client, numéro..." 
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
  <option value="all">Tous les statuts</option>
  <option value="draft">Brouillons</option>
  <option value="sent">Envoyées</option>
  <option value="paid">Payées</option>
  <option value="overdue">En retard</option>
</select>

const filteredDocs = docs.filter(doc => {
  const matchesSearch = doc.client_name.toLowerCase().includes(searchTerm) ||
    doc.invoice_number.toLowerCase().includes(searchTerm);
  const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
  return matchesSearch && matchesStatus;
});
```

**Mobile** : ❌ Aucun filtre

---

#### 4. **Génération PDF**

**Web** utilise `pdfGenerator.ts` :
```tsx
const handleDownloadPDF = async (doc) => {
  const { data: docItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', doc.id);

  const html = generateInvoiceHTML({
    number: doc.invoice_number,
    type: 'invoice',
    issueDate: doc.issue_date,
    dueDate: doc.due_date,
    client: {
      name: doc.client_name,
      email: doc.client_email,
      address: doc.client_address,
      siret: doc.client_siret,
    },
    company: {
      name: userProfile.company_name,
      address: userProfile.company_address,
      siret: userProfile.company_siret,
      email: userProfile.email,
    },
    items: docItems,
    subtotal: doc.subtotal,
    taxAmount: doc.tax_amount,
    total: doc.total,
    notes: doc.notes,
    paymentTerms: doc.payment_terms,
  });

  await downloadPDF(html, `facture-${doc.invoice_number}.pdf`);
};
```

**Mobile** : ❌ Pas de génération PDF

---

#### 5. **Vérification d'abonnement**

**Web** :
```tsx
const subscription = useSubscription();

if (!subscription.hasAccess) {
  return <SubscriptionRequired feature="facturation" />;
}
```

**Mobile** : ❌ Pas de vérification

---

## 🎯 RECOMMANDATIONS

### Option 1 : Utiliser FacturationScreen.tsx (recommandé)

**Avantages** :
- Base déjà créée (400 lignes)
- Onglets Factures/Devis fonctionnels
- Affichage liste OK
- Style moderne avec gradient

**Corrections nécessaires** :
1. ✅ Supprimer `FacturationScreenComplete.tsx` (doublon inutile)
2. ❌ Ajouter modal de création avec formulaire complet
3. ❌ Intégrer sélection client
4. ❌ Ajouter tableau d'articles dynamique
5. ❌ Implémenter calculs (sous-total, TVA, total)
6. ❌ Ajouter génération PDF (expo-print + expo-sharing)
7. ❌ Ajouter filtres et recherche
8. ❌ Implémenter changement de statut
9. ❌ Ajouter vérification d'abonnement

---

### Option 2 : Créer une version complète (long terme)

Réécrire complètement le mobile pour avoir **100% de parité** avec le web.

**Estimation** : 1200+ lignes de code

---

## 📋 CHECKLIST DE CRÉATION

### Phase 1 : Modal de création (Priorité HAUTE)

- [ ] Créer `CreateInvoiceModal.tsx` dans `mobile/src/components/`
- [ ] Formulaire client (nom, email, SIRET, adresse)
- [ ] Sélecteur de client existant
- [ ] Dates (émission, échéance/validité)
- [ ] Notes et conditions de paiement

### Phase 2 : Articles (Priorité HAUTE)

- [ ] Tableau d'articles avec :
  - [ ] Description
  - [ ] Quantité
  - [ ] Prix unitaire HT
  - [ ] Taux TVA
  - [ ] Montant calculé
- [ ] Bouton "Ajouter ligne"
- [ ] Bouton "Supprimer ligne"
- [ ] Calculs automatiques :
  - [ ] Sous-total HT
  - [ ] Total TVA
  - [ ] Total TTC

### Phase 3 : Actions (Priorité MOYENNE)

- [ ] Générer PDF avec `expo-print`
- [ ] Télécharger/Partager PDF avec `expo-sharing`
- [ ] Envoyer par email avec `expo-mail-composer`
- [ ] Changer statut (modal avec options)

### Phase 4 : Filtres (Priorité BASSE)

- [ ] Barre de recherche
- [ ] Filtre par statut
- [ ] Filtre par date

### Phase 5 : Abonnement (Priorité MOYENNE)

- [ ] Hook `useSubscription` mobile
- [ ] Composant `SubscriptionRequired` mobile
- [ ] Vérification avant création

---

## 🔧 FICHIERS À MODIFIER/CRÉER

### À supprimer :
- ❌ `mobile/src/screens/FacturationScreenComplete.tsx` (doublon inutile)

### À créer :
1. `mobile/src/components/CreateInvoiceModal.tsx` (Modal de création)
2. `mobile/src/components/InvoiceItemsTable.tsx` (Tableau d'articles)
3. `mobile/src/components/ClientSelectorMobile.tsx` (Sélection client)
4. `mobile/src/services/pdfGeneratorMobile.ts` (Génération PDF mobile)
5. `mobile/src/hooks/useSubscription.ts` (Hook abonnement)

### À modifier :
- `mobile/src/screens/FacturationScreen.tsx` (Ajouter toutes les fonctionnalités)

---

## 📊 ESTIMATION FINALE

| Tâche | Lignes de code | Temps estimé |
|---|---|---|
| Modal création | ~250 lignes | 3h |
| Tableau articles | ~180 lignes | 2h |
| Calculs automatiques | ~50 lignes | 30min |
| Génération PDF | ~200 lignes | 3h |
| Filtres/Recherche | ~80 lignes | 1h |
| Changement statut | ~60 lignes | 1h |
| Vérification abonnement | ~40 lignes | 30min |
| **TOTAL** | **~860 lignes** | **~11h** |

---

## 🚀 CONCLUSION

La page Facturation mobile est **très incomplète** par rapport au web :
- ✅ **Affichage** : 30% complet
- ❌ **Création** : 0% complet
- ❌ **Actions** : 0% complet
- ❌ **Filtres** : 0% complet

**Recommandation** : Compléter `FacturationScreen.tsx` avec toutes les fonctionnalités du web pour avoir une vraie parité.

Voulez-vous que je commence par créer le **Modal de création** ?
