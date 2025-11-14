/**
 * Détection automatique de documents - VERSION OPTIMISÉE
 * Détection de contours + Correction perspective VRAIE
 */

interface Corner {
  x: number;
  y: number;
}

/**
 * Détecte les bords d'un document avec analyse de contours
 */
export async function detectDocumentCorners(imageDataUrl: string): Promise<Corner[]> {
  const img = await loadImageElement(imageDataUrl);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = img.width;
  sourceCanvas.height = img.height;
  const baseCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });

  if (!baseCtx) {
    return getDefaultCorners(img.width, img.height);
  }

  baseCtx.drawImage(img, 0, 0);

  const { imageData, scale } = getScaledImageData(baseCtx, img.width, img.height);
  const advancedCorners = detectCornersAdvanced(imageData, imageData.width, imageData.height);

  if (!advancedCorners || advancedCorners.length !== 4) {
    return getDefaultCorners(img.width, img.height);
  }

  // Remapper les coins à l'échelle originale
  return normalizeCornersOrder(
    advancedCorners.map((corner) => ({
      x: corner.x / scale,
      y: corner.y / scale,
    }))
  );
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
}

function getScaledImageData(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const MAX_DIMENSION = 800; // Réduit de 1200 à 800 pour plus de rapidité
  const largestSide = Math.max(width, height);
  const scale = largestSide > MAX_DIMENSION ? MAX_DIMENSION / largestSide : 1;

  const scaledWidth = Math.round(width * scale);
  const scaledHeight = Math.round(height * scale);

  if (scale === 1) {
    return { imageData: ctx.getImageData(0, 0, width, height), scale };
  }

  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = scaledWidth;
  scaledCanvas.height = scaledHeight;
  const scaledCtx = scaledCanvas.getContext('2d', { willReadFrequently: true })!;
  
  // Utiliser imageSmoothingQuality pour un meilleur équilibre vitesse/qualité
  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = 'low';
  scaledCtx.drawImage(ctx.canvas, 0, 0, scaledWidth, scaledHeight);

  return { imageData: scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight), scale };
}

function detectCornersAdvanced(imageData: ImageData, width: number, height: number): Corner[] | null {
  const grayscale = convertToGrayscale(imageData.data, width, height);
  const blurred = gaussianBlur(grayscale, width, height);
  const { magnitude, direction } = sobelWithDirection(blurred, width, height);
  const suppressed = nonMaxSuppression(magnitude, direction, width, height);
  const edgeMap = hysteresisThreshold(suppressed, width, height, 15, 50); // Seuils légèrement réduits pour plus de tolérance
  const contours = extractContours(edgeMap, width, height);
  const bestContour = selectBestContour(contours, width, height);

  if (!bestContour) {
    return null;
  }

  const hull = convexHull(bestContour);
  if (hull.length < 4) {
    return null;
  }

  const rectCorners = minimumBoundingRectangle(hull);
  return rectCorners ? rectCorners : null;
}

function convertToGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  return gray;
}

function gaussianBlur(gray: Float32Array, width: number, height: number): Float32Array {
  const kernel = [
    2, 4, 5, 4, 2,
    4, 9, 12, 9, 4,
    5, 12, 15, 12, 5,
    4, 9, 12, 9, 4,
    2, 4, 5, 4, 2,
  ];
  const kernelSize = 5;
  const kernelSum = 159;
  const output = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ky = -2; ky <= 2; ky++) {
        for (let kx = -2; kx <= 2; kx++) {
          const px = Math.min(width - 1, Math.max(0, x + kx));
          const py = Math.min(height - 1, Math.max(0, y + ky));
          const weight = kernel[(ky + 2) * kernelSize + (kx + 2)];
          sum += gray[py * width + px] * weight;
        }
      }
      output[y * width + x] = sum / kernelSum;
    }
  }

  return output;
}

function sobelWithDirection(gray: Float32Array, width: number, height: number) {
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[kernelIdx];
          gy += gray[idx] * sobelY[kernelIdx];
        }
      }

      const mag = Math.sqrt(gx * gx + gy * gy);
      magnitude[y * width + x] = mag;
      direction[y * width + x] = Math.atan2(gy, gx);
    }
  }

  return { magnitude, direction };
}

