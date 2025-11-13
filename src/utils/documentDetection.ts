/**
 * Détection automatique de documents avec OpenCV.js (web)
 * - Détection des bords
 * - Recadrage automatique
 * - Correction de perspective
 * - Identique au mobile
 */

interface Corner {
  x: number;
  y: number;
}

/**
 * Charge OpenCV.js dynamiquement
 */
let cvLoaded = false;
let cvLoadPromise: Promise<any> | null = null;

export async function loadOpenCV(): Promise<any> {
  if (cvLoaded && (window as any).cv) {
    return (window as any).cv;
  }

  if (cvLoadPromise) {
    return cvLoadPromise;
  }

  cvLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    
    script.onload = () => {
      // Attendre que OpenCV soit vraiment chargé
      const checkCV = setInterval(() => {
        if ((window as any).cv && (window as any).cv.Mat) {
          clearInterval(checkCV);
          cvLoaded = true;
          resolve((window as any).cv);
        }
      }, 100);

      // Timeout après 10 secondes
      setTimeout(() => {
        clearInterval(checkCV);
        if (!cvLoaded) {
          reject(new Error('OpenCV timeout'));
        }
      }, 10000);
    };

    script.onerror = () => reject(new Error('Failed to load OpenCV'));
    
    document.head.appendChild(script);
  });

  return cvLoadPromise;
}

/**
 * Détecte automatiquement les 4 coins d'un document dans une image
 */
export async function detectDocumentCorners(imageDataUrl: string): Promise<Corner[]> {
  try {
    const cv = await loadOpenCV();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Créer un canvas temporaire
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0);
          
          // Convertir en Mat OpenCV
          const src = cv.imread(canvas);
          const gray = new cv.Mat();
          const blurred = new cv.Mat();
          const edges = new cv.Mat();
          const contours = new cv.MatVector();
          const hierarchy = new cv.Mat();

          // Conversion en niveaux de gris
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

          // Flou gaussien pour réduire le bruit
          cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

          // Détection des contours avec Canny
          cv.Canny(blurred, edges, 50, 150);

          // Dilatation pour connecter les contours
          const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
          cv.dilate(edges, edges, kernel);

          // Trouver les contours
          cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

          // Trouver le plus grand contour rectangulaire
          let maxArea = 0;
          let bestContour = null;

          for (let i = 0; i < contours.size(); i++) {
            const contour = contours.get(i);
            const area = cv.contourArea(contour);
            
            // Filtrer les petits contours (< 10% de l'image)
            if (area < (img.width * img.height * 0.1)) {
              continue;
            }

            // Approximation polygonale
            const peri = cv.arcLength(contour, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(contour, approx, 0.02 * peri, true);

            // Si c'est un quadrilatère et plus grand que le précédent
            if (approx.rows === 4 && area > maxArea) {
              maxArea = area;
              bestContour = approx;
            }
          }

          let corners: Corner[];

          if (bestContour) {
            // Extraire les 4 coins
            corners = [
              { x: bestContour.data32S[0], y: bestContour.data32S[1] },
              { x: bestContour.data32S[2], y: bestContour.data32S[3] },
              { x: bestContour.data32S[4], y: bestContour.data32S[5] },
              { x: bestContour.data32S[6], y: bestContour.data32S[7] },
            ];

            // Ordonner les coins (haut-gauche, haut-droit, bas-droit, bas-gauche)
            corners = orderCorners(corners);
          } else {
            // Aucun document détecté, utiliser les bords de l'image avec marge
            const margin = 0.05;
            corners = [
              { x: img.width * margin, y: img.height * margin },
              { x: img.width * (1 - margin), y: img.height * margin },
              { x: img.width * (1 - margin), y: img.height * (1 - margin) },
              { x: img.width * margin, y: img.height * (1 - margin) },
            ];
          }

          // Libérer la mémoire
          src.delete();
          gray.delete();
          blurred.delete();
          edges.delete();
          contours.delete();
          hierarchy.delete();
          kernel.delete();
          if (bestContour) bestContour.delete();

          resolve(corners);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageDataUrl;
    });
  } catch (error) {
    console.error('Erreur détection OpenCV:', error);
    // Fallback: retourner les coins de l'image
    return getFallbackCorners();
  }
}

/**
 * Ordonner les coins dans le sens: haut-gauche, haut-droit, bas-droit, bas-gauche
 */
function orderCorners(corners: Corner[]): Corner[] {
  // Trier par somme (x + y) pour trouver haut-gauche et bas-droit
  const sorted = [...corners].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  
  const topLeft = sorted[0];
  const bottomRight = sorted[3];
  
  // Trier par différence (x - y) pour trouver haut-droit et bas-gauche
  const remaining = [sorted[1], sorted[2]].sort((a, b) => (a.x - a.y) - (b.x - b.y));
  
  return [topLeft, remaining[1], bottomRight, remaining[0]];
}

/**
 * Recadrage et correction de perspective
 */
export async function cropAndCorrectPerspective(
  imageDataUrl: string,
  corners: Corner[]
): Promise<string> {
  try {
    const cv = await loadOpenCV();
    
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
          
          const src = cv.imread(canvas);
          
          // Calculer les dimensions du document
          const widthTop = distance(corners[0], corners[1]);
          const widthBottom = distance(corners[3], corners[2]);
          const heightLeft = distance(corners[0], corners[3]);
          const heightRight = distance(corners[1], corners[2]);
          
          const maxWidth = Math.max(widthTop, widthBottom);
          const maxHeight = Math.max(heightLeft, heightRight);
          
          // Points source (coins détectés)
          const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            corners[0].x, corners[0].y,
            corners[1].x, corners[1].y,
            corners[2].x, corners[2].y,
            corners[3].x, corners[3].y,
          ]);
          
          // Points destination (rectangle)
          const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0,
            maxWidth, 0,
            maxWidth, maxHeight,
            0, maxHeight,
          ]);
          
          // Calculer la matrice de transformation
          const M = cv.getPerspectiveTransform(srcPoints, dstPoints);
          
          // Appliquer la transformation
          const dst = new cv.Mat();
          cv.warpPerspective(src, dst, M, new cv.Size(maxWidth, maxHeight));
          
          // Convertir en canvas
          const outputCanvas = document.createElement('canvas');
          cv.imshow(outputCanvas, dst);
          
          const result = outputCanvas.toDataURL('image/jpeg', 0.95);
          
          // Libérer la mémoire
          src.delete();
          srcPoints.delete();
          dstPoints.delete();
          M.delete();
          dst.delete();
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageDataUrl;
    });
  } catch (error) {
    console.error('Erreur correction perspective:', error);
    // Fallback: retourner l'image originale
    return imageDataUrl;
  }
}

/**
 * Distance euclidienne entre deux points
 */
function distance(p1: Corner, p2: Corner): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Coins par défaut si détection échoue
 */
function getFallbackCorners(): Corner[] {
  return [
    { x: 0, y: 0 },
    { x: 1000, y: 0 },
    { x: 1000, y: 1000 },
    { x: 0, y: 1000 },
  ];
}
