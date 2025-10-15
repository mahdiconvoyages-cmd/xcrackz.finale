# 📋 Guide TVA et Mentions Légales

## 🎯 Fonctionnalité

Le système de facturation permet maintenant de gérer la TVA de manière **optionnelle** selon votre régime fiscal français, avec des **mentions légales automatiques** conformes à la réglementation.

---

## 🏛️ Régimes Fiscaux Disponibles

### 1. 📊 TVA Normale
- **Pour qui ?** Entreprises assujetties à la TVA
- **Taux appliqué :** 20% (par défaut)
- **Mentions légales :**
  ```
  TVA applicable selon le taux en vigueur.
  En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).
  Pénalités de retard en cas de paiement tardif : taux BCE + 10 points.
  Aucun escompte en cas de paiement anticipé.
  Règlement par virement bancaire ou chèque.
  ```

### 2. 🏪 Franchise en Base de TVA
- **Pour qui ?** Petites entreprises bénéficiant de la franchise en base (Article 293 B du CGI)
- **Taux appliqué :** 0% (TVA non applicable)
- **Mentions légales :**
  ```
  TVA non applicable - Article 293 B du Code Général des Impôts (franchise en base de TVA).
  En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).
  Pénalités de retard en cas de paiement tardif : taux BCE + 10 points.
  Aucun escompte en cas de paiement anticipé.
  ```

### 3. 🚀 Micro-Entreprise
- **Pour qui ?** Auto-entrepreneurs / micro-entrepreneurs
- **Taux appliqué :** 0% (TVA non applicable)
- **Mentions légales :**
  ```
  TVA non applicable - Article 293 B du Code Général des Impôts.
  Micro-entrepreneur bénéficiant du régime fiscal de la micro-entreprise.
  En cas de retard de paiement, indemnité forfaitaire légale pour frais de recouvrement : 40 euros (article L.441-6 du Code de commerce).
  Aucun escompte en cas de paiement anticipé.
  ```

---

## 🛠️ Comment Utiliser

### Lors de la Création d'une Facture/Devis

1. **Ouvrir le formulaire** : Cliquez sur "Nouveau Facture" ou "Nouveau Devis"

2. **Sélectionner votre régime fiscal** :
   - Dans la section "TVA et Mentions Légales" (fond violet/rose)
   - Choisissez parmi les 3 options : **TVA normale**, **Franchise en base**, ou **Micro-entreprise**

3. **Configuration automatique** :
   - La TVA est **automatiquement désactivée** pour les régimes Franchise et Micro
   - Les mentions légales sont **générées automatiquement** selon votre choix

4. **Personnalisation (optionnelle)** :
   - Vous pouvez ajouter des **mentions personnalisées** dans le champ prévu
   - Si vide, les mentions automatiques seront utilisées

5. **Vérification** :
   - Le récapitulatif montre "TVA non applicable" si vous êtes en franchise/micro
   - Le total affiche "Total" au lieu de "Total TTC" si pas de TVA

---

## 💡 Exemples d'Utilisation

### Exemple 1 : Facture avec TVA (Régime Normal)
```
Sous-total HT : 1000,00€
TVA (20%)     :  200,00€
─────────────────────────
Total TTC     : 1200,00€
```

### Exemple 2 : Facture sans TVA (Micro-Entreprise)
```
Sous-total HT : 1000,00€
TVA           : Non applicable
─────────────────────────
Total         : 1000,00€

Mention : TVA non applicable - Article 293 B du CGI
```

### Exemple 3 : Facture sans TVA (Franchise en Base)
```
Sous-total HT : 1000,00€
TVA           : Non applicable
─────────────────────────
Total         : 1000,00€

Mention : TVA non applicable - Article 293 B du CGI (franchise en base de TVA)
```

---

## 🗄️ Base de Données

### Nouvelles Colonnes Ajoutées

#### Tables `invoices` et `quotes` :
- `vat_liable` (boolean) : Assujetti à la TVA ?
- `vat_regime` (text) : 'normal', 'franchise', ou 'micro'
- `legal_mentions` (text) : Mentions légales automatiques ou personnalisées

### Triggers Automatiques

1. **`auto_calculate_vat`** : Calcule automatiquement la TVA à 0% pour micro/franchise
2. **`auto_legal_mentions`** : Génère les mentions légales si non personnalisées

---

## ⚖️ Conformité Légale

### Obligations Françaises Respectées

✅ **Article 293 B du CGI** : Mention obligatoire pour franchise en base de TVA  
✅ **Article L.441-6 du Code de commerce** : Indemnité forfaitaire de 40€ pour frais de recouvrement  
✅ **Pénalités de retard** : Taux BCE + 10 points  
✅ **Mentions micro-entreprise** : Identification du régime  

---

## 🔄 Migration des Données Existantes

Lors du déploiement de la migration SQL :
- **Toutes les factures/devis existants** ont été migrés en **régime TVA normale**
- Les mentions légales ont été **générées automatiquement**
- Aucune modification manuelle nécessaire

---

## 🎨 Interface Utilisateur

### Indicateurs Visuels

- **Badge violet/rose** : Section TVA et mentions légales
- **Icône 📊** : TVA normale
- **Icône 🏪** : Franchise en base
- **Icône 🚀** : Micro-entreprise
- **Toggle vert** : Assujetti à la TVA (actif/inactif)
- **Badge jaune** : "TVA non applicable" quand régime micro/franchise

---

## 🚀 Prochaines Évolutions

- [ ] Support de taux de TVA personnalisés (5.5%, 10%, etc.)
- [ ] Import/export des paramètres fiscaux
- [ ] Templates de mentions légales personnalisables
- [ ] Multi-devises avec TVA intracommunautaire

---

## 📞 Support

En cas de question sur la conformité fiscale de vos factures, consultez un expert-comptable ou votre centre des impôts.

**Note** : Ce système génère des mentions légales standards. Vérifiez toujours avec un professionnel que votre situation spécifique est correctement couverte.
