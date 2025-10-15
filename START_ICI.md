# 🚀 DÉMARRAGE RAPIDE - TOUT EN 3 ÉTAPES

## ✅ L'APP EST DÉJÀ LANCÉE !

Metro bundler tourne sur **http://localhost:8082**

---

## 📱 ÉTAPE 1 : Scanner le QR Code (2 min)

### Sur Android
1. **Télécharger Expo Go** (Google Play Store)
2. **Ouvrir Expo Go**
3. **Scanner le QR code** affiché dans le terminal

### Sur iOS
1. **Ouvrir l'app Caméra**
2. **Scanner le QR code** affiché dans le terminal
3. **Cliquer la notification Expo Go**
4. Si pas Expo Go : télécharger depuis App Store

---

## 🧪 ÉTAPE 2 : Tester les fonctionnalités (5 min)

### Test 1 : GPS Mapbox ✅
```
1. Tab "Missions" (en bas)
2. Créer une mission OU ouvrir existante
3. Cliquer "GPS Navigation"
4. ✅ Voir carte Mapbox avec route tracée
5. ✅ Entendre guidage vocal français
```

**Attendu** :
- Carte réelle Mapbox affichée
- Route ligne turquoise
- Marker bleu (position) + rouge (destination)
- Instructions vocales en français

---

### Test 2 : Wizard Photos ✅
```
1. Tab "Missions"
2. Ouvrir ou créer inspection
3. Chercher banner VIOLET "Mode Wizard"
4. Cliquer dessus
5. Prendre 4 photos obligatoires (avant, arrière, gauche, droite)
6. ✅ Photos s'affichent immédiatement
7. Optionnel : 2 photos supplémentaires
8. Terminer
```

**Attendu** :
- Progression séquentielle 1→2→3→4
- Photos visibles dès capture
- Pas de disparition
- Upload en arrière-plan

---

### Test 3 : Covoiturage ✅
```
1. Tab "Covoiturage" (en bas)
2. Explorer les trajets
3. Chercher menu ou bouton "Info"
4. ✅ Voir page moderne avec features
```

**Attendu** :
- Hero section (placeholder SVG pour l'instant)
- 4 cards features
- Stats
- Section "Comment ça marche"

**Note** : Image hero à ajouter (voir Étape 3)

---

## 📸 ÉTAPE 3 : Ajouter image covoiturage (optionnel, 2 min)

### Si vous avez l'image "Capture d'écran 2025-10-11 154912.png"

```powershell
# 1. Renommer
Rename-Item "Capture d'écran 2025-10-11 154912.png" "covoiturage-hero.jpg"

# 2. Copier vers web
Copy-Item "covoiturage-hero.jpg" "c:\Users\mahdi\Documents\Finality-okok\src\assets\images\"

# 3. Copier vers mobile  
Copy-Item "covoiturage-hero.jpg" "c:\Users\mahdi\Documents\Finality-okok\mobile\assets\"

# 4. Recharger app (dans Expo Go : secouer téléphone → Reload)
```

---

## 🎯 Commandes utiles

### Recharger l'app
```
Dans terminal Metro : Appuyer sur "r"
```

### Ouvrir menu dev
```
Secouer le téléphone (Expo Go)
```

### Voir logs
```
Dans terminal Metro : logs apparaissent automatiquement
```

### Redémarrer Metro bundler
```powershell
# Dans terminal actuel : Ctrl+C
cd mobile
npx expo start --clear
```

---

## 📊 QR Codes disponibles

Le terminal affiche **3 QR codes** :
1. **Development build** (premier)
2. **Expo Go** (deuxième) ← **UTILISEZ CELUI-CI**
3. **Development client** (troisième)

**Scannez le 2ème QR code** (section "Using Expo Go")

---

## ✅ Checklist Tests

- [ ] GPS Mapbox affiche carte réelle
- [ ] Route tracée en turquoise
- [ ] Guidage vocal fonctionne
- [ ] Wizard photos : 4 photos obligatoires prises
- [ ] Photos s'affichent immédiatement
- [ ] Pas de disparition photos
- [ ] Progression séquentielle respectée
- [ ] Page covoiturage s'affiche
- [ ] (Optionnel) Image covoiturage visible

---

## 🐛 Dépannage rapide

### "QR code ne fonctionne pas"
```
Solution : Appuyez sur "s" dans terminal → passe en Expo Go
Rescannez le nouveau QR code
```

### "Carte GPS blanche"
```
Cause : Token Mapbox
Solution : Vérifier mobile/src/screens/WazeGPSScreen.tsx ligne 18
Token : pk.eyJ1IjoieGNyYWNreiIsImEiOiJjbWR3dzV3cDMxdXIxMmxzYTI0c2Z0N2lpIn0.PFh0zoPCQK9UueLrLKWd0w
```

### "Banner Wizard invisible"
```
Cause : Inspection déjà commencée ou verrouillée
Solution : Créer nouvelle inspection
```

### "Metro bundler erreur"
```powershell
# Tuer tous les processus Node
taskkill /F /IM node.exe 2>$null

# Relancer
cd mobile
npx expo start --clear
```

---

## 📚 Documentation complète

| Besoin | Fichier |
|--------|---------|
| **Démarrage rapide** | `START_ICI.md` (ce fichier) |
| **Tout comprendre** | `TOUT_PRET.md` |
| **GPS détails** | `GPS_WAZE_GUIDE.md` |
| **Wizard détails** | `WIZARD_PHOTOS_GUIDE.md` |
| **Image covoiturage** | `QUICK_IMAGE_GUIDE.md` |
| **Récap complet** | `RECAP_COMPLET_SESSION.md` |
| **Config Mapbox** | `MAPBOX_SETUP.md` |

---

## 🎉 C'EST PARTI !

**Metro bundler** : ✅ Actif sur port 8082  
**QR Code** : ✅ Affiché dans terminal  
**App** : ✅ Prête à scanner

### 👉 SCANNEZ MAINTENANT LE QR CODE !

---

**Questions ?** → Consultez `TOUT_PRET.md`  
**Problèmes ?** → Section "Dépannage rapide" ci-dessus

**Bon test ! 🚀**
