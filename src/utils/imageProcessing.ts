/**
 * Utilitaires de traitement d'image pour le scanner web
 * - Filtres de documents (N&B, Gris, Couleur, Magic)
 * - Rotation d'image
 * - Amélioration automatique
 * - Compatible navigateur (Canvas API)
 */

/**
 * Type de filtre disponible
 */
export type FilterType = 'bw' | 'grayscale' | 'color' | 'magic';

/**
 * Applique un filtre à une image via Canvas
 */
export async function applyDocumentFilter(
  imageSource: string | File,
  filterType: FilterType = 'magic'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Dessiner l'image
        ctx.drawImage(img, 0, 0);

        // Obtenir les données de pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Appliquer le filtre selon le type
        switch (filterType) {
          case 'bw':
            applyBlackAndWhite(data);
            break;
          case 'grayscale':
            applyGrayscale(data);
            break;
          case 'color':
            applyColorEnhancement(data);
            break;
          case 'magic':
            applyMagicFilter(data);
            break;
        }

        // Appliquer les modifications
        ctx.putImageData(imageData, 0, 0);

        // Convertir en dataURL
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    // Charger l'image depuis File ou URL
    if (imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageSource);
    } else {
      img.src = imageSource;
    }
  });
}

/**
 * Filtre Noir & Blanc haute contraste (idéal pour documents texte)
 */
function applyBlackAndWhite(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    // Calculer la luminosité
    const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    
    // Seuil pour noir ou blanc (optimisé pour documents)
    const threshold = brightness > 128 ? 255 : 0;
    
    data[i] = threshold;     // R
    data[i + 1] = threshold; // G
    data[i + 2] = threshold; // B
  }
}

/**
 * Filtre Niveaux de gris (préserve les nuances)
 */
function applyGrayscale(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    // Formule standard de conversion en niveaux de gris
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    
    data[i] = gray;     // R
    data[i + 1] = gray; // G
    data[i + 2] = gray; // B
  }
}

/**
 * Filtre Couleur amélioré (augmente saturation et contraste)
 */
function applyColorEnhancement(data: Uint8ClampedArray) {
  const contrastFactor = 1.3;
  const saturationFactor = 1.2;
  
  for (let i = 0; i < data.length; i += 4) {
    // Augmenter le contraste
    data[i] = clamp((data[i] - 128) * contrastFactor + 128);
    data[i + 1] = clamp((data[i + 1] - 128) * contrastFactor + 128);
    data[i + 2] = clamp((data[i + 2] - 128) * contrastFactor + 128);
    
    // Augmenter légèrement la saturation
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = clamp(gray + (data[i] - gray) * saturationFactor);
    data[i + 1] = clamp(gray + (data[i + 1] - gray) * saturationFactor);
    data[i + 2] = clamp(gray + (data[i + 2] - gray) * saturationFactor);
  }
}

/**
 * Filtre Magic (amélioration automatique intelligente)
 * Combine contraste, netteté et luminosité optimisés pour documents
 */
function applyMagicFilter(data: Uint8ClampedArray) {
  // Phase 1: Augmenter le contraste
  const contrastFactor = 1.4;
  const brightnessFactor = 1.15;
  
  for (let i = 0; i < data.length; i += 4) {
    // Améliorer le contraste
    data[i] = clamp((data[i] - 128) * contrastFactor + 128);
    data[i + 1] = clamp((data[i + 1] - 128) * contrastFactor + 128);
    data[i + 2] = clamp((data[i + 2] - 128) * contrastFactor + 128);
    
    // Légère augmentation de luminosité
    data[i] = clamp(data[i] * brightnessFactor);
    data[i + 1] = clamp(data[i + 1] * brightnessFactor);
    data[i + 2] = clamp(data[i + 2] * brightnessFactor);
  }
}

/**
 * Borne une valeur entre 0 et 255
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}

/**
 * Rotation d'une image (90°, 180°, 270°)
 */
export async function rotateImage(
  imageSource: string | File,
  degrees: 90 | 180 | 270
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Déterminer les nouvelles dimensions
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        // Appliquer la rotation
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageSource);
    } else {
      img.src = imageSource;
    }
  });
}

/**
 * Amélioration automatique d'image de document
 */
export async function enhanceDocumentImage(
  imageSource: string | File,
  options: {
    brightness?: number;
    contrast?: number;
  } = {}
): Promise<string> {
  const { brightness = 1.15, contrast = 1.4 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          // Appliquer contraste
          data[i] = clamp((data[i] - 128) * contrast + 128);
          data[i + 1] = clamp((data[i + 1] - 128) * contrast + 128);
          data[i + 2] = clamp((data[i + 2] - 128) * contrast + 128);
          
          // Appliquer luminosité
          data[i] = clamp(data[i] * brightness);
          data[i + 1] = clamp(data[i + 1] * brightness);
          data[i + 2] = clamp(data[i + 2] * brightness);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));

    if (imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(imageSource);
    } else {
      img.src = imageSource;
    }
  });
}

/**
 * Convertit un dataURL en File
 */
export async function dataURLtoFile(dataURL: string, filename: string): Promise<File> {
  const response = await fetch(dataURL);
  const blob = await response.blob();
  return new File([blob], filename, { type: 'image/jpeg' });
}
