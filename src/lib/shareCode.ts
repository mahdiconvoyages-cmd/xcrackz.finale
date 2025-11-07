/**
 * Génération et gestion de codes de partage pour les missions (Mobile)
 * Format: XZ-ABC-123 (facile à lire et à partager)
 */

import * as Clipboard from 'expo-clipboard';
import { Share, Alert } from 'react-native';

// Caractères utilisés (sans I, O, 0, 1 pour éviter confusion)
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Génère un code de partage aléatoire
 * @returns Code au format "XZ-ABC-123"
 */
export function generateShareCode(): string {
  let code = 'XZ-';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * CHARS.length);
    code += CHARS[randomIndex];
    
    if (i === 2) {
      code += '-';
    }
  }
  
  return code;
}

/**
 * Valide le format d'un code de partage
 */
export function isValidShareCode(code: string): boolean {
  const regex = /^XZ-[A-Z2-9]{3}-[A-Z2-9]{3}$/;
  return regex.test(code.toUpperCase().replace(/\s/g, ''));
}

/**
 * Nettoie et formate un code de partage
 */
export function cleanShareCode(code: string): string | null {
  const cleaned = code.toUpperCase().replace(/\s/g, '');
  
  let formatted = cleaned;
  
  if (!cleaned.includes('-')) {
    if (cleaned.length === 8) {
      formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 8)}`;
    }
  }
  
  if (!isValidShareCode(formatted)) {
    return null;
  }
  
  return formatted;
}

/**
 * Copie un code dans le presse-papier (Mobile)
 */
export async function copyShareCode(code: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(code);
    return true;
  } catch (error) {
    console.error('Erreur lors de la copie du code:', error);
    return false;
  }
}

/**
 * Génère un message de partage pour une mission
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
 * Partage une mission via l'API native Share (Mobile)
 */
export async function shareMission(code: string, missionTitle?: string): Promise<boolean> {
  const message = getShareMessage(code, missionTitle);
  
  try {
    const result = await Share.share({
      message,
      title: 'Mission xCrackz',
    });
    
    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Erreur lors du partage:', error);
    return false;
  }
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

/**
 * Affiche une alerte de succès après copie
 */
export function showCopySuccess() {
  Alert.alert(
    '✅ Copié!',
    'Le code a été copié dans le presse-papier',
    [{ text: 'OK' }]
  );
}

/**
 * Affiche une alerte d'erreur
 */
export function showError(message: string) {
  Alert.alert(
    '❌ Erreur',
    message,
    [{ text: 'OK' }]
  );
}
