# 🧪 Test Rapide API INSEE - Console Navigateur

## Test en 30 Secondes

### Étape 1 : Ouvrir la Console
1. Aller sur http://localhost:5176/clients
2. Appuyer sur **F12**
3. Onglet **Console**

### Étape 2 : Copier-Coller ce Code

```javascript
// Test direct de l'API INSEE
async function testInsee(siret = '55208673700039') {
  console.log('🔍 Test SIRET:', siret);
  
  try {
    const url = `https://entreprise.data.gouv.fr/api/sirene/v3/etablissements/${siret}`;
    console.log('📡 URL:', url);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    
    console.log('📥 Status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Erreur:', response.status);
      return null;
    }
    
    const data = await response.json();
    const etab = data.etablissement;
    
    console.log('✅ SIRET trouvé !');
    console.log('📛 Nom:', etab.unite_legale?.denomination);
    console.log('📍 Adresse:', 
      etab.adresse?.numero_voie, 
      etab.adresse?.type_voie, 
      etab.adresse?.libelle_voie,
      etab.adresse?.code_postal,
      etab.adresse?.libelle_commune
    );
    
    return etab;
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    return null;
  }
}

// Lancer le test
testInsee();
```

### Étape 3 : Appuyer sur Entrée

**Résultat attendu :**
```
🔍 Test SIRET: 55208673700039
📡 URL: https://...
📥 Status: 200
✅ SIRET trouvé !
📛 Nom: GOOGLE FRANCE
📍 Adresse: 8 RUE DE LONDRES 75009 PARIS 9
```

---

## Tests Avec Différents SIRET

```javascript
// Test Google
testInsee('55208673700039');

// Test La Poste
testInsee('88091431100019');

// Test Microsoft
testInsee('55200155800027');

// Test SNCF
testInsee('87925905400018');
```

---

## Si Vous Voyez ❌

### Erreur 404
```
📥 Status: 404
❌ Erreur: 404
```
→ Le SIRET n'existe pas dans INSEE

### Erreur CORS
```
❌ Erreur: TypeError: Failed to fetch
```
→ Bloqueur de pub ou extension navigateur

### Aucune Réponse
→ Problème de connexion internet

---

## Test Complet dans le Formulaire

Une fois que `testInsee()` fonctionne dans la console :

1. **Fermer la console**
2. **Cliquer** "Nouveau client"
3. **Taper** le SIRET : `55208673700039`
4. **Rouvrir la console** (F12)
5. **Observer** les logs automatiques

Vous devriez voir exactement les mêmes logs que le test manuel !

---

## 🎯 Objectif

Vérifier que :
- ✅ L'API répond (status 200)
- ✅ Les données sont présentes (nom, adresse)
- ✅ Pas d'erreur CORS

Si ce test fonctionne mais pas le formulaire → Problème dans React  
Si ce test ne fonctionne pas → Problème avec l'API ou le réseau
