# 📱 APERÇU DES NOTIFICATIONS XCRACKZ

Voici à quoi ressemblent toutes les notifications sur mobile.

---

## 🚗 TRACKING & NAVIGATION

### Notification 1 : Tracking démarré
```
┌─────────────────────────────────────┐
│ 🚗 Tracking démarré                 │
├─────────────────────────────────────┤
│ Le véhicule ET-500-ET a débuté son  │
│ trajet. Suivez sa position en       │
│ temps réel !                        │
│                                     │
│ 📍 Tap to track                     │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyTrackingStarted('ET-500-ET', driverId, clientId, missionId);
```

---

### Notification 2 : Arrivée imminente (5 minutes)
```
┌─────────────────────────────────────┐
│ 📍 Arrivée imminente                │
├─────────────────────────────────────┤
│ ET-500-ET - Arrivée prévue dans     │
│ 5 minutes                           │
│                                     │
│ 🗺️ Voir la position                 │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyPositionAlert(
  'ET-500-ET',
  clientId,
  'arrival_soon',
  'Arrivée prévue dans 5 minutes',
  missionId
);
```

---

### Notification 3 : Retard détecté
```
┌─────────────────────────────────────┐
│ ⏱️ Retard détecté                   │
├─────────────────────────────────────┤
│ ET-500-ET - Retard estimé de        │
│ 15 minutes en raison du trafic      │
│                                     │
│ 🚦 Détails                          │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyPositionAlert(
  'ET-500-ET',
  clientId,
  'delay',
  'Retard estimé de 15 minutes en raison du trafic',
  missionId
);
```

---

## 🎯 MISSIONS

### Notification 4 : Mission assignée
```
┌─────────────────────────────────────┐
│ 🎯 Nouvelle mission assignée        │
├─────────────────────────────────────┤
│ Une mission vous a été assignée par │
│ RENAULT TRUCKS Paris                │
│ 📦 MISS-2025-001                    │
│ 🚗 Véhicule: ET-500-ET              │
│                                     │
│ 👁️ Voir la mission                  │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyMissionAssigned(
  driverId,
  'RENAULT TRUCKS Paris',
  {
    reference: 'MISS-2025-001',
    pickupAddress: '15 Rue de la Paix, 75002 Paris',
    deliveryAddress: '45 Champs-Élysées, 75008 Paris',
    vehicleRegistration: 'ET-500-ET',
    scheduledDate: '2025-10-15T09:00:00Z'
  }
);
```

---

### Notification 5 : Mission modifiée
```
┌─────────────────────────────────────┐
│ 📝 Mission modifiée                 │
├─────────────────────────────────────┤
│ Mission MISS-2025-001 : L'heure de  │
│ livraison a été modifiée : 14h00    │
│ au lieu de 09h00                    │
│                                     │
│ 📋 Voir les détails                 │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyMissionUpdated(
  driverId,
  'MISS-2025-001',
  'L\'heure de livraison a été modifiée : 14h00 au lieu de 09h00'
);
```

---

## 📋 ÉTATS DES LIEUX

### Notification 6 : État des lieux de départ
```
┌─────────────────────────────────────┐
│ 📋 État des lieux de départ         │
│    disponible                       │
├─────────────────────────────────────┤
│ L'état des lieux de départ pour le  │
│ véhicule ET-500-ET est disponible   │
│ depuis la page Rapports.            │
│ 📦 Mission: MISS-2025-001           │
│                                     │
│ 📄 Voir le rapport                  │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyInspectionAvailable(
  clientId,
  'depart',
  'MISS-2025-001',
  'ET-500-ET'
);
```

---

### Notification 7 : État des lieux final
```
┌─────────────────────────────────────┐
│ ✅ État des lieux final disponible  │
├─────────────────────────────────────┤
│ L'état des lieux final pour le      │
│ véhicule ET-500-ET est disponible   │
│ depuis la page Rapports.            │
│ 📦 Mission: MISS-2025-001           │
│                                     │
│ 📄 Consulter le rapport             │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyInspectionAvailable(
  clientId,
  'arrivee',
  'MISS-2025-001',
  'ET-500-ET'
);
```

---

### Notification 8 : Photos disponibles
```
┌─────────────────────────────────────┐
│ 📸 Photos disponibles               │
├─────────────────────────────────────┤
│ Le rapport pour ET-500-ET (Mission  │
│ MISS-2025-001) est disponible dans  │
│ la section Rapports.                │
│                                     │
│ 🖼️ Voir les photos                  │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyReportAvailable(
  clientId,
  'MISS-2025-001',
  'ET-500-ET',
  'photos'
);
```

---

## ✅ LIVRAISONS

### Notification 9 : Livraison réussie (Simple)
```
┌─────────────────────────────────────┐
│ ✅ Véhicule livré avec succès       │
├─────────────────────────────────────┤
│ Le véhicule ET-000-ET a bien été    │
│ livré à Jean Dupont.                │
│ 📍 45 Avenue des Champs-Élysées,    │
│    75008 Paris                      │
│ 🕐 12 oct. 14:30                    │
│                                     │
│ 📋 Voir les détails                 │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyVehicleDelivered(
  clientId,
  'ET-000-ET',
  { nom: 'Dupont', prenom: 'Jean' },
  {
    missionReference: 'MISS-2025-001',
    deliveryAddress: '45 Avenue des Champs-Élysées, 75008 Paris',
    deliveryTime: new Date().toISOString()
  }
);
```

