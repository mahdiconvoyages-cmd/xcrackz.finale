/**
 * Formate une date ISO en format français moderne
 * @param dateString - Date au format ISO
 * @returns Date formatée (ex: "Lun. 15 janv. 2024")
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formate une heure depuis une date ISO
 * @param dateString - Date au format ISO
 * @returns Heure formatée (ex: "14:30")
 */
export function formatTime(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formate une date et heure complète de manière séparée
 * @param dateString - Date au format ISO
 * @returns Objet avec date et heure formatées
 */
export function formatDateTime(dateString: string): { date: string; time: string } {
  return {
    date: formatDate(dateString),
    time: formatTime(dateString),
  };
}

/**
 * Formate une date de manière relative (Aujourd'hui, Demain, etc.)
 * @param dateString - Date au format ISO
 * @returns Date relative ou formatée
 */
export function formatRelativeDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);
  
  if (dateOnly.getTime() === today.getTime()) {
    return "Aujourd'hui";
  } else if (dateOnly.getTime() === tomorrow.getTime()) {
    return 'Demain';
  } else {
    return formatDate(dateString);
  }
}
