# 📘 GUIDE D'INTÉGRATION - PDF COMPARATIF

## Comment utiliser le nouveau PDF comparatif dans votre app

### 1️⃣ Dans l'écran de détails d'une mission

```typescript
// mobile/src/screens/MissionDetailsScreen.tsx

import { generateComparisonPDF, exportMissionPhotos } from '../services/comparisonPdfGenerator';
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';

export default function MissionDetailsScreen({ route }) {
  const { missionId } = route.params;
  const [departureInspection, setDepartureInspection] = useState(null);
  const [arrivalInspection, setArrivalInspection] = useState(null);
  const [canGenerateComparison, setCanGenerateComparison] = useState(false);

  useEffect(() => {
    loadInspections();
  }, [missionId]);

  const loadInspections = async () => {
    // Charger les inspections
    const { data: inspections } = await supabase
      .from('vehicle_inspections')
      .select('*, photos:inspection_photos(*)')
      .eq('mission_id', missionId);

    const departure = inspections?.find(i => i.inspection_type === 'departure');
    const arrival = inspections?.find(i => i.inspection_type === 'arrival');

    setDepartureInspection(departure);
    setArrivalInspection(arrival);
    setCanGenerateComparison(!!departure && !!arrival);
  };

  const handleGenerateComparison = async () => {
    if (!departureInspection || !arrivalInspection) {
      Alert.alert('❌ Erreur', 'Les deux inspections sont nécessaires');
      return;
    }

    Alert.alert('⏳ Génération...', 'Veuillez patienter...');

    const result = await generateComparisonPDF(
      departureInspection,
      arrivalInspection
    );

    if (result.success) {
      Alert.alert('✅ Succès', 'PDF comparatif généré et partagé !');
    } else {
      Alert.alert('❌ Erreur', result.error || 'Une erreur est survenue');
    }
  };

  const handleExportPhotos = async () => {
    if (!departureInspection || !arrivalInspection) {
      Alert.alert('❌ Erreur', 'Les deux inspections sont nécessaires');
      return;
    }

    Alert.alert('⏳ Export...', 'Préparation du ZIP...');

    const result = await exportMissionPhotos(
      mission.reference,
      departureInspection.photos || [],
      arrivalInspection.photos || []
    );

    if (result.success) {
      Alert.alert('✅ Succès', 'Photos exportées en ZIP !');
    } else {
      Alert.alert('❌ Erreur', result.error || 'Une erreur est survenue');
    }
  };

  return (
    <View>
      {/* ... autres éléments ... */}

      {/* Boutons d'action */}
      {canGenerateComparison && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleGenerateComparison}
          >
            <Ionicons name="document-text" size={20} color="white" />
            <Text style={styles.buttonText}>📊 PDF Comparatif</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleExportPhotos}
          >
            <Ionicons name="download" size={20} color="white" />
            <Text style={styles.buttonText}>📸 Exporter Photos</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  secondaryButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

---

### 2️⃣ Dans un menu contextuel (longPress sur mission)

```typescript
// mobile/src/screens/NewMissionsScreen.tsx

const showMissionMenu = (mission: Mission) => {
  // Vérifier si les 2 inspections existent
  checkInspections(mission.id).then(({ hasDepart, hasArrival }) => {
    const options = ['Voir détails', 'Annuler'];
    
    if (hasDepart && hasArrival) {
      options.splice(1, 0, '📊 PDF Comparatif', '📸 Exporter Photos');
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
      },
      async (buttonIndex) => {
        if (options[buttonIndex] === 'Voir détails') {
          navigation.navigate('MissionDetails', { missionId: mission.id });
        } else if (options[buttonIndex] === '📊 PDF Comparatif') {
          await handleGenerateComparisonForMission(mission.id);
        } else if (options[buttonIndex] === '📸 Exporter Photos') {
          await handleExportPhotosForMission(mission.id);
        }
      }
    );
  });
};

// Dans le renderItem de FlatList
<TouchableOpacity
  onPress={() => handleMissionPress(item)}
  onLongPress={() => showMissionMenu(item)}
  activeOpacity={0.7}
>
  <MissionCard mission={item} viewMode={viewMode} />
</TouchableOpacity>
```

---

### 3️⃣ Dans un bouton flottant (FAB)

```typescript
// mobile/src/screens/MissionDetailsScreen.tsx

import { FloatingAction } from 'react-native-floating-action';

const actions = [
  {
    text: 'PDF Comparatif',
    icon: <Ionicons name="document-text" size={20} color="white" />,
    name: 'pdf_comparison',
    position: 1,
    color: '#3b82f6',
  },
  {
    text: 'Exporter Photos',
    icon: <Ionicons name="download" size={20} color="white" />,
    name: 'export_photos',
    position: 2,
    color: '#10b981',
  },
];

