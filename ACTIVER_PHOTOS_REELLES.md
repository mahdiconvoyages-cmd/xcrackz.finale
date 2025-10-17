# 🚀 GUIDE RAPIDE : Activer les photos réelles dans les inspections

## ✅ Ce qui est déjà fait

- ✅ **18 photos copiées** dans `public/assets/vehicles/`
- ✅ **PhotoCard modifié** pour accepter `vehicleType` et afficher les vraies photos
- ✅ **Mapping VL/VU/PL** configuré
- ✅ **Fallback SVG** automatique si image manquante

---

## 🔧 Ce qu'il reste à faire

### **1. Passer le type de véhicule aux PhotoCard**

Dans **`InspectionDepartureNew.tsx`** et **`InspectionArrivalNew.tsx`**, vous devez :

#### **A. Charger le type de véhicule depuis la mission**

```tsx
// Ligne ~50-60 (dans le useEffect qui charge la mission)
const { data: mission } = await supabase
  .from('missions')
  .select(`
    *,
    vehicle_type  // ✨ AJOUTER cette ligne
  `)
  .eq('id', missionId)
  .single();

// Stocker dans un state
const [vehicleType, setVehicleType] = useState<'VL' | 'VU' | 'PL'>('VL');

// Mettre à jour quand la mission charge
if (mission) {
  setVehicleType(mission.vehicle_type || 'VL');
}
```

#### **B. Passer aux PhotoCard**

```tsx
// Avant (ligne ~200-300)
<PhotoCard 
  type="front"
  label="Vue avant"
  onClick={() => handlePhotoCapture('front')}
/>

// Après ✨
<PhotoCard 
  type="front"
  label="Vue avant"
  vehicleType={vehicleType}  // ✨ AJOUTER
  onClick={() => handlePhotoCapture('front')}
/>
```

---

## 📋 Exemple complet pour InspectionDepartureNew.tsx

### **Étape 1 : Ajouter le state**

```tsx
// Ligne ~30-40 (avec les autres states)
const [vehicleType, setVehicleType] = useState<'VL' | 'VU' | 'PL'>('VL');
```

### **Étape 2 : Charger depuis la mission**

```tsx
// Ligne ~60-80 (dans useEffect)
useEffect(() => {
  const loadMission = async () => {
    const { data: mission, error } = await supabase
      .from('missions')
      .select('*, vehicle_type')  // ✨
      .eq('id', missionId)
      .single();
    
    if (mission) {
      setVehicleType(mission.vehicle_type || 'VL');  // ✨
      // ... reste du code
    }
  };
  
  loadMission();
}, [missionId]);
```

### **Étape 3 : Passer aux PhotoCard (répéter pour TOUS les PhotoCard)**

```tsx
{/* Étape 1 - Données véhicule */}
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  <PhotoCard 
    type="front"
    label="Vue avant"
    vehicleType={vehicleType}  // ✨
    isRequired
    onClick={() => handlePhotoCapture('front')}
  />
  <PhotoCard 
    type="back"
    label="Vue arrière"
    vehicleType={vehicleType}  // ✨
    isRequired
    onClick={() => handlePhotoCapture('back')}
  />
  <PhotoCard 
    type="left_front"
    label="Latéral gauche avant"
    vehicleType={vehicleType}  // ✨
    onClick={() => handlePhotoCapture('left_front')}
  />
  <PhotoCard 
    type="left_back"
    label="Latéral gauche arrière"
    vehicleType={vehicleType}  // ✨
    onClick={() => handlePhotoCapture('left_back')}
  />
  <PhotoCard 
    type="right_front"
    label="Latéral droit avant"
    vehicleType={vehicleType}  // ✨
    onClick={() => handlePhotoCapture('right_front')}
  />
  <PhotoCard 
    type="right_back"
    label="Latéral droit arrière"
    vehicleType={vehicleType}  // ✨
    onClick={() => handlePhotoCapture('right_back')}
  />
</div>
```

---

## 🎯 Faire pareil pour InspectionArrivalNew.tsx

**Exactement les mêmes modifications** :
1. ✅ Ajouter state `vehicleType`
2. ✅ Charger depuis mission avec `vehicle_type`
3. ✅ Passer à tous les `<PhotoCard vehicleType={vehicleType} />`

---

## 🧪 Test

### **1. Créer une mission VL**
```
Aller sur /missions/create
Choisir : 🚗 VL (Véhicule Léger)
Créer la mission
```

### **2. Démarrer l'inspection**
```
Cliquer sur "Démarrer inspection"
➡️ Vous devez voir les photos de voiture (avant.png, arriere.png, etc.)
```

### **3. Créer une mission VU**
```
Créer une nouvelle mission
Choisir : 🚐 VU (Véhicule Utilitaire)
Démarrer l'inspection
➡️ Vous devez voir les photos de Master/van
```

### **4. Créer une mission PL**
```
Créer une nouvelle mission
Choisir : 🚛 PL (Poids Lourd)
Démarrer l'inspection
➡️ Vous devez voir les photos de Scania/camion
```

---

## 📊 Résultat attendu

| Type mission | Photos affichées |
|--------------|------------------|
| VL | 🚗 Voiture berline (avant.png, arriere.png, ...) |
| VU | 🚐 Master/van (master avant.png, ...) |
| PL | 🚛 Scania/camion (scania avant.png, ...) |

---

## ⚠️ Si une image ne s'affiche pas

Le système affiche automatiquement le SVG de secours. Vérifiez :

1. **Le nom du fichier est correct** dans le dossier `public/assets/vehicles/`
2. **Les espaces dans les noms** (ex: `lateral droit` vs `lateral-droit`)
3. **L'extension** (.png, .jpg, etc.)

---

## 🎨 Bonus : Désactiver les vraies photos

Si vous voulez revenir aux SVG temporairement :

```tsx
<PhotoCard 
  type="front"
  vehicleType={vehicleType}
  useRealPhoto={false}  // ✨ Force l'affichage des SVG
/>
```

---

## ✅ Checklist finale

Avant de tester :

- [ ] State `vehicleType` ajouté dans InspectionDepartureNew
- [ ] State `vehicleType` ajouté dans InspectionArrivalNew  
- [ ] `vehicle_type` chargé depuis la mission (SELECT)
- [ ] Prop `vehicleType={vehicleType}` ajouté à TOUS les PhotoCard (×12 dans chaque fichier)
- [ ] Migration SQL exécutée (ADD_VEHICLE_TYPE_MIGRATION.sql)
- [ ] Mission créée avec type VL/VU/PL

**Temps estimé** : 10-15 minutes ⏱️

---

## 🚀 Commandes rapides

```bash
# Vérifier que les images sont bien là
ls public/assets/vehicles/

# Compter les images
(Get-ChildItem public/assets/vehicles/).Count  # Doit afficher 18

# Tester l'app
npm run dev
```

---

## 🎉 Une fois terminé

Vous aurez :
- ✅ **Photos réelles** de 3 types de véhicules
- ✅ **Adaptation automatique** selon le type de mission
- ✅ **Fallback SVG** si problème
- ✅ **Effet hover** professionnel
- ✅ **Responsive** sur tous les écrans

**Enjoy !** 🎨✨
