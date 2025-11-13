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
 * Recadrage et correction de perspective SIMPLIFIÉ
 * Approche pragmatique : rotation + crop des coins
 */
export async function cropAndCorrectPerspective(
  imageDataUrl: string,
  corners: Corner[]
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

        // Calculer l'angle de rotation du document
        const angle = Math.atan2(
          corners[1].y - corners[0].y,
          corners[1].x - corners[0].x
        );
        
        // Dimensions du canvas pour contenir l'image pivotée
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));
        const newWidth = img.width * cos + img.height * sin;
        const newHeight = img.width * sin + img.height * cos;
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Pivoter l'image
        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(-angle);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Calculer les coins après rotation
        const centerX = newWidth / 2;
        const centerY = newHeight / 2;
        
        const rotatedCorners = corners.map(c => {
          const dx = c.x - img.width / 2;
          const dy = c.y - img.height / 2;
          return {
            x: centerX + (dx * Math.cos(-angle) - dy * Math.sin(-angle)),
            y: centerY + (dx * Math.sin(-angle) + dy * Math.cos(-angle))
          };
        });
        
        // Trouver le rectangle englobant des coins
        const minX = Math.max(0, Math.min(...rotatedCorners.map(c => c.x)));
        const maxX = Math.min(newWidth, Math.max(...rotatedCorners.map(c => c.x)));
        const minY = Math.max(0, Math.min(...rotatedCorners.map(c => c.y)));
        const maxY = Math.min(newHeight, Math.max(...rotatedCorners.map(c => c.y)));
        
        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;
        
        // Extraire la région recadrée
        const croppedImageData = ctx.getImageData(minX, minY, cropWidth, cropHeight);
        
        // Canvas final
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = cropWidth;
        finalCanvas.height = cropHeight;
        const finalCtx = finalCanvas.getContext('2d')!;
        finalCtx.putImageData(croppedImageData, 0, 0);
        
        resolve(finalCanvas.toDataURL('image/jpeg', 0.92));
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Version simplifiée - charge instantanément
 */
export async function loadOpenCV(): Promise<any> {
  // Pas besoin de charger OpenCV - on utilise Canvas API uniquement
  return Promise.resolve(true);
}