function nonMaxSuppression(
  magnitude: Float32Array,
  direction: Float32Array,
  width: number,
  height: number
): Float32Array {
  const suppressed = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = (direction[idx] * 180) / Math.PI;
      let sector = ((Math.round(angle / 45) + 4) % 4) as 0 | 1 | 2 | 3;

      const neighbors: [number, number] = [0, 0];

      switch (sector) {
        case 0:
          neighbors[0] = idx + 1;
          neighbors[1] = idx - 1;
          break;
        case 1:
          neighbors[0] = idx + width + 1;
          neighbors[1] = idx - width - 1;
          break;
        case 2:
          neighbors[0] = idx + width;
          neighbors[1] = idx - width;
          break;
        case 3:
          neighbors[0] = idx + width - 1;
          neighbors[1] = idx - width + 1;
          break;
      }

      if (
        magnitude[idx] >= magnitude[neighbors[0]] &&
        magnitude[idx] >= magnitude[neighbors[1]]
      ) {
        suppressed[idx] = magnitude[idx];
      } else {
        suppressed[idx] = 0;
      }
    }
  }

  return suppressed;
}

function hysteresisThreshold(
  suppressed: Float32Array,
  width: number,
  height: number,
  lowThreshold: number,
  highThreshold: number
): Uint8Array {
  const result = new Uint8Array(width * height);
  const strong = 255;
  const weak = 75;

  for (let i = 0; i < suppressed.length; i++) {
    if (suppressed[i] >= highThreshold) {
      result[i] = strong;
    } else if (suppressed[i] >= lowThreshold) {
      result[i] = weak;
    } else {
      result[i] = 0;
    }
  }

  // liaison des faibles avec les forts
  const neighbors = [-width - 1, -width, -width + 1, -1, 1, width - 1, width, width + 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (result[idx] === weak) {
        let connected = false;
        for (const offset of neighbors) {
          if (result[idx + offset] === strong) {
            connected = true;
            break;
          }
        }
        result[idx] = connected ? strong : 0;
      }
    }
  }

  return result;
}

function extractContours(edges: Uint8Array, width: number, height: number): Corner[][] {
  const visited = new Uint8Array(width * height);
  const contours: Corner[][] = [];
  const offsets = [-width - 1, -width, -width + 1, -1, 1, width - 1, width, width + 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (edges[idx] === 0 || visited[idx]) {
        continue;
      }

      const stack = [idx];
      visited[idx] = 1;
      const contour: Corner[] = [];

      while (stack.length) {
        const current = stack.pop()!;
        const cx = current % width;
        const cy = Math.floor(current / width);
        contour.push({ x: cx, y: cy });

        for (const offset of offsets) {
          const neighbor = current + offset;
          if (neighbor < 0 || neighbor >= edges.length) continue;
          if (edges[neighbor] === 0 || visited[neighbor]) continue;
          visited[neighbor] = 1;
          stack.push(neighbor);
        }
      }

      if (contour.length > 20) {
        contours.push(contour);
      }
    }
  }

  return contours;
}

function selectBestContour(contours: Corner[][], width: number, height: number): Corner[] | null {
  if (!contours.length) return null;

  const imageArea = width * height;
  let best: Corner[] | null = null;
  let bestScore = 0;

  for (const contour of contours) {
    const hull = convexHull(contour);
    if (hull.length < 4) continue;

    const area = calculateArea(hull);
    const fillRatio = area / imageArea;

    if (area > bestScore && fillRatio > 0.1) {
      bestScore = area;
      best = hull;
    }
  }

  return best;
}

function convexHull(points: Corner[]): Corner[] {
  if (points.length <= 3) {
    return points.slice();
  }

  const sorted = points
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const build = (pts: Corner[]) => {
    const stack: Corner[] = [];
    for (const p of pts) {
      while (
        stack.length >= 2 &&
        cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0
      ) {
        stack.pop();
      }
      stack.push(p);
    }
    stack.pop();
    return stack;
  };

  const lower = build(sorted);
  const upper = build(sorted.slice().reverse());

  return lower.concat(upper);
}

