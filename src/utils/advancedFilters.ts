/**
 * 🎨 FILTRES PROFESSIONNELS POUR SCANNER DE DOCUMENTS
 * Algorithmes optimisés pour numérisation haute qualité
 */

export type FilterType = 'magic' | 'bw' | 'grayscale' | 'color';

/**
 * Applique un filtre professionnel à une image
 */
export async function applyAdvancedFilter(
  imageSource: string,
  filterType: FilterType = 'magic'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Dessiner l'image
        ctx.drawImage(img, 0, 0);

        // Obtenir les données de pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Appliquer le filtre selon le type (sans pré-traitement pour vitesse)
        switch (filterType) {
          case 'magic':
            applyProfessionalMagicFilter(imageData);
            break;
          case 'bw':
            applyAdaptiveBlackAndWhite(imageData);
            break;
          case 'grayscale':
            applyEnhancedGrayscale(imageData);
            break;
          case 'color':
            applyVividColorEnhancement(imageData);
            break;
        }

        // Appliquer les modifications
        ctx.putImageData(imageData, 0, 0);

        // Exporter en haute qualité (98%)
        resolve(canvas.toDataURL('image/jpeg', 0.98));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSource;
  });
}

/**
 * 🪄 FILTRE MAGIC PROFESSIONNEL - Algorithme CamScanner-like
 * - Détection automatique du fond
 * - Normalisation adaptative
 * - Contraste local optimal
 * - Correction de luminosité intelligente
 */
function applyProfessionalMagicFilter(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Phase 1: Convertir en LAB (simulation simplifié via niveaux de gris améliorés)
  const tempData = new Uint8ClampedArray(data);
  const grayscale = new Float32Array(width * height);
  
  // Conversion en niveaux de gris avec pondération perceptuelle
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    grayscale[idx] = r * 0.299 + g * 0.587 + b * 0.114;
  }

  // Phase 2: Détection automatique du fond (analyse statistique)
  const sorted = Array.from(grayscale).sort((a, b) => a - b);
  const backgroundLevel = sorted[Math.floor(sorted.length * 0.90)]; // Top 10% = fond
  const textLevel = sorted[Math.floor(sorted.length * 0.10)]; // Bottom 10% = texte

  // Phase 3: Normalisation adaptative avec correction gamma
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    let gray = grayscale[idx];

    // Normalisation basée sur les niveaux détectés
    if (textLevel < backgroundLevel) {
      gray = clamp(((gray - textLevel) / (backgroundLevel - textLevel)) * 255);
    }

    // Correction gamma adaptative selon la luminosité
    const gamma = gray < 128 ? 0.8 : 1.2; // Éclaircir zones sombres, garder zones claires
    gray = Math.pow(gray / 255, gamma) * 255;

    // Contraste adaptatif fort
    gray = clamp((gray - 128) * 1.6 + 128);

    // Blanchiment intelligent du fond (algorithme à seuil doux)
    if (gray > 120) {
      const whitenAmount = Math.pow((gray - 120) / 135, 0.7); // Courbe progressive
      gray = gray + (255 - gray) * whitenAmount;
    }
    // Noircissement du texte
    else if (gray < 120) {
      const darkenAmount = Math.pow((120 - gray) / 120, 0.8);
      gray = gray * (1 - darkenAmount * 0.5);
    }

    tempData[i] = clamp(gray);
    tempData[i + 1] = clamp(gray);
    tempData[i + 2] = clamp(gray);
  }

  // Phase 4: Netteté professionnelle multi-passes
  applyUnsharpMask(tempData, data, width, height, 3.5, 0.9);
}

/**
 * ⚫⚪ FILTRE N&B PROFESSIONNEL - Binarisation adaptative locale (Sauvola)
 * - Algorithme Sauvola pour documents
 * - Gère les variations d'éclairage
 * - Préserve les détails fins
 */
function applyAdaptiveBlackAndWhite(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Convertir en niveaux de gris
  const grayscale = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    grayscale[idx] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  // Binarisation adaptative Sauvola (fenêtre locale)
  const windowSize = 15; // Taille de fenêtre
  const k = 0.2; // Paramètre de sensibilité
  const R = 128; // Plage dynamique

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      // Calculer moyenne et variance locales
      let sum = 0;
      let sumSq = 0;
      let count = 0;

      for (let wy = Math.max(0, y - windowSize); wy < Math.min(height, y + windowSize + 1); wy++) {
        for (let wx = Math.max(0, x - windowSize); wx < Math.min(width, x + windowSize + 1); wx++) {
          const val = grayscale[wy * width + wx];
          sum += val;
          sumSq += val * val;
          count++;
        }
      }

      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      const stdDev = Math.sqrt(Math.max(0, variance));

      // Seuil adaptatif Sauvola
      const threshold = mean * (1 + k * ((stdDev / R) - 1));

      // Appliquer binarisation
      const value = grayscale[idx] > threshold ? 255 : 0;
      data[idx * 4] = value;
      data[idx * 4 + 1] = value;
      data[idx * 4 + 2] = value;
    }
  }
}

/**
 * 🌫️ FILTRE NIVEAUX DE GRIS PROFESSIONNEL
 * - Égalisation d'histogramme adaptative (CLAHE simulé)
 * - Contraste local optimal
 * - Netteté maximale
 */
