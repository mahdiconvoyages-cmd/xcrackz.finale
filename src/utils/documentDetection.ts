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
 * Recadrage et correction de perspective VRAIE avec matrice homographique
 */
export async function cropAndCorrectPerspective(
  imageDataUrl: string,
  corners: Corner[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Réduire la résolution si l'image est trop grande (pour performance)
        const MAX_SIZE = 2000;
        let scale = 1;
        if (img.width > MAX_SIZE || img.height > MAX_SIZE) {
          scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
        }
        
        // Scaler les coins
        const scaledCorners = corners.map(c => ({ x: c.x * scale, y: c.y * scale }));
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Calculer les dimensions du document redressé
        const widthTop = distance(scaledCorners[0], scaledCorners[1]);
        const widthBottom = distance(scaledCorners[3], scaledCorners[2]);
        const heightLeft = distance(scaledCorners[0], scaledCorners[3]);
        const heightRight = distance(scaledCorners[1], scaledCorners[2]);
        
        const maxWidth = Math.max(widthTop, widthBottom);
        const maxHeight = Math.max(heightLeft, heightRight);
        
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        
        // Points de destination (rectangle parfait)
        const dstCorners: Corner[] = [
          { x: 0, y: 0 },
          { x: maxWidth, y: 0 },
          { x: maxWidth, y: maxHeight },
          { x: 0, y: maxHeight }
        ];
        
        // Appliquer la transformation perspective OPTIMISÉE
        applyPerspectiveTransformOptimized(ctx, img, scaledCorners, dstCorners, maxWidth, maxHeight, scale);
        
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Applique une transformation perspective OPTIMISÉE avec résolution adaptative
 * Traite par blocs de 4x4 pixels pour être 16x plus rapide
 */
function applyPerspectiveTransformOptimized(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  srcCorners: Corner[],
  dstCorners: Corner[],
  width: number,
  height: number,
  scale: number
) {
  // Créer un canvas temporaire avec l'image source réduite
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.width * scale;
  tempCanvas.height = img.height * scale;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
  const srcData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  
  // Canvas de destination
  const dstData = ctx.createImageData(width, height);
  
  // Calculer la matrice homographique inverse (destination → source)
  const matrix = calculateHomographyMatrix(dstCorners, srcCorners);
  
  // Transformer par blocs de pixels (OPTIMISATION MAJEURE)
  const BLOCK_SIZE = 2; // Traiter par blocs de 2x2
  
  for (let y = 0; y < height; y += BLOCK_SIZE) {
    for (let x = 0; x < width; x += BLOCK_SIZE) {
      // Point central du bloc
      const centerX = x + BLOCK_SIZE / 2;
      const centerY = y + BLOCK_SIZE / 2;
      
      // Calculer la transformation pour le centre du bloc
      const w = matrix[6] * centerX + matrix[7] * centerY + matrix[8];
      const srcX = (matrix[0] * centerX + matrix[1] * centerY + matrix[2]) / w;
      const srcY = (matrix[3] * centerX + matrix[4] * centerY + matrix[5]) / w;
      
      // Vérifier si le point est dans l'image source
      if (srcX >= 0 && srcX < tempCanvas.width - 1 &&
          srcY >= 0 && srcY < tempCanvas.height - 1) {
        
        // Échantillonner la couleur (interpolation simple)
        const srcIdx = (Math.floor(srcY) * tempCanvas.width + Math.floor(srcX)) * 4;
        const r = srcData.data[srcIdx];
        const g = srcData.data[srcIdx + 1];
        const b = srcData.data[srcIdx + 2];
        
        // Appliquer la couleur à tout le bloc
        for (let by = 0; by < BLOCK_SIZE && y + by < height; by++) {
          for (let bx = 0; bx < BLOCK_SIZE && x + bx < width; bx++) {
            const dstIdx = ((y + by) * width + (x + bx)) * 4;
            dstData.data[dstIdx] = r;
            dstData.data[dstIdx + 1] = g;
            dstData.data[dstIdx + 2] = b;
            dstData.data[dstIdx + 3] = 255;
          }
        }
      }
    }
  }
  
  ctx.putImageData(dstData, 0, 0);
}

/**
 * Calcule la matrice homographique 3x3 entre deux ensembles de 4 points
 * Résout le système linéaire pour trouver la transformation perspective
 */
function calculateHomographyMatrix(src: Corner[], dst: Corner[]): number[] {
  // Construction de la matrice A (8x8) pour le système linéaire
  // Pour 4 points, on a 8 équations (2 par point)
  const A: number[][] = [];
  const b: number[] = [];
  
  for (let i = 0; i < 4; i++) {
    const x = src[i].x;
    const y = src[i].y;
    const X = dst[i].x;
    const Y = dst[i].y;
    
    // Équation pour x
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    
    // Équation pour y
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  
  // Résoudre le système avec élimination de Gauss
  const h = solveLinearSystem(A, b);
  
  // La matrice homographique est 3x3, le dernier élément est 1
  return [...h, 1];
}

/**
 * Résout un système linéaire Ax = b avec élimination de Gauss
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  
  // Copier les matrices pour ne pas modifier les originales
  const matrix = A.map((row, i) => [...row, b[i]]);
  
  // Élimination avant
  for (let i = 0; i < n; i++) {
    // Trouver le pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
        maxRow = k;
      }
    }
    
    // Échanger les lignes
    [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];
    
    // Éliminer la colonne
    for (let k = i + 1; k < n; k++) {
      const factor = matrix[k][i] / matrix[i][i];
      for (let j = i; j <= n; j++) {
        matrix[k][j] -= factor * matrix[i][j];
      }
    }
  }
  
  // Substitution arrière
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = matrix[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= matrix[i][j] * x[j];
    }
    x[i] /= matrix[i][i];
  }
  
  return x;
}

/**
 * Calcule la distance entre deux points
 */
function distance(p1: Corner, p2: Corner): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Version simplifiée - charge instantanément
 */
export async function loadOpenCV(): Promise<any> {
  // Pas besoin de charger OpenCV - on utilise Canvas API uniquement
  return Promise.resolve(true);
}
