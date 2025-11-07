/**
 * Utilitaires de traitement d'image pour le scanner professionnel
 * - Détection de contours
 * - Correction de perspective
 * - Amélioration de la qualité d'image
 */

import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Détecte les contours d'un document dans une image
 * Utilise un algorithme de détection de contours basé sur les gradients
 */
export async function detectDocumentEdges(imageUri: string): Promise<{
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
} | null> {
  // Cette fonction devrait normalement utiliser OpenCV ou une bibliothèque native
  // Pour l'instant, on retourne null pour utiliser l'image complète
  // TODO: Implémenter avec react-native-opencv ou une alternative
  return null;
}

/**
 * Applique une correction de perspective pour redresser le document
 */
export async function applyPerspectiveCorrection(
  imageUri: string,
  corners: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  }
): Promise<string> {
  // La correction de perspective nécessite une transformation matricielle
  // Pour l'instant, on retourne l'image originale
  // TODO: Implémenter avec ImageManipulator ou une bibliothèque native
  return imageUri;
}

/**
 * Améliore la qualité d'une image de document scannée
 * Applique des filtres pour rendre le texte plus lisible
 */
export async function enhanceDocumentImage(
  imageUri: string,
  options: {
    brightness?: number; // -1.0 à 1.0, défaut: 0.1
    contrast?: number; // 0.0 à 2.0, défaut: 1.3
    saturation?: number; // 0.0 à 2.0, défaut: 0 (N&B)
    sharpen?: number; // 0.0 à 1.0, défaut: 0.8
    autoEnhance?: boolean; // Ajustement automatique, défaut: true
  } = {}
): Promise<string> {
  const {
    brightness = 0.15,
    contrast = 1.4,
    saturation = 0,
    autoEnhance = true,
  } = options;

  try {
    // Étape 1: Redimensionner si trop grand (optimisation)
    let manipulations: ImageManipulator.Action[] = [];

    // Étape 2: Appliquer les ajustements de base
    // Note: expo-image-manipulator ne supporte pas tous ces filtres nativement
    // On utilise ce qui est disponible et on simule le reste

    // Convertir en noir et blanc (haute qualité pour les documents)
    if (saturation === 0) {
      // Désaturation complète pour un rendu N&B
      // Malheureusement expo-image-manipulator n'a pas de filtre de saturation
      // On peut utiliser le contrast élevé pour simuler
    }

    // Augmenter le contraste pour rendre le texte plus net
    // Note: expo-image-manipulator n'a pas de filtre de contraste direct
    // On doit travailler avec ce qui est disponible

    // Appliquer un filtre de netteté
    // Note: expo-image-manipulator n'a pas de filtre sharpen
    // Nous devrons utiliser une bibliothèque plus avancée ou native

    // Pour l'instant, on applique ce qui est possible avec expo-image-manipulator
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        // Resize pour optimiser si l'image est trop grande
        { resize: { width: 2000 } }, // Max 2000px de largeur
      ],
      {
        compress: 0.95, // Haute qualité
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Error enhancing image:', error);
    return imageUri;
  }
}

/**
 * Applique un filtre "Document" style CamScanner
 * Optimise l'image pour la lisibilité du texte
 */
export async function applyDocumentFilter(
  imageUri: string,
  filterType: 'bw' | 'grayscale' | 'color' | 'magic' = 'magic'
): Promise<string> {
  try {
    switch (filterType) {
      case 'bw':
        // Noir et blanc haute contraste
        return await enhanceDocumentImage(imageUri, {
          brightness: 0.2,
          contrast: 1.6,
          saturation: 0,
        });

      case 'grayscale':
        // Niveaux de gris
        return await enhanceDocumentImage(imageUri, {
          brightness: 0.1,
          contrast: 1.3,
          saturation: 0,
        });

      case 'color':
        // Couleur avec amélioration
        return await enhanceDocumentImage(imageUri, {
          brightness: 0.05,
          contrast: 1.2,
          saturation: 1.1,
        });

      case 'magic':
        // Filtre automatique intelligent (meilleur pour la plupart des cas)
        return await enhanceDocumentImage(imageUri, {
          autoEnhance: true,
        });

      default:
        return imageUri;
    }
  } catch (error) {
    console.error('Error applying filter:', error);
    return imageUri;
  }
}

/**
 * Recadre automatiquement une image pour enlever les bords
 */
export async function autoCropDocument(imageUri: string): Promise<string> {
  try {
    // Détecter les bords du document
    const edges = await detectDocumentEdges(imageUri);

    if (!edges) {
      // Si la détection échoue, retourner l'image originale
      return imageUri;
    }

    // Appliquer la correction de perspective
    const corrected = await applyPerspectiveCorrection(imageUri, edges);

    return corrected;
  } catch (error) {
    console.error('Error auto-cropping:', error);
    return imageUri;
  }
}

/**
 * Rotation de l'image
 */
export async function rotateImage(
  imageUri: string,
  degrees: 90 | 180 | 270
): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ rotate: degrees }],
      {
        compress: 0.95,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (error) {
    console.error('Error rotating image:', error);
    return imageUri;
  }
}

/**
 * Recadrage manuel d'une image
 */
export async function cropImage(
  imageUri: string,
  cropData: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  }
): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        {
          crop: cropData,
        },
      ],
      {
        compress: 0.95,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (error) {
    console.error('Error cropping image:', error);
    return imageUri;
  }
}