return (
  <View style={{ flex: 1 }}>
    {/* ... contenu ... */}
    
    <FloatingAction
      actions={actions}
      onPressItem={(name) => {
        if (name === 'pdf_comparison') {
          handleGenerateComparison();
        } else if (name === 'export_photos') {
          handleExportPhotos();
        }
      }}
      color="#3b82f6"
      distanceToEdge={{ vertical: 20, horizontal: 20 }}
    />
  </View>
);
```

---

### 4️⃣ Dans un bottom sheet

```typescript
// mobile/src/screens/MissionDetailsScreen.tsx

import BottomSheet from '@gorhom/bottom-sheet';

const bottomSheetRef = useRef<BottomSheet>(null);

const handleOpenActions = () => {
  bottomSheetRef.current?.expand();
};

return (
  <View style={{ flex: 1 }}>
    {/* ... contenu ... */}
    
    <TouchableOpacity onPress={handleOpenActions}>
      <Text>⚙️ Actions</Text>
    </TouchableOpacity>
    
    <BottomSheet ref={bottomSheetRef} snapPoints={['25%', '50%']}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
          Actions disponibles
        </Text>
        
        <TouchableOpacity
          style={styles.sheetButton}
          onPress={() => {
            bottomSheetRef.current?.close();
            handleGenerateComparison();
          }}
        >
          <Ionicons name="document-text" size={24} color="#3b82f6" />
          <Text style={styles.sheetButtonText}>Générer PDF Comparatif</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.sheetButton}
          onPress={() => {
            bottomSheetRef.current?.close();
            handleExportPhotos();
          }}
        >
          <Ionicons name="download" size={24} color="#10b981" />
          <Text style={styles.sheetButtonText}>Exporter Photos ZIP</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  </View>
);
```

---

## 🎨 EXEMPLE COMPLET - BOUTONS STYLISÉS

```typescript
// Composant réutilisable
const ComparisonActions = ({ missionId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [inspections, setInspections] = useState({ departure: null, arrival: null });

  useEffect(() => {
    loadInspections();
  }, [missionId]);

  const loadInspections = async () => {
    const { data } = await supabase
      .from('vehicle_inspections')
      .select('*, photos:inspection_photos(*)')
      .eq('mission_id', missionId);

    setInspections({
      departure: data?.find(i => i.inspection_type === 'departure'),
      arrival: data?.find(i => i.inspection_type === 'arrival'),
    });
  };

  const generatePDF = async () => {
    setLoading(true);
    const result = await generateComparisonPDF(
      inspections.departure,
      inspections.arrival
    );
    setLoading(false);

    if (result.success) {
      onSuccess?.('PDF généré avec succès');
    } else {
      Alert.alert('Erreur', result.error);
    }
  };

  const exportPhotos = async () => {
    setLoading(true);
    const result = await exportMissionPhotos(
      missionId,
      inspections.departure?.photos || [],
      inspections.arrival?.photos || []
    );
    setLoading(false);

    if (result.success) {
      onSuccess?.('Photos exportées avec succès');
    } else {
      Alert.alert('Erreur', result.error);
    }
  };

  if (!inspections.departure || !inspections.arrival) {
    return (
      <View style={styles.warningBox}>
        <Ionicons name="alert-circle" size={20} color="#f59e0b" />
        <Text style={styles.warningText}>
          Les deux inspections sont nécessaires pour générer le PDF comparatif
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.actionsContainer}>
      <TouchableOpacity
        style={[styles.actionCard, styles.pdfCard]}
        onPress={generatePDF}
        disabled={loading}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="document-text" size={28} color="#3b82f6" />
        </View>
        <Text style={styles.actionTitle}>PDF Comparatif</Text>
        <Text style={styles.actionSubtitle}>
          Départ vs Arrivée
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, styles.photoCard]}
        onPress={exportPhotos}
        disabled={loading}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="images" size={28} color="#10b981" />
        </View>
        <Text style={styles.actionTitle}>Export Photos</Text>
        <Text style={styles.actionSubtitle}>
          ZIP avec {(inspections.departure?.photos?.length || 0) + (inspections.arrival?.photos?.length || 0)} photos
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pdfCard: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  photoCard: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
  },
});
```

---

## 📱 RÉSULTAT VISUEL

```
┌─────────────────────────────────────┐
│ Mission MIS-001                     │
│ BMW 320d - AB-123-CD               │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────┐  ┌──────────────┐│
│  │  📄          │  │  📸          ││
│  │  PDF         │  │  Export      ││
│  │  Comparatif  │  │  Photos      ││
│  │              │  │              ││
│  │ Départ vs    │  │ ZIP avec     ││
│  │ Arrivée      │  │ 8 photos     ││
│  └──────────────┘  └──────────────┘│
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ INSTALLATION

1. Copier le code dans votre écran de détails
2. Importer les fonctions :
   ```typescript
   import { generateComparisonPDF, exportMissionPhotos } from '../services/comparisonPdfGenerator';
   ```
3. Ajouter les boutons
4. Tester !

**C'est prêt à l'emploi ! 🚀**
