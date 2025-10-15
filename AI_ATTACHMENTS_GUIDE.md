# 📎 Guide - Pièces Jointes pour xCrackz Agent

## 🎯 Vue d'Ensemble

L'agent IA **xCrackz** peut maintenant **recevoir des fichiers** directement dans le chat !

---

## ✨ Fonctionnalités

### 1. **Types de Fichiers Acceptés**

✅ **Images** (JPG, PNG, GIF, WebP, SVG)
- Screenshots
- Photos de dommages
- Cartes
- Factures scannées

✅ **Documents** (PDF, Word, Excel, PowerPoint)
- Factures
- Contrats
- Bons de livraison
- Rapports

✅ **Texte** (TXT, CSV)
- Listes
- Données tabulaires

✅ **Archives** (ZIP, RAR, 7Z)
- Groupes de fichiers

### 2. **Limites**

⚙️ **Par fichier** : 10 MB max
⚙️ **Total utilisateur** : 100 MB max
⚙️ **Nombre de fichiers** : 50 max par utilisateur

---

## 📖 Comment Utiliser

### **Étape 1 : Ouvrir le Chat**

1. Cliquez sur le bouton **Agent IA** en bas à droite
2. Le chat xCrackz s'ouvre

### **Étape 2 : Joindre un Fichier**

1. Cliquez sur l'icône **📎** (trombone) à gauche de la zone de texte
2. Sélectionnez un ou plusieurs fichiers
3. Une miniature apparaît pour chaque fichier

### **Étape 3 : Envoyer le Message**

1. Tapez votre question (optionnel)
2. Cliquez sur **Envoyer** ou appuyez sur **Entrée**
3. L'IA reçoit vos fichiers et peut les analyser

### **Étape 4 : L'IA Analyse**

L'agent IA peut :
- ✅ Voir le nom du fichier
- ✅ Voir la taille du fichier
- ✅ Confirmer la réception
- ✅ Vous guider sur l'utilisation

---

## 💡 Cas d'Usage

### **1. Facture Scannée**

**Vous :**
```
📎 facture_client_dupont.pdf
Peux-tu extraire les infos de cette facture ?
```

**xCrackz :**
```
✅ J'ai bien reçu votre facture (facture_client_dupont.pdf - 1.2 MB)

Pour l'instant, je peux voir le fichier mais pas encore extraire 
automatiquement les données. 

Voici ce que je peux vous proposer :

1️⃣ Créer une facture manuellement
   → Aller dans Facturation > Nouvelle facture

2️⃣ Utiliser l'API INSEE
   → Si vous connaissez le SIRET client, je peux pré-remplir

3️⃣ Me donner les infos principales
   → Je vous guide étape par étape

Que préférez-vous ?
```

### **2. Photo de Dommage**

**Vous :**
```
📎 photo_pare_brise_fissure.jpg
📎 photo_portiere_rayee.jpg
Que dois-je faire pour ces dommages ?
```

**xCrackz :**
```
✅ J'ai reçu 2 photos (total: 3.4 MB)

Je vois que vous avez des dommages à documenter. Voici la procédure :

🔍 **Inspection de Départ/Arrivée**
1. Ouvrez la mission concernée
2. Cliquez sur "Inspection Départ" ou "Inspection Arrivée"
3. Prenez des photos directement avec l'appareil
4. Ajoutez des commentaires sur chaque dommage

📄 **Rapport Automatique**
Le système génère un rapport PDF avec :
- Photos horodatées
- Commentaires
- État du véhicule (avant/après)

💼 **Assurance**
Si besoin de déclarer :
- Exportez le rapport PDF
- Contactez votre assurance
- Joignez les photos

Voulez-vous que je vous guide ?
```

### **3. Contrat Client**

**Vous :**
```
📎 contrat_partenariat_societe_xyz.pdf
Comment ajouter ce client dans le système ?
```

**xCrackz :**
```
✅ Contrat reçu (2.1 MB)

Pour ajouter ce nouveau client :

📋 **Méthode 1 : Via SIRET**
1. Allez dans Clients > Nouveau Client
2. Entrez le SIRET
3. Les infos se remplissent automatiquement
   (nom, adresse, contacts)

✍️ **Méthode 2 : Saisie Manuelle**
1. Allez dans Clients > Nouveau Client
2. Cliquez sur "Saisir manuellement"
3. Remplissez les champs

📎 **Attacher le Contrat**
Malheureusement, je ne peux pas encore attacher automatiquement
le contrat à la fiche client.

👉 Vous pouvez :
- Créer le client d'abord
- Puis stocker le contrat dans vos dossiers
- (Fonctionnalité à venir : lier contrats aux clients)

Voulez-vous que je vous guide étape par étape ?
```

### **4. Liste CSV de Clients**

**Vous :**
```
📎 liste_clients_2025.csv
Comment importer ces clients ?
```

**xCrackz :**
```
✅ Liste reçue (45 KB)

L'import CSV n'est pas encore automatisé, mais je peux vous aider :

📊 **Option 1 : Import Manuel**
Pour chaque client dans votre CSV :
1. Récupérez le SIRET
2. Allez dans Clients > Nouveau
3. Entrez le SIRET → infos auto-remplies

⚡ **Option 2 : Script d'Import (Avancé)**
Si vous avez beaucoup de clients (>20) :
- Je peux demander au support de créer un script
- Envoyez votre CSV au format spécifique
- Import en masse (sous 24h)

📝 **Format CSV Requis**
- Colonnes : SIRET, Nom, Email, Téléphone, Adresse
- Sans accents dans les headers
- Encodage UTF-8

Combien de clients avez-vous dans ce fichier ?
```

---

## 🔒 Sécurité & Confidentialité

