// 🚀 SYSTÈME DE NOTIFICATIONS CHECKFLOW
// Notifications automatiques pour le tracking, missions, et livraisons

import { supabase } from '../lib/supabase';
import { NotificationType } from '../config/onesignal';

/**
 * SERVICE DE NOTIFICATIONS AUTOMATIQUES
 * Envoie des notifications contextuelles basées sur les événements de l'app
 */

// =====================================================
// 1. TRACKING VÉHICULE EN TEMPS RÉEL
// =====================================================

/**
 * Notifie le début du tracking d'un véhicule
 */
export async function notifyTrackingStarted(
  vehicleRegistration: string,
  driverUserId: string,
  clientUserId: string,
  missionId: string
) {
  try {
    // Notification au client
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: clientUserId,
        type: NotificationType.NAVIGATION_ALERT,
        title: '🚗 Tracking démarré',
        message: `Le véhicule ${vehicleRegistration} a débuté son trajet. Suivez sa position en temps réel !`,
        data: {
          mission_id: missionId,
          vehicle_registration: vehicleRegistration,
          screen: 'TrackingMap',
          params: { missionId, vehicleId: vehicleRegistration },
        },
        channel: 'navigation',
      },
    });

    console.log(`✅ Notification tracking envoyée pour ${vehicleRegistration}`);
  } catch (error) {
    console.error('Erreur notification tracking:', error);
  }
}

/**
 * Notifie les alertes de position (retards, déviations, etc.)
 */
export async function notifyPositionAlert(
  vehicleRegistration: string,
  clientUserId: string,
  alertType: 'delay' | 'deviation' | 'arrival_soon',
  message: string,
  missionId: string
) {
  const titles = {
    delay: '⏱️ Retard détecté',
    deviation: '🔄 Déviation de l\'itinéraire',
    arrival_soon: '📍 Arrivée imminente',
  };

  try {
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: clientUserId,
        type: NotificationType.NAVIGATION_ALERT,
        title: titles[alertType],
        message: `${vehicleRegistration} - ${message}`,
        data: {
          mission_id: missionId,
          vehicle_registration: vehicleRegistration,
          alert_type: alertType,
          screen: 'TrackingMap',
        },
        channel: alertType === 'delay' ? 'urgent' : 'navigation',
      },
    });
  } catch (error) {
    console.error('Erreur notification position:', error);
  }
}

// =====================================================
// 2. MISSIONS ASSIGNÉES
// =====================================================

/**
 * Notifie l'assignation d'une nouvelle mission
 */
export async function notifyMissionAssigned(
  driverUserId: string,
  doneurOrdreNom: string,
  missionDetails: {
    reference: string;
    pickupAddress: string;
    deliveryAddress: string;
    vehicleRegistration: string;
    scheduledDate: string;
  }
) {
  try {
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: driverUserId,
        type: NotificationType.MISSION_ASSIGNED,
        title: '🎯 Nouvelle mission assignée',
        message: `Une mission vous a été assignée par ${doneurOrdreNom}\n📦 ${missionDetails.reference}\n🚗 Véhicule: ${missionDetails.vehicleRegistration}`,
        data: {
          mission_reference: missionDetails.reference,
          doneur_ordre: doneurOrdreNom,
          pickup: missionDetails.pickupAddress,
          delivery: missionDetails.deliveryAddress,
          vehicle: missionDetails.vehicleRegistration,
          screen: 'MissionDetail',
          params: { missionId: missionDetails.reference },
        },
        channel: 'missions',
      },
    });

    console.log(`✅ Notification mission assignée envoyée à ${driverUserId}`);
  } catch (error) {
    console.error('Erreur notification mission assignée:', error);
  }
}

/**
 * Notifie la modification d'une mission
 */
export async function notifyMissionUpdated(
  driverUserId: string,
  missionReference: string,
  changeDescription: string
) {
  try {
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: driverUserId,
        type: NotificationType.MISSION_UPDATED,
        title: '📝 Mission modifiée',
        message: `Mission ${missionReference} : ${changeDescription}`,
        data: {
          mission_reference: missionReference,
          change: changeDescription,
          screen: 'MissionDetail',
        },
        channel: 'updates',
      },
    });
  } catch (error) {
    console.error('Erreur notification mission modifiée:', error);
  }
}

// =====================================================
// 3. ÉTATS DES LIEUX ET RAPPORTS
// =====================================================

/**
 * Notifie qu'un état des lieux est disponible
 */
export async function notifyInspectionAvailable(
  clientUserId: string,
  inspectionType: 'depart' | 'arrivee',
  missionReference: string,
  vehicleRegistration: string
) {
  const types = {
    depart: 'État des lieux de départ',
    arrivee: 'État des lieux final',
  };

  const emojis = {
    depart: '📋',
    arrivee: '✅',
  };

  try {
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: clientUserId,
        type: NotificationType.INSPECTION_REQUIRED,
        title: `${emojis[inspectionType]} ${types[inspectionType]} disponible`,
        message: `L'${types[inspectionType].toLowerCase()} pour le véhicule ${vehicleRegistration} est disponible depuis la page Rapports.\n📦 Mission: ${missionReference}`,
        data: {
          mission_reference: missionReference,
          vehicle_registration: vehicleRegistration,
          inspection_type: inspectionType,
          screen: 'MissionReports',
          params: { missionId: missionReference, tab: 'inspections' },
        },
        channel: 'updates',
      },
    });

    console.log(`✅ Notification état des lieux (${inspectionType}) envoyée`);
  } catch (error) {
    console.error('Erreur notification état des lieux:', error);
  }
}

