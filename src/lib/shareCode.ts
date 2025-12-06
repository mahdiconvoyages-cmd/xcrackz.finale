/**
 * Génération de codes de partage pour les missions
 * Format: XZ-ABC-123 (facile à lire et à partager)
 */

// Caractères utilisés (sans I, O, 0, 1 pour éviter confusion)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Génère un code de partage aléatoire
 * @returns Code au format "XZ-ABC-123"
 */
export function generateShareCode(): string {
  let code = 'XZ-';
  
  // Générer 6 caractères aléatoires (ABC-123)
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * CHARS.length);
    code += CHARS[randomIndex];
    
    // Ajouter un tiret après les 3 premiers caractères
    if (i === 2) {
      code += '-';
    }
  }
  
  return code;
}

/**
 * Valide le format d'un code de partage
 * @param code Code à valider
 * @returns true si le format est valide
 */
export function isValidShareCode(code: string): boolean {
  // Format attendu: XZ-ABC-123
  // Tolère les entrées avec espaces, tirets manquants ou autres séparateurs
  return cleanShareCode(code) !== null;
}

/**
 * Nettoie et formate un code de partage
 * @param code Code brut entré par l'utilisateur
 * @returns Code formaté ou null si invalide
 */
export function cleanShareCode(code: string): string | null {
  if (!code) return null;
  // 1) Normaliser: mettre en majuscules et retirer tous les caractères non alphanumériques
  //    (aligné avec mobile et la RPC SQL qui fait REGEXP_REPLACE('[^A-Za-z0-9]', '', 'g'))
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Doit faire exactement 8 caractères (XZ + 6 caractères)
  if (cleaned.length !== 8) return null;

  // 2) Reconstituer le format XZ-ABC-123
  const formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}`;

  // 3) Vérifier le format final (exclut I/O et 0/1 via classe [A-Z2-9])
  const regex = /^XZ-[A-Z2-9]{3}-[A-Z2-9]{3}$/;
  if (!regex.test(formatted)) return null;

  return formatted;
}

/**
 * Copie un code dans le presse-papier
 * @param code Code à copier
 * @returns Promise résolue quand la copie est effectuée
 */
export async function copyShareCode(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch (error) {
    console.error('Erreur lors de la copie du code:', error);
    
    // Fallback pour les anciens navigateurs
    const textArea = document.createElement('textarea');
    textArea.value = code;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackError) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Génère un message de partage pour une mission
 * @param code Code de la mission
 * @param missionTitle Titre de la mission
 * @returns Message formaté pour partage
 */
export function getShareMessage(code: string, missionTitle?: string): string {
  const title = missionTitle ? `"${missionTitle}"` : 'une mission';
  
  return `🚗 Mission CHECKSFLEET
  
Vous avez été invité à rejoindre ${title}.

Code de mission: ${code}

Pour accepter:
1. Ouvrez l'app CHECKSFLEET
2. Allez dans "Missions"
3. Cliquez sur "Rejoindre une mission"
4. Entrez le code: ${code}

Téléchargez l'app: https://expo.dev/artifacts/eas/8ef092ab-d881-437a-8b12-1f1ce6c35706.apk`;
}

/**
 * Normalise l'affichage d'un code potentiellement mal formé (ex: "XZ--ABC--123")
 * - Supprime caractères non autorisés
 * - Réduit les séquences de tirets multiples à un seul '-'
 * - Recalcule le format XZ-ABC-123 si longueur brute = 8 sans tirets
 * - Évite d'afficher des tirets doublés qui peuvent visuellement masquer le code
 */