### **Stockage**

✅ **Supabase Storage**
- Fichiers chiffrés au repos
- Accès sécurisé par token JWT
- Isolation par utilisateur

✅ **Row Level Security (RLS)**
- Vous ne voyez que vos propres fichiers
- Impossible d'accéder aux fichiers d'autres utilisateurs

✅ **Backups**
- Sauvegarde quotidienne
- Rétention 30 jours

### **Partage**

❌ **L'IA ne partage JAMAIS vos fichiers** avec :
- D'autres utilisateurs
- Services tiers
- API externes (DeepSeek, OpenRouter)

✅ **L'IA peut** :
- Voir le nom du fichier
- Voir la taille
- Confirmer la réception
- (À venir) Analyser le contenu avec OCR local

---

## 🚀 Fonctionnalités À Venir

### **Phase 1 : Reconnaissance Visuelle**

🤖 **OCR Local (Tesseract.js)**
```
User upload facture.pdf
→ IA extrait : client, montant, date, articles
→ Pré-remplit formulaire facture
```

### **Phase 2 : Analyse Documents**

📄 **Extraction Intelligente**
- Contrats : parties, dates, montants
- Bons de livraison : références, quantités
- Factures : ventilation TVA, totaux

### **Phase 3 : Vision AI**

🖼️ **Analyse d'Images (DeepSeek Vision)**
- Dommages véhicule : estimation gravité
- Photos colis : détection anomalies
- Conditions météo : impact planning

### **Phase 4 : Génération Automatique**

📝 **Création Documents**
```
User: "Crée une facture depuis ce bon de livraison"
→ IA lit le PDF
→ Génère facture complète
→ Propose validation
```

---

## 📊 Statistiques

Vos fichiers joints à l'agent IA comptent dans votre **quota global** :

📈 **Voir l'Utilisation**
- (À venir) Tableau de bord "Mes Fichiers"
- Espace utilisé / 100 MB
- Fichiers par type
- Taille moyenne

🗑️ **Nettoyer**
- (À venir) Supprimer anciens fichiers
- Tri par date/taille
- Purge automatique >90 jours

---

## ❓ FAQ

### **Q : L'IA peut-elle lire mes PDF ?**

**R :** Pas encore ! Pour l'instant, l'IA voit seulement :
- Nom du fichier
- Type de fichier (MIME)
- Taille en octets

**Bientôt** (Phase 1) : OCR pour extraire le texte.

---

### **Q : Combien de fichiers puis-je envoyer à la fois ?**

**R :** Vous pouvez joindre **autant de fichiers que vous voulez** dans un seul message, tant que :
- Chaque fichier ≤ 10 MB
- Total utilisateur ≤ 100 MB

---

### **Q : Où sont stockés mes fichiers ?**

**R :** Dans **Supabase Storage** (bucket `attachments`) :
- Serveurs sécurisés en Europe
- Chiffrement SSL/TLS
- Isolation par utilisateur (RLS)

---

### **Q : Puis-je supprimer un fichier après envoi ?**

**R :** Oui ! (Fonctionnalité à venir)
1. Tableau de bord "Mes Fichiers"
2. Sélectionner fichier
3. Cliquer "Supprimer"

Pour l'instant, contactez le support pour supprimer.

---

### **Q : L'IA peut-elle créer une facture depuis une photo ?**

**R :** Pas encore automatiquement. Workflow actuel :
1. Vous envoyez la photo
2. L'IA confirme réception
3. Vous dictez les infos oralement ou par texte
4. L'IA vous guide dans la création manuelle

**Bientôt** (Phase 2) : Extraction automatique avec OCR.

---

### **Q : Pourquoi ma photo ne s'affiche pas en miniature ?**

**R :** Vérifiez :
- Format supporté (JPG, PNG, GIF, WebP, SVG)
- Taille ≤ 10 MB
- Fichier non corrompu

Si le problème persiste :
- Rafraîchissez la page (F5)
- Réessayez l'upload
- Contactez le support

---

### **Q : L'IA peut-elle analyser plusieurs factures en même temps ?**

**R :** Oui ! Envoyez toutes les factures d'un coup :

```
📎 facture_janvier.pdf
📎 facture_fevrier.pdf
📎 facture_mars.pdf
Peux-tu analyser le chiffre d'affaires Q1 ?
```

L'IA :
1. Confirme réception des 3 fichiers
2. Vous guide pour extraire manuellement les montants
3. (À venir) Calcule automatiquement le total

---

## 🎓 Tutoriel Vidéo (À Venir)

📹 **Démonstration Complète**
- Upload de fichiers
- Envoi à l'IA
- Analyse de facture
- Création document
- Gestion quota

---

## 📞 Support

**Besoin d'aide ?**

1. **Demandez à xCrackz** directement dans le chat
2. **Créez un ticket** via le chat (dites "support humain")
3. **Email** : support@xcrackz.com

---

## 🔄 Changelog

**v1.0 - 11/10/2025**
- ✅ Upload de fichiers dans le chat
- ✅ Preview images
- ✅ Détection type/taille
- ✅ Limite 10MB par fichier
- ✅ Stockage Supabase

**v1.1 - Bientôt**
- 🔜 OCR local (Tesseract.js)
- 🔜 Extraction données factures
- 🔜 Tableau de bord fichiers
- 🔜 Suppression fichiers

**v2.0 - Future**
- 🔮 Vision AI (DeepSeek)
- 🔮 Génération automatique documents
- 🔮 Import CSV masse
- 🔮 Analyse multi-documents

---

**xCrackz Agent** - L'IA qui comprend vos documents ! 📎🤖

**Build Status:** ✅ Production Ready  
**Last Update:** 11/10/2025  
**Version:** 1.0