/**
 * Notifie qu'un rapport complet est disponible
 */
export async function notifyReportAvailable(
  clientUserId: string,
  missionReference: string,
  vehicleRegistration: string,
  reportType: 'complet' | 'photos' | 'signature'
) {
  const titles = {
    complet: '📄 Rapport complet disponible',
    photos: '📸 Photos disponibles',
    signature: '✍️ Signature électronique reçue',
  };

  try {
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: clientUserId,
        type: NotificationType.INSPECTION_REQUIRED,
        title: titles[reportType],
        message: `Le rapport pour ${vehicleRegistration} (Mission ${missionReference}) est disponible dans la section Rapports.`,
        data: {
          mission_reference: missionReference,
          vehicle_registration: vehicleRegistration,
          report_type: reportType,
          screen: 'MissionReports',
        },
        channel: 'updates',
      },
    });
  } catch (error) {
    console.error('Erreur notification rapport:', error);
  }
}

// =====================================================
// 4. LIVRAISONS ET RÉCEPTIONS
// =====================================================

/**
 * Notifie la livraison réussie d'un véhicule
 */
export async function notifyVehicleDelivered(
  clientUserId: string,
  vehicleRegistration: string,
  receptionnaire: {
    nom: string;
    prenom: string;
    fonction?: string;
  },
  deliveryDetails: {
    missionReference: string;
    deliveryAddress: string;
    deliveryTime: string;
  }
) {
  const receptionnaireNom = `${receptionnaire.prenom} ${receptionnaire.nom}`;
  const fonction = receptionnaire.fonction ? ` (${receptionnaire.fonction})` : '';

  try {
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: clientUserId,
        type: NotificationType.MISSION_UPDATED,
        title: '✅ Véhicule livré avec succès',
        message: `Le véhicule ${vehicleRegistration} a bien été livré à ${receptionnaireNom}${fonction}.\n📍 ${deliveryDetails.deliveryAddress}\n🕐 ${deliveryDetails.deliveryTime}`,
        data: {
          mission_reference: deliveryDetails.missionReference,
          vehicle_registration: vehicleRegistration,
          receptionnaire_nom: receptionnaireNom,
          receptionnaire_fonction: receptionnaire.fonction,
          delivery_address: deliveryDetails.deliveryAddress,
          delivery_time: deliveryDetails.deliveryTime,
          screen: 'MissionDetail',
          params: { missionId: deliveryDetails.missionReference },
        },
        channel: 'missions',
      },
    });

    console.log(`✅ Notification livraison envoyée pour ${vehicleRegistration}`);
  } catch (error) {
    console.error('Erreur notification livraison:', error);
  }
}

/**
 * Notifie un problème de livraison
 */
export async function notifyDeliveryIssue(
  clientUserId: string,
  vehicleRegistration: string,
  issueType: 'absent' | 'refus' | 'dommage' | 'autre',
  issueDescription: string,
  missionReference: string
) {
  const titles = {
    absent: '⚠️ Réceptionnaire absent',
    refus: '❌ Livraison refusée',
    dommage: '🔧 Dommage constaté',
    autre: '⚠️ Problème de livraison',
  };

  try {
    await supabase.functions.invoke('send-notification', {
      body: {
        userId: clientUserId,
        type: NotificationType.MISSION_UPDATED,
        title: titles[issueType],
        message: `${vehicleRegistration} - ${issueDescription}\n📦 Mission: ${missionReference}`,
        data: {
          mission_reference: missionReference,
          vehicle_registration: vehicleRegistration,
          issue_type: issueType,
          issue_description: issueDescription,
          screen: 'MissionDetail',
        },
        channel: 'urgent',
      },
    });
  } catch (error) {
    console.error('Erreur notification problème livraison:', error);
  }
}

// =====================================================
// 5. NOTIFICATIONS GROUPÉES (MULTI-DESTINATAIRES)
// =====================================================

/**
 * Notifie tous les intervenants d'une mission
 */
export async function notifyAllStakeholders(
  stakeholders: {
    driverUserId?: string;
    clientUserId?: string;
    adminUserIds?: string[];
  },
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    data: any;
    channel: string;
  }
) {
  const userIds: string[] = [];

  if (stakeholders.driverUserId) userIds.push(stakeholders.driverUserId);
  if (stakeholders.clientUserId) userIds.push(stakeholders.clientUserId);
  if (stakeholders.adminUserIds) userIds.push(...stakeholders.adminUserIds);

  if (userIds.length === 0) return;

  try {
    await supabase.functions.invoke('send-notification', {
      body: {
        userIds,
        ...notification,
      },
    });

    console.log(`✅ Notification envoyée à ${userIds.length} destinataires`);
  } catch (error) {
    console.error('Erreur notification groupée:', error);
  }
}

// =====================================================
// 6. HELPER - FORMATER LES DONNÉES
// =====================================================

/**
 * Formate une date pour les notifications
 */
export function formatNotificationDate(date: string | Date): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  };
  return d.toLocaleDateString('fr-FR', options);
}

/**
 * Extrait le nom complet d'un utilisateur
 */
export function formatUserName(user: {
  prenom?: string;
  nom?: string;
  email?: string;
}): string {
  if (user.prenom && user.nom) {
    return `${user.prenom} ${user.nom}`;
  }
  if (user.nom) return user.nom;
  if (user.email) return user.email.split('@')[0];
  return 'Utilisateur';
}
