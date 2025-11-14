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
 * 🪄 FILTRE MAGIC - Amélioration automatique RAPIDE
 * - Auto-contraste
 * - Netteté modérée
 * - Look naturel
 */
function applyProfessionalMagicFilter(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Analyser l'histogramme pour auto-contraste
  const histogram = calculateHistogram(data);
  const { min, max } = findOptimalRange(histogram);
  const normalizeFactor = 255 / (max - min);
  
  const tempData = new Uint8ClampedArray(data);

  // Appliquer auto-contraste + léger boost
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Auto-contraste simple
    let newR = clamp((r - min) * normalizeFactor);
    let newG = clamp((g - min) * normalizeFactor);
    let newB = clamp((b - min) * normalizeFactor);

    // Léger boost de contraste
    const contrast = 1.1;
    newR = clamp((newR - 128) * contrast + 128);
    newG = clamp((newG - 128) * contrast + 128);
    newB = clamp((newB - 128) * contrast + 128);

    tempData[i] = newR;
    tempData[i + 1] = newG;
    tempData[i + 2] = newB;
  }

  // Netteté modérée
  applyUnsharpMask(tempData, data, width, height, 1.5, 1.0);
}

/**
 * ⚫⚪ FILTRE N&B ADAPTATIF RAPIDE
 * - Binarisation simple et efficace
 * - Seuil automatique Otsu
 */
function applyAdaptiveBlackAndWhite(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Convertir en niveaux de gris
  const grayscale = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    grayscale[idx] = gray;
  }

  // Calculer le seuil optimal avec Otsu
  const threshold = calculateOtsuThreshold(grayscale);

  // Appliquer la binarisation
  for (let i = 0; i < grayscale.length; i++) {
    const value = grayscale[i] > threshold ? 255 : 0;
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
  }
}

/**
 * 🌫️ FILTRE NIVEAUX DE GRIS RAPIDE
 * - Contraste amélioré
 * - Netteté modérée
 */
function applyEnhancedGrayscale(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const tempData = new Uint8ClampedArray(data);

  // Convertir en niveaux de gris avec contraste
  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    
    // Boost de contraste simple
    gray = clamp((gray - 128) * 1.2 + 128);
    
    tempData[i] = gray;
    tempData[i + 1] = gray;
    tempData[i + 2] = gray;
  }

  // Netteté modérée
  applyUnsharpMask(tempData, data, width, height, 1.5, 1.0);
}

/**
 * 🌈 FILTRE COULEUR RAPIDE
 * - Saturation améliorée
 * - Contraste modéré
 * - Netteté douce
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

    // Saturation pour documents
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    const saturationBoost = 1.3;
    
    let newR = clamp(gray + (r - gray) * saturationBoost);
    let newG = clamp(gray + (g - gray) * saturationBoost);
    let newB = clamp(gray + (b - gray) * saturationBoost);

    // Contraste modéré
    const contrastFactor = 1.15;
    newR = clamp((newR - 128) * contrastFactor + 128);
    newG = clamp((newG - 128) * contrastFactor + 128);
    newB = clamp((newB - 128) * contrastFactor + 128);

    tempData[i] = newR;
    tempData[i + 1] = newG;
    tempData[i + 2] = newB;
  }

  // Netteté modérée
  applyUnsharpMask(tempData, data, width, height, 1.5, 1.0);
}

// ===== FONCTIONS UTILITAIRES =====

/**
 * Réduction du bruit avec filtre bilatéral simplifié
 */
function reduceNoise(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const tempData = new Uint8ClampedArray(data);

  const radius = 2;
  const sigmaColor = 50;
  const sigmaSpace = 2;

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = (y * width + x) * 4;
      
      let rSum = 0, gSum = 0, bSum = 0, weightSum = 0;
      const centerR = tempData[idx];
      const centerG = tempData[idx + 1];
      const centerB = tempData[idx + 2];

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const nIdx = (ny * width + nx) * 4;

          const r = tempData[nIdx];
          const g = tempData[nIdx + 1];
          const b = tempData[nIdx + 2];

          // Distance spatiale
          const spatialDist = Math.sqrt(dx * dx + dy * dy);
          const spatialWeight = Math.exp(-(spatialDist * spatialDist) / (2 * sigmaSpace * sigmaSpace));

          // Distance de couleur
          const colorDist = Math.sqrt(
            Math.pow(r - centerR, 2) +
            Math.pow(g - centerG, 2) +
            Math.pow(b - centerB, 2)
          );
          const colorWeight = Math.exp(-(colorDist * colorDist) / (2 * sigmaColor * sigmaColor));

          const weight = spatialWeight * colorWeight;
          rSum += r * weight;
          gSum += g * weight;
          bSum += b * weight;
          weightSum += weight;
        }
      }

      data[idx] = rSum / weightSum;
      data[idx + 1] = gSum / weightSum;
      data[idx + 2] = bSum / weightSum;
    }
  }
}

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
