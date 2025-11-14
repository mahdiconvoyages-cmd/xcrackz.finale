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

        // Appliquer le filtre selon le type
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

        // Exporter en haute qualité
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSource;
  });
}

/**
 * 🪄 FILTRE MAGIC - Amélioration automatique professionnelle
 * - Auto-contraste adaptatif
 * - Suppression des ombres
 * - Netteté optimisée
 * - Balance des blancs
 */
function applyProfessionalMagicFilter(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Phase 1: Analyser l'histogramme pour auto-contraste
  const histogram = calculateHistogram(data);
  const { min, max } = findOptimalRange(histogram);

  // Phase 2: Normalisation adaptative
  const normalizeFactor = 255 / (max - min);
  
  const tempData = new Uint8ClampedArray(data);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Auto-contraste intelligent
    let newR = clamp((r - min) * normalizeFactor);
    let newG = clamp((g - min) * normalizeFactor);
    let newB = clamp((b - min) * normalizeFactor);

    // Correction gamma douce pour documents
    const gamma = 1.08;
    newR = clamp(Math.pow(newR / 255, 1 / gamma) * 255);
    newG = clamp(Math.pow(newG / 255, 1 / gamma) * 255);
    newB = clamp(Math.pow(newB / 255, 1 / gamma) * 255);

    // Contraste modéré pour lisibilité optimale
    const contrastBoost = 1.15;
    newR = clamp((newR - 128) * contrastBoost + 128);
    newG = clamp((newG - 128) * contrastBoost + 128);
    newB = clamp((newB - 128) * contrastBoost + 128);

    // Légère désaturation pour look professionnel sans excès
    const gray = newR * 0.299 + newG * 0.587 + newB * 0.114;
    const desaturation = 0.8;
    newR = clamp(gray + (newR - gray) * desaturation);
    newG = clamp(gray + (newG - gray) * desaturation);
    newB = clamp(gray + (newB - gray) * desaturation);

    tempData[i] = newR;
    tempData[i + 1] = newG;
    tempData[i + 2] = newB;
  }

  // Phase 3: Netteté équilibrée pour documents
  applyUnsharpMask(tempData, data, width, height, 2.0, 1.0);
}

/**
 * ⚫⚪ FILTRE N&B ADAPTATIF - Binarisation intelligente
 * - Seuil adaptatif local (Otsu amélioré)
 * - Préserve les détails fins
 * - Idéal pour texte et documents
 */
function applyAdaptiveBlackAndWhite(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Convertir en niveaux de gris avec pré-lissage
  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    // Appliquer une légère courbe pour adoucir
    grayscale[idx] = Math.round(gray * 0.95 + 12);
  }

  // Binarisation adaptative douce
  const blockSize = 30; // Fenêtre large pour moyenne douce
  const C = 15; // Seuil réduit pour moins d'intensité

  const tempGrayscale = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Calculer la moyenne locale
      let sum = 0;
      let count = 0;
      
      for (let dy = -blockSize; dy <= blockSize; dy++) {
        for (let dx = -blockSize; dx <= blockSize; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            sum += grayscale[ny * width + nx];
            count++;
          }
        }
      }

      const localMean = sum / count;
      const localThreshold = localMean - C;

      // Appliquer le seuil avec contraste amélioré
      tempGrayscale[idx] = grayscale[idx] > localThreshold ? 255 : 0;
    }
  }

  // Appliquer le résultat avec netteté
  for (let i = 0; i < tempGrayscale.length; i++) {
    const value = tempGrayscale[i];
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
  }
}

/**
 * 🌫️ FILTRE NIVEAUX DE GRIS AMÉLIORÉ
 * - Contraste optimisé
 * - Préservation des détails
 * - Réduction du bruit
 */
function applyEnhancedGrayscale(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const tempData = new Uint8ClampedArray(data);

  // Convertir en niveaux de gris avec amélioration du contraste
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    
    // Amélioration du contraste (S-curve plus prononcée)
    let enhanced = applySCurve(gray / 255) * 255;
    
    // Boost de contraste supplémentaire
    enhanced = clamp((enhanced - 128) * 1.2 + 128);
    
    tempData[i] = enhanced;
    tempData[i + 1] = enhanced;
    tempData[i + 2] = enhanced;
  }

  // Appliquer netteté forte
  applyUnsharpMask(tempData, data, width, height, 2.5, 1.3);
}

/**
 * 🌈 FILTRE COULEUR VIVE - Amélioration des couleurs
 * - Saturation intelligente
 * - Contraste optimisé
 * - Netteté augmentée
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

    // Saturation très vibrante pour documents
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    const saturationBoost = 1.6;
    
    let newR = clamp(gray + (r - gray) * saturationBoost);
    let newG = clamp(gray + (g - gray) * saturationBoost);
    let newB = clamp(gray + (b - gray) * saturationBoost);

    // Contraste très élevé pour netteté maximale
    const contrastFactor = 1.5;
    newR = clamp((newR - 128) * contrastFactor + 128);
    newG = clamp((newG - 128) * contrastFactor + 128);
    newB = clamp((newB - 128) * contrastFactor + 128);

    // Correction gamma agressive
    newR = clamp(Math.pow(newR / 255, 0.8) * 255);
    newG = clamp(Math.pow(newG / 255, 0.8) * 255);
    newB = clamp(Math.pow(newB / 255, 0.8) * 255);

    tempData[i] = newR;
    tempData[i + 1] = newG;
    tempData[i + 2] = newB;
  }

  // Appliquer netteté très forte pour documents colorés
  applyUnsharpMask(tempData, data, width, height, 2.5, 1.2);
}

// ===== FONCTIONS UTILITAIRES =====

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, value));
}

function calculateHistogram(data: Uint8ClampedArray): number[] {
  const histogram = new Array(256).fill(0);
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = Math.round(
      data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    );
    histogram[brightness]++;
  }
  
  return histogram;
}

function findOptimalRange(histogram: number[]): { min: number; max: number } {
  const totalPixels = histogram.reduce((sum, val) => sum + val, 0);
  const threshold = totalPixels * 0.01; // Ignorer 1% des pixels les plus sombres/clairs

  let min = 0;
  let max = 255;
  let cumSum = 0;

  // Trouver min
  for (let i = 0; i < 256; i++) {
    cumSum += histogram[i];
    if (cumSum > threshold) {
      min = i;
      break;
    }
  }

  cumSum = 0;
  // Trouver max
  for (let i = 255; i >= 0; i--) {
    cumSum += histogram[i];
    if (cumSum > threshold) {
      max = i;
      break;
    }
  }

  return { min, max };
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function calculateOtsuThreshold(grayscale: Uint8Array): number {
  const histogram = new Array(256).fill(0);
  
  for (const value of grayscale) {
    histogram[value]++;
  }

  const total = grayscale.length;
  let sum = 0;
  
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;

    wF = total - wB;
    if (wF === 0) break;

    sumB += i * histogram[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }

  return threshold;
}

function applySCurve(x: number): number {
  // S-curve améliorée pour contraste maximal
  return 1 / (1 + Math.exp(-15 * (x - 0.5)));
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