function applyEnhancedGrayscale(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const tempData = new Uint8ClampedArray(data);

  // Convertir en niveaux de gris
  const grayscale = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    grayscale[idx] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  // CLAHE simplifié (Contrast Limited Adaptive Histogram Equalization)
  const tileSize = 16;
  const clipLimit = 3.0;

  for (let ty = 0; ty < height; ty += tileSize) {
    for (let tx = 0; tx < width; tx += tileSize) {
      // Calculer histogramme local
      const localHist = new Array(256).fill(0);
      let pixelCount = 0;

      for (let y = ty; y < Math.min(ty + tileSize, height); y++) {
        for (let x = tx; x < Math.min(tx + tileSize, width); x++) {
          const val = Math.floor(grayscale[y * width + x]);
          localHist[val]++;
          pixelCount++;
        }
      }

      // Clip histogram
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        if (localHist[i] > clipLimit) {
          excess += localHist[i] - clipLimit;
          localHist[i] = clipLimit;
        }
      }
      const redistribution = excess / 256;
      for (let i = 0; i < 256; i++) {
        localHist[i] += redistribution;
      }

      // Calculer CDF et mapper
      const cdf = new Array(256).fill(0);
      cdf[0] = localHist[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + localHist[i];
      }

      // Normaliser et appliquer
      for (let y = ty; y < Math.min(ty + tileSize, height); y++) {
        for (let x = tx; x < Math.min(tx + tileSize, width); x++) {
          const idx = y * width + x;
          const val = Math.floor(grayscale[idx]);
          let newVal = (cdf[val] / pixelCount) * 255;

          // Boost contraste supplémentaire
          newVal = clamp((newVal - 128) * 1.4 + 128);

          // Blanchir fond
          if (newVal > 140) {
            newVal = clamp(newVal + (255 - newVal) * 0.8);
          } else if (newVal < 115) {
            newVal = clamp(newVal * 0.65);
          }

          tempData[idx * 4] = newVal;
          tempData[idx * 4 + 1] = newVal;
          tempData[idx * 4 + 2] = newVal;
        }
      }
    }
  }

  // Netteté FORTE
  applyUnsharpMask(tempData, data, width, height, 3.0, 0.9);
}

/**
 * 🌈 FILTRE COULEUR RAPIDE
 * - Blanchit le fond
 * - Préserve les couleurs
 * - Contraste amélioré
 */
function applyVividColorEnhancement(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const tempData = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    
    // Saturation modérée
    const saturationBoost = 1.2;
    let newR = clamp(gray + (r - gray) * saturationBoost);
    let newG = clamp(gray + (g - gray) * saturationBoost);
    let newB = clamp(gray + (b - gray) * saturationBoost);

    // Contraste pour séparer texte/fond
    const contrastFactor = 1.3;
    newR = clamp((newR - 128) * contrastFactor + 128);
    newG = clamp((newG - 128) * contrastFactor + 128);
    newB = clamp((newB - 128) * contrastFactor + 128);

    // Blanchir FORTEMENT les zones claires
    const luminosity = newR * 0.299 + newG * 0.587 + newB * 0.114;
    if (luminosity > 150) {
      const whitenFactor = 0.8;
      newR = clamp(newR + (255 - newR) * whitenFactor);
      newG = clamp(newG + (255 - newG) * whitenFactor);
      newB = clamp(newB + (255 - newB) * whitenFactor);
    }

    tempData[i] = newR;
    tempData[i + 1] = newG;
    tempData[i + 2] = newB;
  }

  // Netteté FORTE
  applyUnsharpMask(tempData, data, width, height, 2.5, 1.0);
}

// ===== FONCTIONS UTILITAIRES =====

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, value));
}

function applyUnsharpMask(
  source: Uint8ClampedArray,
  dest: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
  radius: number
) {
  // Création d'une version floutée
  const blurred = gaussianBlur(source, width, height, radius);

  // Appliquer l'unsharp mask
  for (let i = 0; i < source.length; i += 4) {
    dest[i] = clamp(source[i] + amount * (source[i] - blurred[i]));
    dest[i + 1] = clamp(source[i + 1] + amount * (source[i + 1] - blurred[i + 1]));
    dest[i + 2] = clamp(source[i + 2] + amount * (source[i + 2] - blurred[i + 2]));
    dest[i + 3] = source[i + 3];
  }
}

function gaussianBlur(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data);
  const kernel = createGaussianKernel(radius);
  const kernelSize = kernel.length;
  const halfKernel = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, weightSum = 0;

      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx - halfKernel));
          const py = Math.min(height - 1, Math.max(0, y + ky - halfKernel));
          const idx = (py * width + px) * 4;
          const weight = kernel[ky][kx];

          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          weightSum += weight;
        }
      }

      const outIdx = (y * width + x) * 4;
      output[outIdx] = r / weightSum;
      output[outIdx + 1] = g / weightSum;
      output[outIdx + 2] = b / weightSum;
    }
  }

  return output;
}

function createGaussianKernel(radius: number): number[][] {
  const size = Math.ceil(radius) * 2 + 1;
  const sigma = radius / 2;
  const kernel: number[][] = [];
  let sum = 0;

  for (let y = 0; y < size; y++) {
    kernel[y] = [];
    for (let x = 0; x < size; x++) {
      const dx = x - Math.floor(size / 2);
      const dy = y - Math.floor(size / 2);
      const value = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      kernel[y][x] = value;
      sum += value;
    }
  }

  // Normaliser
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      kernel[y][x] /= sum;
    }
  }

  return kernel;
}