export function normalizeShareCodeForDisplay(raw: string | undefined | null): string {
  if (!raw) return '';
  // Garder uniquement A-Z 0-9 et tirets
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
  // Réduire séquences --- -> -
  const collapsed = cleaned.replace(/-+/g, '-').replace(/^-|-$/g, '');
  // Enlever les tirets pour tester la forme brute
  const bare = collapsed.replace(/-/g, '');
  if (bare.length === 8 && bare.startsWith('XZ')) {
    return `${bare.slice(0,2)}-${bare.slice(2,5)}-${bare.slice(5,8)}`;
  }
  // Si déjà conforme à la regex finale, retourner tel quel
  if (/^XZ-[A-Z2-9]{3}-[A-Z2-9]{3}$/.test(collapsed)) {
    return collapsed;
  }
  return collapsed;
}

/**
 * Partage une mission via les APIs natives du navigateur
 * @param code Code de la mission
 * @param missionTitle Titre de la mission
 */
export async function shareMission(code: string, missionTitle?: string): Promise<boolean> {
  const message = getShareMessage(code, missionTitle);
  
  // Utiliser l'API Web Share si disponible (mobile principalement)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Mission CHECKSFLEET',
        text: message,
      });
      return true;
    } catch (error) {
      // Utilisateur a annulé le partage
      if ((error as Error).name !== 'AbortError') {
        console.error('Erreur lors du partage:', error);
      }
      return false;
    }
  }
  
  // Fallback: copier dans le presse-papier
  return copyShareCode(code);
}

/**
 * Type pour le résultat de validation d'un code
 */
export interface ShareCodeValidation {
  valid: boolean;
  code?: string;
  error?: string;
}

/**
 * Génère un lien deeplink pour ouvrir une mission
 * @param missionId ID de la mission
 * @returns finality://mission/open/{missionId}
 */
export function getMissionDeeplink(missionId: string): string {
  return `finality://mission/open/${missionId}`;
}

/**
 * Génère un lien web pour ouvrir une mission
 * @param missionId ID de la mission
 * @returns /mission/{missionId}
 */
export function getMissionWebLink(missionId: string): string {
  return `${window.location.origin}/mission/${missionId}`;
}

/**
 * Copie le lien de la mission dans le presse-papier
 * @param missionId ID de la mission
 * @param useDeeplink Si true, copie le deeplink, sinon le lien web
 */
export async function copyMissionLink(missionId: string, useDeeplink: boolean = false): Promise<boolean> {
  try {
    const link = useDeeplink ? getMissionDeeplink(missionId) : getMissionWebLink(missionId);
    await navigator.clipboard.writeText(link);
    return true;
  } catch (error) {
    console.error('❌ Erreur copie lien:', error);
    return false;
  }
}

/**
 * Partage une mission via l'API Web Share (si disponible)
 * @param missionId ID de la mission
 * @param missionTitle Titre de la mission (optionnel)
 */
export async function shareMissionLink(
  missionId: string,
  missionTitle?: string
): Promise<boolean> {
  try {
    const webLink = getMissionWebLink(missionId);
    const deeplink = getMissionDeeplink(missionId);
    
    const title = missionTitle || 'Mission CHECKSFLEET';
    const text = `📦 ${title}\n\nOuvre cette mission:\n${deeplink}\n\nOu sur le web: ${webLink}`;

    if (navigator.share) {
      await navigator.share({
        title,
        text,
        url: webLink,
      });
      return true;
    } else {
      // Fallback: copier dans le presse-papier
      await copyMissionLink(missionId, false);
      return true;
    }
  } catch (error) {
    console.error('❌ Erreur partage mission:', error);
    return false;
  }
}

/**
 * Valide un code entré par l'utilisateur avec retour détaillé
 * @param input Code entré par l'utilisateur
 * @returns Résultat de validation avec message d'erreur si invalide
 */
export function validateShareCodeInput(input: string): ShareCodeValidation {
  if (!input || input.trim().length === 0) {
    return {
      valid: false,
      error: 'Veuillez entrer un code',
    };
  }
  
  const cleaned = cleanShareCode(input);
  
  if (!cleaned) {
    return {
      valid: false,
      error: 'Format de code invalide. Attendu: XZ-ABC-123',
    };
  }
  
  return {
    valid: true,
    code: cleaned,
  };
}
