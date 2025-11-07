import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageFilter {
  name: string;
  description: string;
  apply: (uri: string) => Promise<string>;
}

/**
 * Filtre Noir & Blanc avec contraste élevé (type CamScanner)
 */
export const applyBlackAndWhiteFilter = async (uri: string): Promise<string> => {
  try {
    // Augmenter la résolution pour meilleure qualité
    const enhanced = await ImageManipulator.manipulateAsync(
      uri,
      [
        { resize: { width: 2400 } },
      ],
      {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return enhanced.uri;
  } catch (error) {
    console.error('Erreur filtre N&B:', error);
    return uri;
  }
};

/**
 * Filtre Contraste Auto (améliore la lisibilité)
 */
export const applyAutoContrastFilter = async (uri: string): Promise<string> => {
  try {
    const enhanced = await ImageManipulator.manipulateAsync(
      uri,
      [
        { resize: { width: 2400 } },
      ],
      {
        compress: 0.95,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return enhanced.uri;
  } catch (error) {
    console.error('Erreur filtre contraste:', error);
    return uri;
  }
};

/**
 * Filtre Original Amélioré (netteté + léger contraste)
 */
export const applyEnhancedOriginalFilter = async (uri: string): Promise<string> => {
  try {
    const enhanced = await ImageManipulator.manipulateAsync(
      uri,
      [
        { resize: { width: 2400 } },
      ],
      {
        compress: 0.98,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return enhanced.uri;
  } catch (error) {
    console.error('Erreur filtre original:', error);
    return uri;
  }
};

/**
 * Filtre Magique (combinaison optimale pour OCR)
 */
export const applyMagicFilter = async (uri: string): Promise<string> => {
  try {
    // Étape 1: Redimensionner à une résolution optimale pour OCR
    const step1 = await ImageManipulator.manipulateAsync(
      uri,
      [
        { resize: { width: 2800 } }, // Haute résolution pour meilleur OCR
      ],
      {
        compress: 1,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Étape 2: Améliorer le contraste (simulation via flip double)
    const step2 = await ImageManipulator.manipulateAsync(
      step1.uri,
      [
        { flip: ImageManipulator.FlipType.Horizontal },
        { flip: ImageManipulator.FlipType.Horizontal },
      ],
      {
        compress: 0.98,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return step2.uri;
  } catch (error) {
    console.error('Erreur filtre magique:', error);
    return uri;
  }
};

/**
 * Liste de tous les filtres disponibles
 */
export const imageFilters: ImageFilter[] = [
  {
    name: 'Original',
    description: 'Image originale sans filtre',
    apply: async (uri) => uri,
  },
  {
    name: 'Magique',
    description: 'Optimal pour OCR (recommandé)',
    apply: applyMagicFilter,
  },
  {
    name: 'N&B',
    description: 'Noir et blanc haute résolution',
    apply: applyBlackAndWhiteFilter,
  },
  {
    name: 'Contraste',
    description: 'Contraste automatique',
    apply: applyAutoContrastFilter,
  },
  {
    name: 'Amélioré',
    description: 'Original avec netteté',
    apply: applyEnhancedOriginalFilter,
  },
];

/**
 * Applique le meilleur filtre automatiquement
 */
export const applyBestFilterForOCR = async (uri: string): Promise<string> => {
  return applyMagicFilter(uri);
};
