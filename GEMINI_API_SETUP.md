# 🔑 Configuration Google Gemini API

## ✅ Pourquoi Gemini?

- **GRATUIT:** 1500 requêtes/jour (largement suffisant)
- **Rapide:** Réponse en 1-2 secondes
- **Supporte les images:** Contrairement à DeepSeek
- **Qualité excellente:** Comparable à GPT-4 Vision

---

## 📝 Obtenir votre clé API (5 minutes)

### Étape 1: Créer un compte Google AI Studio

1. Allez sur: **https://ai.google.dev/**
2. Cliquez sur **"Get API key"** (bouton bleu en haut)
3. Connectez-vous avec votre compte Google

### Étape 2: Créer une clé API

1. Dans Google AI Studio, cliquez sur **"Get API key"**
2. Cliquez sur **"Create API key in new project"**
3. Votre clé sera générée instantanément

**Format de la clé:** `AIzaSyABC...XYZ` (39 caractères)

### Étape 3: Copier la clé

1. Cliquez sur **"Copy"** pour copier la clé
2. ⚠️ **Sauvegardez-la** quelque part (vous ne pourrez plus la revoir)

---

## 🔧 Intégrer la clé dans l'app

### Méthode 1: Modifier directement le code (temporaire)

**Fichier:** `mobile/src/services/aiService.ts`

```typescript
// Ligne 3
const GEMINI_API_KEY = 'AIzaSyABC...XYZ'; // ← Remplacer par votre vraie clé
```

### Méthode 2: Utiliser .env (recommandé)

**Fichier:** `mobile/.env`

```env
EXPO_PUBLIC_GEMINI_API_KEY=AIzaSyABC...XYZ
```

**Puis dans** `mobile/src/services/aiService.ts`:

```typescript
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'clé_par_défaut';
```

---

## 🧪 Tester l'API

### Test 1: Dans le navigateur

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=VOTRE_CLE" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{"text": "Bonjour, ça marche?"}]
    }]
  }'
```

**Réponse attendue:**
```json
{
  "candidates": [{
    "content": {
      "parts": [{"text": "Oui, ça marche ! ..."}]
    }
  }]
}
```

### Test 2: Dans l'app mobile

1. Redémarrez Expo:
   ```powershell
   cd mobile
   npx expo start --clear
   ```

2. Ouvrez une mission → Inspection → Prenez une photo

3. Vérifiez les logs:
   ```
   🤖 Analyse Gemini de la photo: front
   📤 Envoi requête à Gemini...
   🌐 Gemini Response status: 200
   ✅ Analyse terminée: ✓ Aucun dommage
   ```

---

## ⚠️ Limites et quotas

### Gratuit (Tier 1)
- **1500 requêtes/jour**
- **15 requêtes/minute**
- Pas de carte bancaire requise

### Si dépassement
- L'API retournera une erreur 429 (Too Many Requests)
- L'app continuera de fonctionner (analyse IA désactivée temporairement)

### Pour augmenter les limites
- Créer un projet Google Cloud
- Activer la facturation (pay-as-you-go)
- Coût: ~$0.075 / 1M tokens (très bon marché)

---

## 🔒 Sécurité

### ⚠️ Ne JAMAIS commit la clé API

**Fichier `.gitignore`:**
```
mobile/.env
mobile/src/services/aiService.ts
```

### ✅ Bonnes pratiques

1. **Utiliser des variables d'environnement**
2. **Limiter les permissions de la clé**:
   - Dans Google AI Studio → API Keys
   - Restreindre par IP ou domaine
3. **Régénérer la clé** si elle est compromise

---

## 📊 Comparaison des modèles

| Modèle | Prix (1M tokens) | Vitesse | Images | Qualité |
|--------|------------------|---------|--------|---------|
| **Gemini 2.0 Flash** | $0.075 | ⚡⚡⚡ | ✅ | ⭐⭐⭐⭐ |
| GPT-4o mini | $0.15 | ⚡⚡ | ✅ | ⭐⭐⭐⭐⭐ |
| Claude 3 Haiku | $0.25 | ⚡⚡ | ✅ | ⭐⭐⭐⭐ |
| DeepSeek Chat | $0.14 | ⚡⚡⚡ | ❌ | ⭐⭐⭐ |

**Notre choix:** Gemini 2.0 Flash (meilleur rapport qualité/prix/vitesse)

---

## 🐛 Dépannage

### Erreur: "API key not valid"
- Vérifiez que vous avez bien copié toute la clé
- La clé doit commencer par `AIzaSy`

### Erreur: "Quota exceeded"
- Vous avez dépassé les 1500 requêtes/jour
- Attendez 24h ou créez un nouveau projet

### Erreur: "Model not found"
- Vérifiez l'URL: `gemini-2.0-flash-exp` (avec le `-exp`)
- Assurez-vous d'utiliser `/v1beta/` dans l'URL

### Pas de réponse / Timeout
- Vérifiez votre connexion internet
- L'image base64 est peut-être trop grande (max 20MB)
- Compressez l'image davantage

---

## 📚 Documentation officielle

- **Google AI Studio:** https://ai.google.dev/
- **Documentation API:** https://ai.google.dev/docs
- **Gemini Models:** https://ai.google.dev/models/gemini
- **Pricing:** https://ai.google.dev/pricing

---

## 🎯 Utilisation dans Finality

### Workflow complet

```
1. User prend une photo d'inspection
   ↓
2. Photo compressée à 1920px, quality 0.8
   ↓
3. Upload vers Supabase Storage
   ↓
4. Conversion en base64
   ↓
5. Envoi à Gemini avec prompt d'analyse
   ↓
6. Gemini analyse l'image (1-2 sec)
   ↓
7. Réponse JSON avec dommages détectés
   ↓
8. Affichage à l'utilisateur + sauvegarde
```

### Exemple de réponse Gemini

```json
{
  "hasDamage": true,
  "damageType": "rayure",
  "severity": "minor",
  "location": "portière avant gauche",
  "description": "Rayure superficielle verticale d'environ 15cm sur la portière conducteur. La peinture est légèrement éraflée mais le métal n'est pas exposé.",
  "confidence": 0.92,
  "suggestions": [
    "Polish et cire pour masquer la rayure",
    "Retouche de peinture si nécessaire",
    "Documenter avec photos supplémentaires"
  ]
}
```

---

## ✅ Checklist finale

- [ ] Créer compte Google AI Studio
- [ ] Générer clé API Gemini
- [ ] Copier la clé dans `aiService.ts`
- [ ] Tester l'API avec curl
- [ ] Redémarrer l'app Expo
- [ ] Prendre une photo de test
- [ ] Vérifier les logs
- [ ] Confirmer l'analyse IA fonctionne

---

**Status:** ✅ Prêt à utiliser  
**Coût:** GRATUIT (1500/jour)  
**Performance:** Excellente  
**Support images:** ✅ Oui
