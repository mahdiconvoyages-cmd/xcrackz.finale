# 🧪 Guide de Test - Envoi Email Automatique

## ✅ Configuration terminée

- ✅ Fonction Edge déployée
- ✅ API Resend configurée  
- ✅ Domaine xcrackz.com vérifié
- ✅ Application web lancée sur http://localhost:5174/

## 📝 Test étape par étape

### 1. Se connecter
1. Ouvrir http://localhost:5174/
2. Se connecter avec vos identifiants

### 2. Créer une facture de test
1. Aller dans **Facturation**
2. Cliquer sur **Nouvelle Facture**
3. Remplir les informations :
   - **Nom client** : Test Client
   - **Email client** : votre.email@example.com (IMPORTANT: utilisez un vrai email que vous pouvez vérifier)
   - **SIRET** : 12345678900001
   - **Adresse** : 123 Rue de Test, Paris
4. Ajouter un article :
   - **Description** : Service de test
   - **Quantité** : 1
   - **Prix unitaire** : 100
   - **TVA** : 20%
5. Cliquer sur **Créer la facture**

### 3. Envoyer l'email
1. Dans la liste des factures, repérer la facture créée
2. Dans la colonne **Actions**, cliquer sur le bouton **Send** (icône enveloppe) 📧
3. Une confirmation apparaît : "Envoyer la facture F-2024-XXX à votre.email@example.com ?"
4. Cliquer sur **OK**
5. Un message "Email envoyé avec succès !" devrait apparaître
6. Le statut de la facture passe automatiquement à **Envoyé** (badge bleu)

### 4. Vérifier la réception
1. Ouvrir votre boîte email
2. Chercher un email de **Finality <noreply@xcrackz.com>**
3. Sujet : "Facture F-2024-XXX"
4. Ouvrir l'email (design professionnel avec gradient cyan)
5. Vérifier la pièce jointe PDF
6. Ouvrir le PDF et vérifier le contenu

### 5. Vérifier les logs (optionnel)

Dans PowerShell :
```powershell
# Voir les logs de la fonction
supabase functions logs send-email

# Ou en temps réel
supabase functions logs send-email --tail
```

## 🔍 Ce que vous devriez voir

### Dans l'application web
- ✅ Bouton "Send" visible dans la colonne Actions
- ✅ Tooltip "Envoyer par email à [email]" au survol
- ✅ Bouton désactivé si pas d'email client
- ✅ Confirmation avant envoi
- ✅ Message de succès après envoi
- ✅ Statut mis à jour automatiquement

### Dans l'email reçu
```
De: Finality <noreply@xcrackz.com>
À: votre.email@example.com
Objet: Facture F-2024-XXX

[HTML professionnel avec gradient cyan]

Bonjour Test Client,

Veuillez trouver ci-joint la facture F-2024-XXX.

[Détails de la facture dans un tableau]

Montant total : 120,00 €

Cordialement,
L'équipe Finality

---
Pièce jointe : Facture_F-2024-XXX.pdf (format A4, professionnel)
```

## 🐛 Que faire si ça ne marche pas ?

### Email non reçu
```powershell
# 1. Vérifier les logs
supabase functions logs send-email

# 2. Vérifier sur le dashboard Resend
# Aller sur https://resend.com/emails
# Voir si l'email apparaît dans la liste

# 3. Vérifier les spams
# Chercher dans le dossier Spam/Courrier indésirable
```

### Erreur "Email service not configured"
```powershell
# Vérifier que le secret est bien configuré
supabase secrets list

# Devrait afficher RESEND_API_KEY
```

### Erreur dans la console du navigateur
1. Ouvrir la console (F12)
2. Chercher les erreurs en rouge
3. Vérifier le message d'erreur

### PDF corrompu ou vide
1. Vérifier que html2pdf.js est installé :
   ```powershell
   npm list html2pdf.js
   ```
2. Si non installé :
   ```powershell
   npm install html2pdf.js
   ```

## 📊 Dashboard Resend

Pour voir vos emails envoyés :
1. Aller sur https://resend.com/emails
2. Vous verrez la liste de tous les emails envoyés
3. Statut : Delivered / Bounced / Failed
4. Statistiques : Taux d'ouverture, clics, etc.

## 🎯 Fonctionnalités testables

### Envoi simple
- [x] Créer facture → Envoyer → Email reçu

### Envoi avec devis
- [ ] Créer devis → Envoyer → Email reçu (même processus)

### Mise à jour statut
- [x] Email envoyé → Statut passe de "Brouillon" à "Envoyé"

### Gestion des erreurs
- [ ] Essayer d'envoyer sans email client → Message d'erreur
- [ ] Email invalide → Vérifier le comportement

### Pièce jointe
- [x] PDF professionnel avec logo, tableau, totaux

## ✅ Checklist de validation

- [ ] Application web lancée et accessible
- [ ] Connexion réussie
- [ ] Création de facture fonctionnelle
- [ ] Bouton "Send" visible et actif
- [ ] Confirmation d'envoi affichée
- [ ] Message de succès affiché
- [ ] Statut mis à jour
- [ ] Email reçu dans la boîte
- [ ] PDF en pièce jointe lisible
- [ ] Design email professionnel

## 🎊 Si tout fonctionne

**Félicitations !** 🎉

Vous avez maintenant un système complet d'envoi automatique d'emails avec :
- ✅ Génération PDF automatique
- ✅ Envoi via service professionnel (Resend)
- ✅ Tracking des statuts
- ✅ Design moderne et professionnel
- ✅ Domaine vérifié (xcrackz.com)

**Prochaines étapes** :
1. Tester avec de vrais clients
2. Personnaliser les templates d'email
3. Ajouter l'historique des envois
4. Implémenter les relances automatiques

## 📞 Support

En cas de problème :
1. Vérifier les logs : `supabase functions logs send-email`
2. Vérifier le dashboard Resend : https://resend.com
3. Consulter la documentation : `EMAIL_SETUP_GUIDE.md`
4. Vérifier la configuration : `EMAIL_CONFIGURATION_COMPLETE.md`

---

**Bon test !** 🚀
