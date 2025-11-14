# 📸 GUIDE D'UTILISATION DU SCANNER PROFESSIONNEL

## 🎯 Accès rapide
**URL**: https://votre-app.vercel.app/scanner

---

## 🚀 WORKFLOW COMPLET

### 1️⃣ **Écran d'accueil**
- Bouton "Prendre une photo" 📷
- Bouton "Importer une image" 🖼️

### 2️⃣ **Capture/Import**
- **Photo**: Caméra arrière 1920x1080 (Full HD)
- **Import**: Formats supportés (JPEG, PNG, HEIC)
- Détection automatique instantanée des contours

### 3️⃣ **Recadrage intelligent**
- **4 coins draggables** 🔵 pour ajustement manuel
- **Zoom** : 0.5x → 3.0x avec slider
- **Rotation** : Pas de 90°
- **Fit to screen** : Ajustement automatique
- **Reset** : Retour coins détectés
- Bouton **"Valider le recadrage"**

### 4️⃣ **Édition & Filtres**

#### 🪄 **Filtre MAGIC** (par défaut)
- Auto-contraste intelligent
- Balance des blancs automatique
- Gamma adaptatif (zones sombres éclairées)
- Contraste 1.20x
- Netteté professionnelle 2.5x
- **✨ NOUVEAU**: Réduction de bruit bilatéral
- **✨ NOUVEAU**: Correction ombres automatique

#### ⚫⚪ **Filtre NOIR & BLANC**
- Binarisation hybride Otsu + Adaptatif
- Fenêtre locale 25x25 pixels
- Seuil automatique optimal
- Texte ultra-lisible
- Parfait pour documents à signer/OCR

#### 🌫️ **Filtre NIVEAUX DE GRIS**
- Courbe en S prononcée
- Contraste optimisé 1.2x
- Netteté forte 2.5x (radius 1.3)
- Idéal pour documents techniques

#### 🌈 **Filtre COULEUR**
- Balance des blancs 90%
- Saturation 1.7x
- Contraste 1.45x
- Gamma 1.08
- Netteté 2.5x (radius 1.2)
- Parfait pour graphiques et diagrammes

### 5️⃣ **Actions finales**

#### 💾 **Sauvegarder**
- Stockage local (max 50 documents)
- Format JPEG 95% qualité
- Nom automatique: "Document-[timestamp]"
- Visible dans "Mes Documents"

#### ⬇️ **Télécharger**
- Export immédiat
- Haute qualité (JPEG 95%)
- Nom du fichier: document-[timestamp].jpg

#### 🔄 **Rotation**
- Pas de 90° (horaire)
- Recalcul automatique de l'aperçu

---

## 💡 CONSEILS PRO

### ✅ Pour une capture optimale

1. **Éclairage**
   - Lumière naturelle diffuse (idéal)
   - Éviter les ombres portées
   - Pas de flash direct

2. **Angle**
   - Vue de dessus perpendiculaire
   - Document à plat sur surface unie
   - Contraste fond/document élevé

3. **Distance**
   - 30-40 cm du document
   - Remplir 60-80% du cadre
   - Laisser marge pour détection

4. **Stabilité**
   - Tenir fermement le téléphone
   - Utiliser support si possible
   - Capturer en mode paysage pour A4

### 🎯 Choix du filtre selon le document

| Type de document | Filtre recommandé | Raison |
|------------------|-------------------|---------|
| **Facture/Reçu** | 🪄 Magic | Balance optimale tout-en-un |
| **Contrat à signer** | ⚫⚪ Noir & Blanc | OCR et impression parfaits |
| **Plan technique** | 🌫️ Niveaux de Gris | Détails fins préservés |
| **Poster/Brochure** | 🌈 Couleur | Couleurs éclatantes |
| **Tableau/Graphique** | 🌈 Couleur | Lisibilité maximale |
| **Notes manuscrites** | ⚫⚪ Noir & Blanc | Contraste texte/papier |
| **Carte d'identité** | 🪄 Magic | Équilibre naturel |
| **Diplôme** | 🪄 Magic ou 🌈 Couleur | Selon présence de couleurs |

### ⚡ Raccourcis & Astuces

1. **Détection ratée?**
   - Améliorer contraste fond/document
   - Ajuster distance (+ proche ou + loin)
   - Utiliser recadrage manuel

2. **Document plié/déformé?**
   - L'algorithme détecte jusqu'à 8 côtés
   - Approximation flexible intégrée
   - Correction perspective automatique

3. **Ombres sur le document?**
   - Filtre Magic élimine automatiquement
   - Gamma adaptatif éclaircit zones sombres
   - Balance des blancs corrige dominantes

4. **Texte flou?**
   - Réduction de bruit automatique activée
   - Netteté 2.5x appliquée
   - Essayer filtre N&B pour texte pur

5. **Couleurs ternes?**
   - Filtre Couleur boost saturation 1.7x
   - Balance des blancs automatique
   - Contraste 1.45x pour vivacité

---

## 📂 MES DOCUMENTS

### Accès
- Bouton "Mes Documents" sur page d'édition
- Grille responsive 2 colonnes (mobile) / 3+ (desktop)

### Fonctionnalités
- **Aperçu**: Vignettes haute qualité
- **Date**: Horodatage de sauvegarde
- **Voir**: Ouvre document en plein écran
- **Supprimer**: Suppression confirmée
- **Limite**: 50 documents max (FIFO si dépassé)

### Gestion
- Stockage local navigateur (localStorage)
- Survit aux rafraîchissements de page
- Effacé si cache navigateur vidé
- Sauvegarde manuelle recommandée (téléchargement)

---

## 🔧 TECHNIQUES AVANCÉES

### Algorithmes implémentés
- ✅ CLAHE (égalisation adaptative)
- ✅ Filtre bilatéral (réduction bruit)
- ✅ Canny Edge Detection (30-120)
- ✅ Otsu (seuil optimal automatique)
- ✅ Binarisation adaptative hybride
- ✅ Unsharp Masking (netteté pro)
- ✅ Gamma adaptatif (luminosité contextuelle)
- ✅ Balance des blancs automatique
- ✅ Transformation de perspective (4 points)

### Performance
- Traitement temps réel (< 2s)
- Pas de latence réseau (100% client)
- Optimisé mobile & desktop
- PWA installable

---

## ❓ FAQ

**Q: Puis-je scanner plusieurs pages?**
A: Actuellement 1 page à la fois. Fonction batch prévue.

**Q: Quelle est la résolution maximale?**
A: Limitée par caméra appareil (généralement 1920x1080 à 4K).

**Q: Puis-je exporter en PDF?**
A: Actuellement JPEG uniquement. Export PDF multi-pages prévu.

**Q: Les documents sont-ils envoyés sur serveur?**
A: Non, traitement 100% local dans le navigateur (confidentialité totale).

**Q: Puis-je utiliser offline?**
A: Oui si PWA installée, sauf 1ère visite (téléchargement OpenCV.js).

**Q: Limite de stockage?**
A: 50 documents locaux. Télécharger les importants pour archivage.

---

## 🆘 SUPPORT

**Problème de détection?**
→ Vérifier éclairage, contraste fond, angle perpendiculaire

**Photo noire?**
→ Autoriser accès caméra, rafraîchir page

**Filtres trop agressifs?**
→ Commencer par Magic, ajuster ensuite

**Documents non sauvegardés?**
→ Vérifier stockage navigateur disponible (paramètres)

---

**🎉 Profitez d'un scanner professionnel directement dans votre navigateur !**
