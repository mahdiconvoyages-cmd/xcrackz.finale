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
  // Format attendu: XZ-ABC-123 (10 caractères avec tirets)
  const regex = /^XZ-[A-Z2-9]{3}-[A-Z2-9]{3}$/;
  return regex.test(code.toUpperCase().replace(/\s/g, ''));
}

/**
 * Nettoie et formate un code de partage
 * @param code Code brut entré par l'utilisateur
 * @returns Code formaté ou null si invalide
 */
export function cleanShareCode(code: string): string | null {
  // Retirer les espaces et mettre en majuscules
  const cleaned = code.toUpperCase().replace(/\s/g, '');
  
  // Ajouter les tirets manquants si nécessaire
  let formatted = cleaned;
  
  // Si le code n'a pas de tirets, les ajouter
  if (!cleaned.includes('-')) {
    if (cleaned.length === 8) {
      // Format: XZABC123 -> XZ-ABC-123
      formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}`;
    }
  }
  
  // Vérifier le format final
  if (!isValidShareCode(formatted)) {
    return null;
  }
  
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
  
  return `🚗 Mission xCrackz
  
Vous avez été invité à rejoindre ${title}.

Code de mission: ${code}

Pour accepter:
1. Ouvrez l'app xCrackz
2. Allez dans "Missions"
3. Cliquez sur "Rejoindre une mission"
4. Entrez le code: ${code}

Téléchargez l'app: https://expo.dev/artifacts/eas/8ef092ab-d881-437a-8b12-1f1ce6c35706.apk`;
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
        title: 'Mission xCrackz',
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