function cross(o: Corner, a: Corner, b: Corner) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function minimumBoundingRectangle(points: Corner[]): Corner[] | null {
  if (points.length < 4) return null;

  // Approximer le contour en polygone avec moins de points (Douglas-Peucker simplifié)
  const simplified = simplifyPolygon(points, 10);
  
  if (simplified.length < 4) {
    // Fallback: prendre les 4 coins extrêmes du convex hull
    return findQuadrilateralCorners(points);
  }

  // Si on a exactement 4 points après simplification, c'est parfait
  if (simplified.length === 4) {
    return normalizeCornersOrder(simplified);
  }

  // Sinon, trouver le meilleur quadrilatère qui approxime le polygone
  return findQuadrilateralCorners(simplified);
}

/**
 * Simplification de polygone (Douglas-Peucker light) - optimisé
 */
function simplifyPolygon(points: Corner[], tolerance: number): Corner[] {
  if (points.length <= 4) return points;

  const result: Corner[] = [points[0]];
  const step = Math.max(1, Math.floor(points.length / 100)); // Sauter des points pour accélérer
  
  for (let i = step; i < points.length - step; i += step) {
    const prev = result[result.length - 1];
    const current = points[i];
    const next = points[Math.min(i + step, points.length - 1)];
    
    // Distance perpendiculaire du point à la ligne prev-next
    const dist = perpendicularDistance(current, prev, next);
    
    if (dist > tolerance) {
      result.push(current);
    }
  }
  
  result.push(points[points.length - 1]);
  return result;
}

function perpendicularDistance(point: Corner, lineStart: Corner, lineEnd: Corner): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }
  
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
  
  if (t < 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }
  if (t > 1) {
    return Math.sqrt((point.x - lineEnd.x) ** 2 + (point.y - lineEnd.y) ** 2);
  }
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

/**
 * Trouve les 4 coins d'un quadrilatère à partir d'un ensemble de points
 */
function findQuadrilateralCorners(points: Corner[]): Corner[] {
  if (points.length <= 4) {
    return normalizeCornersOrder(points.slice(0, 4));
  }

  // Calculer le centroïde
  const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  // Diviser en 4 quadrants et prendre le point le plus éloigné du centre dans chaque quadrant
  const topLeft = points
    .filter(p => p.x < cx && p.y < cy)
    .sort((a, b) => {
      const distA = (a.x - cx) ** 2 + (a.y - cy) ** 2;
      const distB = (b.x - cx) ** 2 + (b.y - cy) ** 2;
      return distB - distA;
    })[0];

  const topRight = points
    .filter(p => p.x >= cx && p.y < cy)
    .sort((a, b) => {
      const distA = (a.x - cx) ** 2 + (a.y - cy) ** 2;
      const distB = (b.x - cx) ** 2 + (b.y - cy) ** 2;
      return distB - distA;
    })[0];

  const bottomRight = points
    .filter(p => p.x >= cx && p.y >= cy)
    .sort((a, b) => {
      const distA = (a.x - cx) ** 2 + (a.y - cy) ** 2;
      const distB = (b.x - cx) ** 2 + (b.y - cy) ** 2;
      return distB - distA;
    })[0];

  const bottomLeft = points
    .filter(p => p.x < cx && p.y >= cy)
    .sort((a, b) => {
      const distA = (a.x - cx) ** 2 + (a.y - cy) ** 2;
      const distB = (b.x - cx) ** 2 + (b.y - cy) ** 2;
      return distB - distA;
    })[0];

  // Si un quadrant est vide, utiliser les coins extrêmes globaux
  const corners = [
    topLeft || points.reduce((min, p) => (p.x + p.y < min.x + min.y ? p : min)),
    topRight || points.reduce((max, p) => (p.x - p.y > max.x - max.y ? p : max)),
    bottomRight || points.reduce((max, p) => (p.x + p.y > max.x + max.y ? p : max)),
    bottomLeft || points.reduce((min, p) => (p.x - p.y < min.x - min.y ? p : min)),
  ];

  return normalizeCornersOrder(corners);
}

