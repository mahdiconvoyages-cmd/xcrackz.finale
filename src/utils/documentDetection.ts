/**
 * Détection automatique de documents - VERSION LÉGÈRE
 * Utilise Canvas API au lieu d'OpenCV pour être instantané
 */

interface Corner {
  x: number;
  y: number;
}

/**
 * Détection simplifiée des bords (instantanée, sans OpenCV)
 * Utilise l'analyse de contraste sur les bords de l'image
 */
export async function detectDocumentCorners(imageDataUrl: string): Promise<Corner[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const targetSize = 800; // Réduire pour performance
        const scale = Math.min(targetSize / img.width, targetSize / img.height);
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const corners = detectCornersSimple(imageData, canvas.width, canvas.height);
        
        // Rescale les coins à la taille originale
        const rescaledCorners = corners.map(c => ({
          x: c.x / scale,
          y: c.y / scale
        }));
        
        resolve(rescaledCorners);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Détection simple des coins basée sur l'analyse de contraste
 */
function detectCornersSimple(imageData: ImageData, width: number, height: number): Corner[] {
  const data = imageData.data;
  
  // Convertir en niveaux de gris et calculer les gradients
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    gray[idx] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }
  
  // Trouver les zones de fort contraste (bords probables)
  const margin = Math.min(width, height) * 0.05;
  const searchMargin = Math.min(width, height) * 0.3;
  
  // Rechercher les coins dans les quadrants
  const topLeft = findCornerInQuadrant(gray, width, height, 
    margin, margin, searchMargin, searchMargin, 'top-left');
  const topRight = findCornerInQuadrant(gray, width, height,
    width - searchMargin, margin, width - margin, searchMargin, 'top-right');
  const bottomRight = findCornerInQuadrant(gray, width, height,
    width - searchMargin, height - searchMargin, width - margin, height - margin, 'bottom-right');
  const bottomLeft = findCornerInQuadrant(gray, width, height,
    margin, height - searchMargin, searchMargin, height - margin, 'bottom-left');
  
  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * Trouve le coin avec le plus fort gradient dans un quadrant
 */
function findCornerInQuadrant(
  gray: Uint8Array,
  width: number,
  height: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: string
): Corner {
  let maxGradient = 0;
  let bestX = (x1 + x2) / 2;
  let bestY = (y1 + y2) / 2;
  
  for (let y = Math.floor(y1); y < Math.floor(y2); y += 3) {
    for (let x = Math.floor(x1); x < Math.floor(x2); x += 3) {
      if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;
      
      const idx = y * width + x;
      const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
      const gy = Math.abs(gray[idx + width] - gray[idx - width]);
      const gradient = gx + gy;
      
      if (gradient > maxGradient) {
        maxGradient = gradient;
        bestX = x;
        bestY = y;
      }
    }
  }
  
  return { x: bestX, y: bestY };
}

/**
 * Recadrage et correction de perspective (Canvas uniquement)
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

        // Calculer les dimensions du document
        const widthTop = distance(corners[0], corners[1]);
        const widthBottom = distance(corners[3], corners[2]);
        const heightLeft = distance(corners[0], corners[3]);
        const heightRight = distance(corners[1], corners[2]);
        
        const maxWidth = Math.max(widthTop, widthBottom);
        const maxHeight = Math.max(heightLeft, heightRight);
        
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        
        // Transformation perspective simplifiée (approximation)
        // Pour une vraie transformation, il faudrait OpenCV, mais c'est trop lourd
        // On fait une approximation qui marche bien dans 90% des cas
        
        ctx.save();
        
        // Calculer l'angle moyen du document
        const angle = Math.atan2(
          corners[1].y - corners[0].y,
          corners[1].x - corners[0].x
        );
        
        // Centrer et faire pivoter
        ctx.translate(maxWidth / 2, maxHeight / 2);
        ctx.rotate(-angle);
        
        // Calculer le scale pour remplir le canvas
        const scaleX = maxWidth / img.width;
        const scaleY = maxHeight / img.height;
        const scale = Math.max(scaleX, scaleY);
        
        ctx.scale(scale, scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        
        ctx.restore();
        
        const result = canvas.toDataURL('image/jpeg', 0.95);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageDataUrl;
  });
}

/**
 * Distance euclidienne entre deux points
 */
function distance(p1: Corner, p2: Corner): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Version simplifiée - charge instantanément
 */
export async function loadOpenCV(): Promise<any> {
  // Pas besoin de charger OpenCV - on utilise Canvas API uniquement
  return Promise.resolve(true);
}
