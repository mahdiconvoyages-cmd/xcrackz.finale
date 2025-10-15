/**
 * Service Clara - Gestion des Contacts et Planning
 * 
 * Permet à Clara d'accéder aux contacts et leurs plannings :
 * - Lister tous les contacts avec leurs informations
 * - Consulter le planning d'un contact spécifique
 * - Vérifier la disponibilité d'un chauffeur à une date
 * - Modifier le planning d'un contact
 * - Obtenir des statistiques sur les disponibilités hebdomadaires
 */

import { supabase } from '../lib/supabase';
import {
  getContactAvailabilities,
  getAllContactsAvailabilities,
  setAvailability,
  setAvailabilityRange,
  type Availability,
  type ContactAvailability,
} from './availabilityService';

// ==========================================
// TYPES
// ==========================================

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  contact_type: 'driver' | 'company' | 'personal';
  contact_role?: string;
  has_calendar_access: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactWithAvailability extends Contact {
  availability_status?: 'available' | 'unavailable' | 'partially_available' | 'unknown';
  next_available_date?: string;
  total_missions?: number;
  last_mission_date?: string;
}

export interface ContactPlanningDetail {
  contact: Contact;
  availabilities: Availability[];
  available_days: number;
  unavailable_days: number;
  partially_available_days: number;
  total_days_in_range: number;
}

export interface WeeklyAvailabilityStats {
  total_contacts: number;
  contacts_with_access: number;
  available_this_week: ContactWithAvailability[];
  unavailable_this_week: ContactWithAvailability[];
  partially_available_this_week: ContactWithAvailability[];
  week_start_date: string;
  week_end_date: string;
}

export interface DriverAvailabilityCheck {
  driver_name: string;
  driver_email: string;
  date: string;
  is_available: boolean;
  status: 'available' | 'unavailable' | 'partially_available' | 'unknown';
  start_time?: string;
  end_time?: string;
  notes?: string;
  alternative_dates?: string[]; // Prochaines dates disponibles si pas dispo
}

// ==========================================
// 1. LISTER TOUS LES CONTACTS
// ==========================================

/**
 * Liste tous les contacts de l'utilisateur avec informations complètes
 */