function normalizeCornersOrder(corners: Corner[]): Corner[] {
  if (corners.length !== 4) return corners;

  const sorted = corners.slice().sort((a, b) => a.y - b.y);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bottom = sorted.slice(2, 4).sort((a, b) => a.x - b.x);

  return [top[0], top[1], bottom[1], bottom[0]];
}

function calculateArea(points: Corner[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Coins par défaut (bordure avec petite marge)
 */
function getDefaultCorners(width: number, height: number): Corner[] {
  const margin = Math.min(width, height) * 0.02;
  return [
    { x: margin, y: margin },
    { x: width - margin, y: margin },
    { x: width - margin, y: height - margin },
    { x: margin, y: height - margin },
  ];
}

/**
 * Recadrage et correction de perspective OPTIMISÉ
 * Utilise une transformation perspective réelle avec interpolation
 */
export async function cropAndCorrectPerspective(
  imageDataUrl: string,
  corners: Corner[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculer les dimensions du rectangle de destination
        const widthTop = distance(corners[0], corners[1]);
        const widthBottom = distance(corners[3], corners[2]);
        const heightLeft = distance(corners[0], corners[3]);
        const heightRight = distance(corners[1], corners[2]);
        
        const outputWidth = Math.round(Math.max(widthTop, widthBottom));
        const outputHeight = Math.round(Math.max(heightLeft, heightRight));
        
        // Limiter la taille pour performance (max 2500px)
        const MAX_SIZE = 2500;
        let scale = 1;
        if (outputWidth > MAX_SIZE || outputHeight > MAX_SIZE) {
          scale = Math.min(MAX_SIZE / outputWidth, MAX_SIZE / outputHeight);
        }
        
        const finalWidth = Math.round(outputWidth * scale);
        const finalHeight = Math.round(outputHeight * scale);
        
        // Canvas pour l'image source
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
        srcCtx.drawImage(img, 0, 0);
        const srcData = srcCtx.getImageData(0, 0, img.width, img.height);
        
        // Canvas de destination
        const dstCanvas = document.createElement('canvas');
        dstCanvas.width = finalWidth;
        dstCanvas.height = finalHeight;
        const dstCtx = dstCanvas.getContext('2d')!;
        const dstData = dstCtx.createImageData(finalWidth, finalHeight);
        
        // Points de destination (rectangle parfait)
        const dstCorners: Corner[] = [
          { x: 0, y: 0 },
          { x: finalWidth, y: 0 },
          { x: finalWidth, y: finalHeight },
          { x: 0, y: finalHeight }
        ];
        
        // Calculer la matrice de transformation inverse (dst -> src)
        const matrix = computePerspectiveMatrix(dstCorners, corners);
        
        // Appliquer la transformation avec échantillonnage adaptatif
        applyPerspectiveWarp(srcData, dstData, matrix, img.width, img.height, finalWidth, finalHeight);
        
        // Mettre l'image transformée sur le canvas
        dstCtx.putImageData(dstData, 0, 0);
        
        resolve(dstCanvas.toDataURL('image/jpeg', 0.92));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Calcule la distance entre deux points
 */
function distance(p1: Corner, p2: Corner): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Calcule la matrice de transformation perspective (homographie)
 * Résout le système linéaire pour mapper 4 points src vers 4 points dst
 */
function computePerspectiveMatrix(src: Corner[], dst: Corner[]): number[] {
  // Construction du système linéaire Ax = b
  const A: number[][] = [];
  const b: number[] = [];
  
  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;
    
    // Équations pour x
    A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]);
    b.push(dx);
    
    // Équations pour y
    A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]);
    b.push(dy);
  }
  
  // Résolution par élimination de Gauss
  const h = gaussianElimination(A, b);
  
  // Matrice 3x3 complète [h0, h1, h2, h3, h4, h5, h6, h7, 1]
  return [...h, 1];
}