---

### Notification 10 : Livraison avec fonction
```
┌─────────────────────────────────────┐
│ ✅ Véhicule livré avec succès       │
├─────────────────────────────────────┤
│ Le véhicule ET-000-ET a bien été    │
│ livré à Jean Dupont (Responsable    │
│ Parc Auto).                         │
│ 📍 45 Avenue des Champs-Élysées,    │
│    75008 Paris                      │
│ 🕐 12 oct. 14:30                    │
│                                     │
│ ✍️ Signature disponible              │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyVehicleDelivered(
  clientId,
  'ET-000-ET',
  {
    nom: 'Dupont',
    prenom: 'Jean',
    fonction: 'Responsable Parc Auto'
  },
  deliveryDetails
);
```

---

## ⚠️ PROBLÈMES

### Notification 11 : Réceptionnaire absent
```
┌─────────────────────────────────────┐
│ ⚠️ Réceptionnaire absent            │
├─────────────────────────────────────┤
│ ET-500-ET - Le réceptionnaire n'est │
│ pas présent à l'adresse indiquée.   │
│ Contact en cours.                   │
│ 📦 Mission: MISS-2025-001           │
│                                     │
│ 📞 Contacter le chauffeur           │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyDeliveryIssue(
  clientId,
  'ET-500-ET',
  'absent',
  'Le réceptionnaire n\'est pas présent à l\'adresse indiquée. Contact en cours.',
  'MISS-2025-001'
);
```

---

### Notification 12 : Livraison refusée
```
┌─────────────────────────────────────┐
│ ❌ Livraison refusée                │
├─────────────────────────────────────┤
│ ET-500-ET - Le réceptionnaire a     │
│ refusé la livraison : véhicule non  │
│ conforme aux attentes               │
│ 📦 Mission: MISS-2025-001           │
│                                     │
│ 📋 Voir le rapport                  │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyDeliveryIssue(
  clientId,
  'ET-500-ET',
  'refus',
  'Le réceptionnaire a refusé la livraison : véhicule non conforme aux attentes',
  'MISS-2025-001'
);
```

---

### Notification 13 : Dommage constaté
```
┌─────────────────────────────────────┐
│ 🔧 Dommage constaté                 │
├─────────────────────────────────────┤
│ ET-500-ET - Rayure constatée sur    │
│ l'aile avant gauche lors de la      │
│ livraison. Photos prises.           │
│ 📦 Mission: MISS-2025-001           │
│                                     │
│ 📸 Voir les photos                  │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyDeliveryIssue(
  clientId,
  'ET-500-ET',
  'dommage',
  'Rayure constatée sur l\'aile avant gauche lors de la livraison. Photos prises.',
  'MISS-2025-001'
);
```

---

## 👥 NOTIFICATIONS GROUPÉES

### Notification 14 : Mission urgente (Tous)
```
┌─────────────────────────────────────┐
│ 🚨 Mission urgente modifiée         │
├─────────────────────────────────────┤
│ La mission MISS-2025-001 a été      │
│ marquée comme urgente               │
│                                     │
│ 🔥 Action requise                   │
└─────────────────────────────────────┘
```
**Code:**
```typescript
await notifyAllStakeholders(
  {
    driverUserId: driverId,
    clientUserId: clientId,
    adminUserIds: [admin1Id, admin2Id]
  },
  {
    type: NotificationType.MISSION_UPDATED,
    title: '🚨 Mission urgente modifiée',
    message: 'La mission MISS-2025-001 a été marquée comme urgente',
    data: { mission_reference: 'MISS-2025-001', priority: 'urgent' },
    channel: 'urgent'
  }
);
```

---

## 🎨 CANAUX DE NOTIFICATION

### 🔵 Canal "missions" (Importance: 4)
- Nouvelles missions
- Livraisons confirmées
- Mission modifiée

### 🔴 Canal "urgent" (Importance: 5)
- Problèmes de livraison
- Retards critiques
- Alertes urgentes

### 🟢 Canal "updates" (Importance: 3)
- États des lieux disponibles
- Rapports disponibles
- Mises à jour système

### 🟡 Canal "navigation" (Importance: 4)
- Tracking démarré
- Arrivée imminente
- Alertes de position

---

## 📊 STATISTIQUES

Toutes ces notifications sont automatiquement trackées dans la table `notification_logs` :

```sql
SELECT 
  type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE action = 'clicked') as clicked,
  ROUND(
    COUNT(*) FILTER (WHERE action = 'clicked')::NUMERIC / 
    COUNT(*) * 100, 1
  ) as click_rate
FROM notification_logs
GROUP BY type
ORDER BY total DESC;
```

---

## 🧪 TESTER VOS NOTIFICATIONS

Utilisez le script PowerShell :
```powershell
.\TEST_NOTIFICATIONS.ps1
```

Ou testez directement dans votre code :
```typescript
import { notifyTrackingStarted } from '../services/NotificationHelpers';

// Test
await notifyTrackingStarted('ET-999-TEST', driverId, clientId, 'test-mission');
```

---

**Toutes vos notifications sont prêtes ! 🎉**

📖 Voir `NOTIFICATION_QUICKSTART.md` pour démarrer  
🎨 Voir `NOTIFICATIONS_STYLE_GUIDE.md` pour le style  
📚 Voir `NOTIFICATION_EXAMPLES.md` pour plus d'exemples