export async function listMyContacts(userId: string): Promise<{
  success: boolean;
  contacts: ContactWithAvailability[];
  total: number;
  by_type: {
    drivers: number;
    companies: number;
    personal: number;
  };
  with_calendar_access: number;
  message?: string;
}> {
  try {
    // Récupérer tous les contacts
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('contact_name');

    if (error) {
      console.error('Error fetching contacts:', error);
      return {
        success: false,
        contacts: [],
        total: 0,
        by_type: { drivers: 0, companies: 0, personal: 0 },
        with_calendar_access: 0,
        message: 'Erreur lors de la récupération des contacts',
      };
    }

    if (!contacts || contacts.length === 0) {
      return {
        success: true,
        contacts: [],
        total: 0,
        by_type: { drivers: 0, companies: 0, personal: 0 },
        with_calendar_access: 0,
        message: 'Aucun contact trouvé',
      };
    }

    // Enrichir avec données de disponibilité et missions
    const enrichedContacts: ContactWithAvailability[] = await Promise.all(
      contacts.map(async (contact) => {
        // Vérifier la disponibilité d'aujourd'hui
        const today = new Date().toISOString().split('T')[0];
        const { data: todayAvailability } = await supabase
          .from('availability_calendar')
          .select('status')
          .eq('user_id', contact.contact_user_id)
          .eq('date', today)
          .maybeSingle();

        // Trouver la prochaine date disponible
        const { data: nextAvailable } = await supabase
          .from('availability_calendar')
          .select('date')
          .eq('user_id', contact.contact_user_id)
          .eq('status', 'available')
          .gte('date', today)
          .order('date')
          .limit(1)
          .maybeSingle();

        // Compter les missions
        const { count: missionCount } = await supabase
          .from('missions')
          .select('id', { count: 'exact', head: true })
          .or(`assigned_driver_id.eq.${contact.contact_user_id},provider_id.eq.${contact.contact_user_id}`);

        // Dernière mission
        const { data: lastMission } = await supabase
          .from('missions')
          .select('created_at')
          .or(`assigned_driver_id.eq.${contact.contact_user_id},provider_id.eq.${contact.contact_user_id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...contact,
          availability_status: todayAvailability?.status || 'unknown',
          next_available_date: nextAvailable?.date,
          total_missions: missionCount || 0,
          last_mission_date: lastMission?.created_at,
        };
      })
    );

    // Statistiques
    const byType = {
      drivers: enrichedContacts.filter((c) => c.contact_type === 'driver').length,
      companies: enrichedContacts.filter((c) => c.contact_type === 'company').length,
      personal: enrichedContacts.filter((c) => c.contact_type === 'personal').length,
    };

    const withCalendarAccess = enrichedContacts.filter((c) => c.has_calendar_access).length;

    return {
      success: true,
      contacts: enrichedContacts,
      total: enrichedContacts.length,
      by_type: byType,
      with_calendar_access: withCalendarAccess,
    };
  } catch (error) {
    console.error('Error in listMyContacts:', error);
    return {
      success: false,
      contacts: [],
      total: 0,
      by_type: { drivers: 0, companies: 0, personal: 0 },
      with_calendar_access: 0,
      message: 'Erreur interne',
    };
  }
}

/**
 * Formate la liste de contacts pour Clara
 */
export function formatContactsForClara(
  contacts: ContactWithAvailability[],
  totalCount: number,
  stats: { by_type: any; with_calendar_access: number }
): string {
  if (contacts.length === 0) {
    return '❌ Aucun contact trouvé dans votre carnet d\'adresses.';
  }

  let result = `📇 **${totalCount} contact(s) dans votre carnet d'adresses**\n\n`;

  // Statistiques
  result += `📊 **Répartition :**\n`;
  result += `- 🚗 Chauffeurs : ${stats.by_type.drivers}\n`;
  result += `- 🏢 Entreprises : ${stats.by_type.companies}\n`;
  result += `- 👤 Personnels : ${stats.by_type.personal}\n`;
  result += `- 📅 Accès planning : ${stats.with_calendar_access}/${totalCount}\n\n`;

  // Liste des contacts (limité à 10 pour ne pas surcharger)
  const displayContacts = contacts.slice(0, 10);

  result += `📋 **Liste des contacts :**\n\n`;

  displayContacts.forEach((contact, index) => {
    const icon = contact.contact_type === 'driver' ? '🚗' : contact.contact_type === 'company' ? '🏢' : '👤';
    const statusIcon =
      contact.availability_status === 'available'
        ? '✅'
        : contact.availability_status === 'unavailable'
        ? '❌'
        : contact.availability_status === 'partially_available'
        ? '⏰'
        : '❓';

    result += `**${index + 1}. ${icon} ${contact.contact_name}**\n`;
    result += `   📧 ${contact.contact_email}\n`;
    if (contact.contact_phone) result += `   📞 ${contact.contact_phone}\n`;
    if (contact.contact_role) result += `   💼 ${contact.contact_role}\n`;
    result += `   ${statusIcon} Aujourd'hui : ${
      contact.availability_status === 'available'
        ? 'Disponible'
        : contact.availability_status === 'unavailable'
        ? 'Indisponible'
        : contact.availability_status === 'partially_available'
        ? 'Partiellement dispo'
        : 'Statut inconnu'
    }\n`;
    if (contact.next_available_date) {
      result += `   📅 Prochaine dispo : ${new Date(contact.next_available_date).toLocaleDateString('fr-FR')}\n`;
    }
    if (contact.total_missions && contact.total_missions > 0) {
      result += `   🎯 Missions : ${contact.total_missions}\n`;
    }
    result += `   ${contact.has_calendar_access ? '🔓 Planning accessible' : '🔒 Planning non accessible'}\n`;
    if (contact.is_favorite) result += `   ⭐ Favori\n`;
    result += '\n';
  });

  if (contacts.length > 10) {
    result += `\n_... et ${contacts.length - 10} autre(s) contact(s)_\n\n`;
  }

  result += `\n💡 **Pour consulter un planning**, dis-moi :\n`;
  result += `"Affiche le planning de [nom du contact]" ou "Est-ce que [nom] est dispo cette semaine ?"\n`;

  return result;
}

// ==========================================
// 2. CONSULTER LE PLANNING D'UN CONTACT
// ==========================================

/**
 * Récupère le planning détaillé d'un contact pour une période
 */
export async function getContactPlanning(
  userId: string,
  contactEmail: string,
  startDate: Date,
  endDate: Date
): Promise<{
  success: boolean;
  planning?: ContactPlanningDetail;
  message?: string;
}> {
  try {
    // Récupérer le contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_email', contactEmail)
      .maybeSingle();

    if (contactError || !contact) {
      return {
        success: false,
        message: `Contact non trouvé avec l'email: ${contactEmail}`,
      };
    }

    // Vérifier l'accès au planning
    if (!contact.has_calendar_access) {
      return {
        success: false,
        message: `❌ Vous n'avez pas accès au planning de ${contact.contact_name}. Demandez l'accès d'abord.`,
      };
    }

    // Récupérer les disponibilités
    const availabilities = await getContactAvailabilities(contact.contact_user_id, startDate, endDate);

    // Calculer les statistiques
    const availableDays = availabilities.filter((a) => a.status === 'available').length;
    const unavailableDays = availabilities.filter((a) => a.status === 'unavailable').length;
    const partiallyAvailableDays = availabilities.filter((a) => a.status === 'partially_available').length;

    // Calculer le nombre total de jours dans la période
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const planningDetail: ContactPlanningDetail = {
      contact,
      availabilities,
      available_days: availableDays,
      unavailable_days: unavailableDays,
      partially_available_days: partiallyAvailableDays,
      total_days_in_range: totalDays,
    };

    return {
      success: true,
      planning: planningDetail,
    };
  } catch (error) {
    console.error('Error in getContactPlanning:', error);
    return {
      success: false,
      message: 'Erreur lors de la récupération du planning',
    };
  }
}

/**
 * Formate le planning pour Clara
 */
export function formatPlanningForClara(planning: ContactPlanningDetail): string {
  const { contact, availabilities, available_days, unavailable_days, partially_available_days, total_days_in_range } =
    planning;

  let result = `📅 **Planning de ${contact.contact_name}**\n\n`;

  result += `📊 **Statistiques de la période (${total_days_in_range} jours) :**\n`;
  result += `- ✅ Disponible : ${available_days} jour(s)\n`;
  result += `- ❌ Indisponible : ${unavailable_days} jour(s)\n`;
  result += `- ⏰ Partiellement dispo : ${partially_available_days} jour(s)\n`;
  result += `- ❓ Non renseigné : ${total_days_in_range - availabilities.length} jour(s)\n\n`;

  if (availabilities.length === 0) {
    result += `⚠️ Aucune disponibilité renseignée pour cette période.\n`;
    return result;
  }

  // Grouper par semaine
  const byWeek: { [key: string]: Availability[] } = {};
  availabilities.forEach((availability) => {
    const date = new Date(availability.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1); // Lundi de la semaine
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!byWeek[weekKey]) {
      byWeek[weekKey] = [];
    }
    byWeek[weekKey].push(availability);
  });

  result += `📅 **Disponibilités par semaine :**\n\n`;

  Object.keys(byWeek)
    .sort()
    .forEach((weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      result += `**Semaine du ${new Date(weekStart).toLocaleDateString('fr-FR')} au ${weekEnd.toLocaleDateString(
        'fr-FR'
      )}**\n`;

      byWeek[weekStart].forEach((availability) => {
        const date = new Date(availability.date);
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('fr-FR');

        const statusIcon =
          availability.status === 'available' ? '✅' : availability.status === 'unavailable' ? '❌' : '⏰';

        result += `  ${statusIcon} ${dayName} ${dateStr}`;

        if (availability.status === 'partially_available' && availability.start_time && availability.end_time) {
          result += ` (${availability.start_time} - ${availability.end_time})`;
        }

        if (availability.notes) {
          result += ` - _${availability.notes}_`;
        }

        result += '\n';
      });

      result += '\n';
    });

  result += `\n💡 **Pour vérifier une date précise**, dis-moi :\n`;
  result += `"Est-ce que ${contact.contact_name} est dispo le [date] ?"\n`;

  return result;
}

// ==========================================
// 3. VÉRIFIER DISPONIBILITÉ D'UN CHAUFFEUR
// ==========================================

/**
 * Vérifie si un chauffeur est disponible à une date spécifique
 */
export async function checkDriverAvailability(
  userId: string,
  driverEmail: string,
  date: string // YYYY-MM-DD
): Promise<{
  success: boolean;
  availability?: DriverAvailabilityCheck;
  message?: string;
}> {
  try {
    // Récupérer le contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_email', driverEmail)
      .maybeSingle();

    if (contactError || !contact) {
      return {
        success: false,
        message: `Contact non trouvé avec l'email: ${driverEmail}`,
      };
    }

    // Vérifier l'accès au planning
    if (!contact.has_calendar_access) {
      return {
        success: false,
        message: `❌ Vous n'avez pas accès au planning de ${contact.contact_name}`,
      };
    }

    // Récupérer la disponibilité pour cette date
    const { data: availability, error: availError } = await supabase
      .from('availability_calendar')
      .select('*')
      .eq('user_id', contact.contact_user_id)
      .eq('date', date)
      .maybeSingle();

    if (availError && availError.code !== 'PGRST116') {
      // Ignorer l'erreur "no rows returned"
      console.error('Error fetching availability:', availError);
      return {
        success: false,
        message: 'Erreur lors de la vérification',
      };
    }

    // Si aucune disponibilité trouvée, chercher les prochaines dates disponibles
    let alternativeDates: string[] = [];
    if (!availability || availability.status !== 'available') {
      const { data: nextAvailabilities } = await supabase
        .from('availability_calendar')
        .select('date')
        .eq('user_id', contact.contact_user_id)
        .eq('status', 'available')
        .gte('date', date)
        .order('date')
        .limit(3);

      if (nextAvailabilities && nextAvailabilities.length > 0) {
        alternativeDates = nextAvailabilities.map((a) => a.date);
      }
    }

    const result: DriverAvailabilityCheck = {
      driver_name: contact.contact_name,
      driver_email: contact.contact_email,
      date,
      is_available: availability?.status === 'available',
      status: availability?.status || 'unknown',
      start_time: availability?.start_time,
      end_time: availability?.end_time,
      notes: availability?.notes,
      alternative_dates: alternativeDates,
    };

    return {
      success: true,
      availability: result,
    };
  } catch (error) {
    console.error('Error in checkDriverAvailability:', error);
    return {
      success: false,
      message: 'Erreur interne',
    };
  }
}

/**
 * Formate la disponibilité du chauffeur pour Clara
 */
export function formatDriverAvailabilityForClara(availability: DriverAvailabilityCheck): string {
  const dateObj = new Date(availability.date);
  const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
  const dateStr = dateObj.toLocaleDateString('fr-FR');

  let result = `🔍 **Disponibilité de ${availability.driver_name}**\n\n`;
  result += `📅 **Date :** ${dayName} ${dateStr}\n\n`;

  if (availability.is_available) {
    result += `✅ **${availability.driver_name} est DISPONIBLE** ce jour-là !\n\n`;

    if (availability.start_time && availability.end_time) {
      result += `⏰ **Horaires :** ${availability.start_time} - ${availability.end_time}\n`;
    } else {
      result += `⏰ **Horaires :** Toute la journée\n`;
    }

    if (availability.notes) {
      result += `📝 **Note :** ${availability.notes}\n`;
    }

    result += `\n💡 Vous pouvez lui proposer une mission pour cette date !\n`;
  } else if (availability.status === 'unavailable') {
    result += `❌ **${availability.driver_name} n'est PAS DISPONIBLE** ce jour-là.\n\n`;

    if (availability.notes) {
      result += `📝 **Raison :** ${availability.notes}\n\n`;
    }

    if (availability.alternative_dates && availability.alternative_dates.length > 0) {
      result += `🔄 **Prochaines dates disponibles :**\n`;
      availability.alternative_dates.forEach((altDate) => {
        const altDateObj = new Date(altDate);
        const altDayName = altDateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
        const altDateStr = altDateObj.toLocaleDateString('fr-FR');
        result += `  ✅ ${altDayName} ${altDateStr}\n`;
      });
    } else {
      result += `⚠️ Aucune autre disponibilité renseignée dans les prochains jours.\n`;
    }
  } else if (availability.status === 'partially_available') {
    result += `⏰ **${availability.driver_name} est PARTIELLEMENT DISPONIBLE** ce jour-là.\n\n`;

    if (availability.start_time && availability.end_time) {
      result += `⏰ **Horaires disponibles :** ${availability.start_time} - ${availability.end_time}\n`;
    }

    if (availability.notes) {
      result += `📝 **Note :** ${availability.notes}\n`;
    }

    result += `\n💡 Vérifiez si les horaires correspondent à votre mission.\n`;
  } else {
    result += `❓ **Aucune information de disponibilité** pour cette date.\n\n`;
    result += `⚠️ ${availability.driver_name} n'a pas encore renseigné son planning pour ce jour.\n\n`;

    if (availability.alternative_dates && availability.alternative_dates.length > 0) {
      result += `📅 **Dates où il/elle est disponible :**\n`;
      availability.alternative_dates.forEach((altDate) => {
        const altDateObj = new Date(altDate);
        const altDayName = altDateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
        const altDateStr = altDateObj.toLocaleDateString('fr-FR');
        result += `  ✅ ${altDayName} ${altDateStr}\n`;
      });
    }
  }

  return result;
}

// ==========================================
// 4. OBTENIR STATISTIQUES HEBDOMADAIRES
// ==========================================

/**
 * Récupère les statistiques de disponibilité pour la semaine en cours
 */
export async function getWeeklyAvailabilityStats(userId: string): Promise<{
  success: boolean;
  stats?: WeeklyAvailabilityStats;
  message?: string;
}> {
  try {
    // Calculer début et fin de semaine (lundi à dimanche)
    const today = new Date();
    const dayOfWeek = today.getDay() || 7; // Dimanche = 7
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek + 1); // Lundi
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Dimanche
    weekEnd.setHours(23, 59, 59, 999);

    // Récupérer tous les contacts
    const contactsResult = await listMyContacts(userId);

    if (!contactsResult.success) {
      return {
        success: false,
        message: contactsResult.message,
      };
    }

    const allContacts = contactsResult.contacts;
    const contactsWithAccess = allContacts.filter((c) => c.has_calendar_access);

    if (contactsWithAccess.length === 0) {
      return {
        success: true,
        stats: {
          total_contacts: allContacts.length,
          contacts_with_access: 0,
          available_this_week: [],
          unavailable_this_week: [],
          partially_available_this_week: [],
          week_start_date: weekStart.toISOString().split('T')[0],
          week_end_date: weekEnd.toISOString().split('T')[0],
        },
      };
    }

    // Pour chaque contact avec accès, récupérer ses disponibilités de la semaine
    const availableThisWeek: ContactWithAvailability[] = [];
    const unavailableThisWeek: ContactWithAvailability[] = [];
    const partiallyAvailableThisWeek: ContactWithAvailability[] = [];

    for (const contact of contactsWithAccess) {
      const availabilities = await getContactAvailabilities(contact.contact_user_id, weekStart, weekEnd);

      // Déterminer le statut global de la semaine
      const hasAvailable = availabilities.some((a) => a.status === 'available');
      const hasUnavailable = availabilities.some((a) => a.status === 'unavailable');
      const hasPartial = availabilities.some((a) => a.status === 'partially_available');

      if (hasAvailable && !hasUnavailable) {
        availableThisWeek.push(contact);
      } else if (hasUnavailable && !hasAvailable) {
        unavailableThisWeek.push(contact);
      } else if (hasPartial || (hasAvailable && hasUnavailable)) {
        partiallyAvailableThisWeek.push(contact);
      }
    }

    const stats: WeeklyAvailabilityStats = {
      total_contacts: allContacts.length,
      contacts_with_access: contactsWithAccess.length,
      available_this_week: availableThisWeek,
      unavailable_this_week: unavailableThisWeek,
      partially_available_this_week: partiallyAvailableThisWeek,
      week_start_date: weekStart.toISOString().split('T')[0],
      week_end_date: weekEnd.toISOString().split('T')[0],
    };

    return {
      success: true,
      stats,
    };
  } catch (error) {
    console.error('Error in getWeeklyAvailabilityStats:', error);
    return {
      success: false,
      message: 'Erreur lors du calcul des statistiques',
    };
  }
}

/**
 * Formate les statistiques hebdomadaires pour Clara
 */
export function formatWeeklyStatsForClara(stats: WeeklyAvailabilityStats, userName: string = ''): string {
  const weekStartObj = new Date(stats.week_start_date);
  const weekEndObj = new Date(stats.week_end_date);

  let result = `📊 **Disponibilités de vos contacts cette semaine**\n\n`;
  result += `📅 **Semaine du ${weekStartObj.toLocaleDateString('fr-FR')} au ${weekEndObj.toLocaleDateString(
    'fr-FR'
  )}**\n\n`;

  result += `📇 **Résumé :**\n`;
  result += `- Total contacts : ${stats.total_contacts}\n`;
  result += `- Avec accès planning : ${stats.contacts_with_access}\n`;
  result += `- ✅ Disponibles : ${stats.available_this_week.length}\n`;
  result += `- ❌ Indisponibles : ${stats.unavailable_this_week.length}\n`;
  result += `- ⏰ Partiellement dispo : ${stats.partially_available_this_week.length}\n\n`;

  if (stats.contacts_with_access === 0) {
    result += `⚠️ Vous n'avez accès au planning d'aucun contact.\n`;
    result += `💡 Demandez l'accès aux plannings de vos chauffeurs pour voir leurs disponibilités.\n`;
    return result;
  }

  // Contacts disponibles
  if (stats.available_this_week.length > 0) {
    result += `✅ **Contacts DISPONIBLES cette semaine (${stats.available_this_week.length}) :**\n\n`;
    stats.available_this_week.forEach((contact) => {
      const icon = contact.contact_type === 'driver' ? '🚗' : contact.contact_type === 'company' ? '🏢' : '👤';
      result += `  ${icon} **${contact.contact_name}**\n`;
      result += `     📧 ${contact.contact_email}\n`;
      if (contact.contact_phone) result += `     📞 ${contact.contact_phone}\n`;
      if (contact.next_available_date) {
        result += `     📅 Prochaine dispo : ${new Date(contact.next_available_date).toLocaleDateString('fr-FR')}\n`;
      }
      result += '\n';
    });
  }

  // Contacts partiellement disponibles
  if (stats.partially_available_this_week.length > 0) {
    result += `⏰ **Contacts PARTIELLEMENT DISPONIBLES (${stats.partially_available_this_week.length}) :**\n\n`;
    stats.partially_available_this_week.forEach((contact) => {
      const icon = contact.contact_type === 'driver' ? '🚗' : contact.contact_type === 'company' ? '🏢' : '👤';
      result += `  ${icon} **${contact.contact_name}** - ${contact.contact_email}\n`;
    });
    result += '\n';
  }

  // Contacts indisponibles
  if (stats.unavailable_this_week.length > 0) {
    result += `❌ **Contacts INDISPONIBLES (${stats.unavailable_this_week.length}) :**\n\n`;
    stats.unavailable_this_week.forEach((contact) => {
      const icon = contact.contact_type === 'driver' ? '🚗' : contact.contact_type === 'company' ? '🏢' : '👤';
      result += `  ${icon} ${contact.contact_name}\n`;
    });
    result += '\n';
  }

  result += `\n💡 **Pour plus de détails**, dis-moi :\n`;
  result += `"Affiche le planning de [nom]" ou "Est-ce que [nom] est dispo le [date] ?"\n`;

  return result;
}

// ==========================================
// 5. MODIFIER LE PLANNING D'UN CONTACT
// ==========================================

/**
 * Modifier la disponibilité d'un contact
 * Note: Nécessite que l'utilisateur ait les permissions de modification
 */
export async function modifyContactPlanning(
  userId: string,
  contactEmail: string,
  date: string,
  status: 'available' | 'unavailable' | 'partially_available',
  startTime?: string,
  endTime?: string,
  notes?: string
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Récupérer le contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_email', contactEmail)
      .maybeSingle();

    if (contactError || !contact) {
      return {
        success: false,
        message: `Contact non trouvé : ${contactEmail}`,
      };
    }

    // Vérifier les permissions (doit avoir accès + être admin ou owner)
    if (!contact.has_calendar_access) {
      return {
        success: false,
        message: `❌ Vous n'avez pas accès au planning de ${contact.contact_name}`,
      };
    }

    // Modifier la disponibilité
    const updated = await setAvailability(contact.contact_user_id, date, status, startTime, endTime, notes);

    if (updated) {
      const dateObj = new Date(date);
      const dateStr = dateObj.toLocaleDateString('fr-FR');
      const statusText =
        status === 'available' ? 'disponible' : status === 'unavailable' ? 'indisponible' : 'partiellement disponible';

      return {
        success: true,
        message: `✅ Planning de ${contact.contact_name} mis à jour : ${dateStr} → ${statusText}`,
      };
    } else {
      return {
        success: false,
        message: `❌ Erreur lors de la modification du planning`,
      };
    }
  } catch (error) {
    console.error('Error in modifyContactPlanning:', error);
    return {
      success: false,
      message: 'Erreur interne',
    };
  }
}

/**
 * Modifier la disponibilité sur une plage de dates
 */
export async function modifyContactPlanningRange(
  userId: string,
  contactEmail: string,
  startDate: string,
  endDate: string,
  status: 'available' | 'unavailable' | 'partially_available',
  startTime?: string,
  endTime?: string,
  notes?: string
): Promise<{
  success: boolean;
  days_updated: number;
  message: string;
}> {
  try {
    // Récupérer le contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('contact_email', contactEmail)
      .maybeSingle();

    if (contactError || !contact) {
      return {
        success: false,
        days_updated: 0,
        message: `Contact non trouvé : ${contactEmail}`,
      };
    }

    // Vérifier les permissions
    if (!contact.has_calendar_access) {
      return {
        success: false,
        days_updated: 0,
        message: `❌ Vous n'avez pas accès au planning de ${contact.contact_name}`,
      };
    }

    // Modifier la disponibilité sur la plage
    const daysUpdated = await setAvailabilityRange(
      contact.contact_user_id,
      startDate,
      endDate,
      status,
      startTime,
      endTime,
      notes
    );

    if (daysUpdated > 0) {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const statusText =
        status === 'available' ? 'disponible' : status === 'unavailable' ? 'indisponible' : 'partiellement disponible';

      return {
        success: true,
        days_updated: daysUpdated,
        message: `✅ Planning de ${contact.contact_name} mis à jour : ${startDateObj.toLocaleDateString(
          'fr-FR'
        )} - ${endDateObj.toLocaleDateString('fr-FR')} → ${statusText} (${daysUpdated} jour(s))`,
      };
    } else {
      return {
        success: false,
        days_updated: 0,
        message: `❌ Erreur lors de la modification du planning`,
      };
    }
  } catch (error) {
    console.error('Error in modifyContactPlanningRange:', error);
    return {
      success: false,
      days_updated: 0,
      message: 'Erreur interne',
    };
  }
}