/**
 * Résolution de système linéaire par élimination de Gauss
 */
function gaussianElimination(A: number[][], b: number[]): number[] {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);
  
  // Élimination avant
  for (let i = 0; i < n; i++) {
    // Pivot partiel
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    // Élimination
    for (let k = i + 1; k < n; k++) {
      const factor = augmented[k][i] / augmented[i][i];
      for (let j = i; j <= n; j++) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  
  // Substitution arrière
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = augmented[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= augmented[i][j] * x[j];
    }
    x[i] /= augmented[i][i];
  }
  
  return x;
}

/**
 * Applique la transformation perspective avec échantillonnage bilinéaire
 * Utilise un échantillonnage par blocs pour optimisation
 */
function applyPerspectiveWarp(
  srcData: ImageData,
  dstData: ImageData,
  matrix: number[],
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number
) {
  const BLOCK_SIZE = 1; // Échantillonnage par pixel pour qualité maximale
  
  for (let dy = 0; dy < dstH; dy += BLOCK_SIZE) {
    for (let dx = 0; dx < dstW; dx += BLOCK_SIZE) {
      // Transformation inverse: dst -> src
      const w = matrix[6] * dx + matrix[7] * dy + matrix[8];
      const sx = (matrix[0] * dx + matrix[1] * dy + matrix[2]) / w;
      const sy = (matrix[3] * dx + matrix[4] * dy + matrix[5]) / w;
      
      // Vérifier que le point est dans l'image source
      if (sx >= 0 && sx < srcW - 1 && sy >= 0 && sy < srcH - 1) {
        // Interpolation bilinéaire pour qualité
        const color = bilinearSample(srcData, sx, sy, srcW, srcH);
        
        // Appliquer au bloc de destination
        for (let by = 0; by < BLOCK_SIZE && dy + by < dstH; by++) {
          for (let bx = 0; bx < BLOCK_SIZE && dx + bx < dstW; bx++) {
            const dstIdx = ((dy + by) * dstW + (dx + bx)) * 4;
            dstData.data[dstIdx] = color.r;
            dstData.data[dstIdx + 1] = color.g;
            dstData.data[dstIdx + 2] = color.b;
            dstData.data[dstIdx + 3] = 255;
          }
        }
      }
    }
  }
}

/**
 * Échantillonnage bilinéaire pour interpolation lisse
 */
function bilinearSample(
  data: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): { r: number; g: number; b: number } {
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  const x2 = Math.min(x1 + 1, width - 1);
  const y2 = Math.min(y1 + 1, height - 1);
  
  const fx = x - x1;
  const fy = y - y1;
  
  const getPixel = (px: number, py: number) => {
    const idx = (py * width + px) * 4;
    return {
      r: data.data[idx],
      g: data.data[idx + 1],
      b: data.data[idx + 2]
    };
  };
  
  const p11 = getPixel(x1, y1);
  const p21 = getPixel(x2, y1);
  const p12 = getPixel(x1, y2);
  const p22 = getPixel(x2, y2);
  
  // Interpolation bilinéaire
  const r = (1 - fx) * (1 - fy) * p11.r + fx * (1 - fy) * p21.r + (1 - fx) * fy * p12.r + fx * fy * p22.r;
  const g = (1 - fx) * (1 - fy) * p11.g + fx * (1 - fy) * p21.g + (1 - fx) * fy * p12.g + fx * fy * p22.g;
  const b = (1 - fx) * (1 - fy) * p11.b + fx * (1 - fy) * p21.b + (1 - fx) * fy * p12.b + fx * fy * p22.b;
  
  return {
    r: Math.round(Math.max(0, Math.min(255, r))),
    g: Math.round(Math.max(0, Math.min(255, g))),
    b: Math.round(Math.max(0, Math.min(255, b)))
  };
}

/**
 * Version simplifiée - charge instantanément
 */
export async function loadOpenCV(): Promise<any> {
  // Pas besoin de charger OpenCV - on utilise Canvas API uniquement
  return Promise.resolve(true);
}
