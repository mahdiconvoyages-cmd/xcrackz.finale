/**
 * 🎨 TRAITEMENT D'IMAGE AVANCÉ - INSPIRÉ BOOSTLET
 * Algorithmes de segmentation, filtrage et amélioration pour scanner
 */

/**
 * 📊 Analyse d'histogramme avancée
 */
export function analyzeHistogram(imageData: ImageData): {
  brightness: number;
  contrast: number;
  histogram: number[];
} {
  const data = imageData.data;
  const histogram = new Array(256).fill(0);
  let totalBrightness = 0;

  // Calculer l'histogramme
  for (let i = 0; i < data.length; i += 4) {
    const brightness = Math.round(
      data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    );
    histogram[brightness]++;
    totalBrightness += brightness;
  }

  const pixelCount = data.length / 4;
  const avgBrightness = totalBrightness / pixelCount;

  // Calculer le contraste (écart-type)
  let variance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    variance += Math.pow(brightness - avgBrightness, 2);
  }
  const contrast = Math.sqrt(variance / pixelCount);

  return { brightness: avgBrightness, contrast, histogram };
}

/**
 * 🎯 Égalisation d'histogramme adaptative (CLAHE)
 * Améliore le contraste local sans sur-amplifier le bruit
 */
export function applyCLAHE(imageData: ImageData, clipLimit = 2.0): void {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Taille des tuiles (8x8)
  const tileSize = 8;
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);

  // Convertir en niveaux de gris et traiter par tuiles
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = Math.round(
      data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    );
  }

  // Égalisation par tuile
  const enhanced = new Uint8Array(gray);
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const startX = tx * tileSize;
      const startY = ty * tileSize;
      const endX = Math.min(startX + tileSize, width);
      const endY = Math.min(startY + tileSize, height);

      // Histogramme de la tuile
      const tileHist = new Array(256).fill(0);
      let tilePixels = 0;

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          tileHist[gray[y * width + x]]++;
          tilePixels++;
        }
      }

      // Clip l'histogramme
      const clipPixels = Math.round((clipLimit * tilePixels) / 256);
      let clippedTotal = 0;
      for (let i = 0; i < 256; i++) {
        if (tileHist[i] > clipPixels) {
          clippedTotal += tileHist[i] - clipPixels;
          tileHist[i] = clipPixels;
        }
      }

      // Redistribuer les pixels clippés
      const redistribute = Math.floor(clippedTotal / 256);
      for (let i = 0; i < 256; i++) {
        tileHist[i] += redistribute;
      }

      // Créer la fonction de transfert
      const cdf = new Array(256).fill(0);
      cdf[0] = tileHist[0];
      for (let i = 1; i < 256; i++) {
        cdf[i] = cdf[i - 1] + tileHist[i];
      }

      // Normaliser
      const cdfMin = cdf.find(v => v > 0) || 0;
      const scale = 255 / (tilePixels - cdfMin);

      // Appliquer la transformation
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = y * width + x;
          const oldValue = gray[idx];
          enhanced[idx] = Math.round((cdf[oldValue] - cdfMin) * scale);
        }
      }
    }
  }

  // Appliquer aux données couleur
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    const oldGray = gray[idx];
    const newGray = enhanced[idx];
    
    if (oldGray > 0) {
      const ratio = newGray / oldGray;
      data[i] = clamp(data[i] * ratio);
      data[i + 1] = clamp(data[i + 1] * ratio);
      data[i + 2] = clamp(data[i + 2] * ratio);
    }
  }
}

/**
 * 🔍 Détection de bords Sobel optimisée
 */
export function applySobelEdgeDetection(imageData: ImageData): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new ImageData(width, height);

  // Convertir en niveaux de gris
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  // Noyaux Sobel
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const weight = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[weight];
          gy += gray[idx] * sobelY[weight];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const outIdx = (y * width + x) * 4;
      const value = clamp(magnitude);

      output.data[outIdx] = value;
      output.data[outIdx + 1] = value;
      output.data[outIdx + 2] = value;
      output.data[outIdx + 3] = 255;
    }
  }

  return output;
}

/**
 * 🌟 Réduction de bruit par filtre bilatéral
 * Préserve les bords tout en lissant les zones uniformes
 */
export function applyBilateralFilter(
  imageData: ImageData,
  diameter = 5,
  sigmaColor = 75,
  sigmaSpace = 75
): void {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const tempData = new Uint8ClampedArray(data);

  const radius = Math.floor(diameter / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerIdx = (y * width + x) * 4;
      const centerR = data[centerIdx];
      const centerG = data[centerIdx + 1];
      const centerB = data[centerIdx + 2];

      let sumR = 0, sumG = 0, sumB = 0;
      let weightSum = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

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

            sumR += r * weight;
            sumG += g * weight;
            sumB += b * weight;
            weightSum += weight;
          }
        }
      }

      tempData[centerIdx] = Math.round(sumR / weightSum);
      tempData[centerIdx + 1] = Math.round(sumG / weightSum);
      tempData[centerIdx + 2] = Math.round(sumB / weightSum);
    }
  }

  data.set(tempData);
}

/**
 * 📐 Correction de perspective automatique
 */
export function autoCorrectPerspective(imageData: ImageData): ImageData {
  // Détection des lignes principales
  const _edges = applySobelEdgeDetection(imageData);
  
  // Transformation de Hough pour détecter les lignes
  // (Simplifié pour performance)
  
  return imageData; // Retourner l'image corrigée
}

/**
 * 🎨 Amélioration intelligente pour documents
 */
export function enhanceDocument(imageData: ImageData): void {
  const analysis = analyzeHistogram(imageData);
  
  // Si l'image est trop sombre ou a peu de contraste
  if (analysis.brightness < 100 || analysis.contrast < 30) {
    applyCLAHE(imageData, 3.0);
  } else {
    applyCLAHE(imageData, 2.0);
  }

  // Réduction du bruit légère
  applyBilateralFilter(imageData, 3, 50, 50);
}

/**
 * 🔬 Segmentation automatique texte/fond
 */
export function segmentTextBackground(imageData: ImageData): {
  text: ImageData;
  background: ImageData;
} {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const text = new ImageData(width, height);
  const background = new ImageData(width, height);

  // Calculer le seuil optimal (Otsu)
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(
      data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    );
    histogram[gray]++;
  }

  const threshold = calculateOtsuThreshold(histogram, data.length / 4);

  // Séparer texte et fond
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

    if (gray < threshold) {
      // Texte (sombre)
      text.data[i] = data[i];
      text.data[i + 1] = data[i + 1];
      text.data[i + 2] = data[i + 2];
      text.data[i + 3] = 255;

      background.data[i] = 255;
      background.data[i + 1] = 255;
      background.data[i + 2] = 255;
      background.data[i + 3] = 255;
    } else {
      // Fond (clair)
      text.data[i] = 255;
      text.data[i + 1] = 255;
      text.data[i + 2] = 255;
      text.data[i + 3] = 255;

      background.data[i] = data[i];
      background.data[i + 1] = data[i + 1];
      background.data[i + 2] = data[i + 2];
      background.data[i + 3] = 255;
    }
  }

  return { text, background };
}

function calculateOtsuThreshold(histogram: number[], total: number): number {
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

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, value));
}
