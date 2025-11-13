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
        const corners = detectCornersAdvanced(imageData, canvas.width, canvas.height);
        
        resolve(corners);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Détection avancée avec filtre Canny simplifié
 */
function detectCornersAdvanced(imageData: ImageData, width: number, height: number): Corner[] {
  const data = imageData.data;
  
  // 1. Conversion niveaux de gris
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  
  // 2. Détection des bords avec Sobel
  const edges = applySobelEdgeDetection(gray, width, height);
  
  // 3. Trouver le plus grand contour rectangulaire
  const corners = findLargestRectangle(edges, width, height);
  
  return corners;
}

/**
 * Filtre de détection de bords Sobel
 */
function applySobelEdgeDetection(gray: Uint8Array, width: number, height: number): Uint8Array {
  const edges = new Uint8Array(width * height);
  
  // Noyaux Sobel
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      
      // Appliquer les noyaux Sobel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[kernelIdx];
          gy += gray[idx] * sobelY[kernelIdx];
        }
      }
      
      // Magnitude du gradient
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude > 50 ? 255 : 0; // Seuillage
    }
  }
  
  return edges;
}

/**
 * Trouve le plus grand rectangle dans l'image de bords
 */
function findLargestRectangle(edges: Uint8Array, width: number, height: number): Corner[] {
  // Trouver tous les points de bord
  const edgePoints: Corner[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] > 0) {
        edgePoints.push({ x, y });
      }
    }
  }
  
  if (edgePoints.length < 4) {
    // Pas assez de points, retourner l'image entière
    return getDefaultCorners(width, height);
  }
  
  // Trouver les 4 coins extrêmes
  const corners = findExtremeCorners(edgePoints, width, height);
  
  // Vérifier si le rectangle trouvé est valide
  const area = calculateArea(corners);
  const imageArea = width * height;
  
  // Si le rectangle est trop petit (< 20% de l'image), utiliser les bords
  if (area < imageArea * 0.2) {
    return getDefaultCorners(width, height);
  }
  
  return corners;
}

/**
 * Trouve les 4 coins extrêmes parmi les points de bord
 */
function findExtremeCorners(points: Corner[], _width: number, _height: number): Corner[] {
  // Coins basés sur la position relative
  let topLeft = points[0];
  let topRight = points[0];
  let bottomLeft = points[0];
  let bottomRight = points[0];
  
  let minSum = Infinity;
  let maxSum = -Infinity;
  let minDiff = Infinity;
  let maxDiff = -Infinity;
  
  for (const p of points) {
    const sum = p.x + p.y;
    const diff = p.x - p.y;
    
    if (sum < minSum) {
      minSum = sum;
      topLeft = p;
    }
    if (sum > maxSum) {
      maxSum = sum;
      bottomRight = p;
    }
    if (diff < minDiff) {
      minDiff = diff;
      bottomLeft = p;
    }
    if (diff > maxDiff) {
      maxDiff = diff;
      topRight = p;
    }
  }
  
  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * Calcule l'aire d'un quadrilatère
 */
function calculateArea(corners: Corner[]): number {
  // Formule de Shoelace
  let area = 0;
  for (let i = 0; i < corners.length; i++) {
    const j = (i + 1) % corners.length;
    area += corners[i].x * corners[j].y;
    area -= corners[j].x * corners[i].y;
  }
  return Math.abs(area) / 2;
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
