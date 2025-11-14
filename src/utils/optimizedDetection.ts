/**
 * 🎯 DÉTECTION ET RECADRAGE OPTIMISÉ DE DOCUMENTS
 * Algorithmes avancés pour détection précise et correction perspective
 */

export interface Corner {
  x: number;
  y: number;
}

/**
 * Charge OpenCV.js depuis CDN
 */
export function loadOpenCV(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).cv) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    
    script.onload = () => {
      const checkOpenCV = setInterval(() => {
        if ((window as any).cv && (window as any).cv.Mat) {
          clearInterval(checkOpenCV);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkOpenCV);
        reject(new Error('OpenCV loading timeout'));
      }, 30000);
    };

    script.onerror = () => reject(new Error('Failed to load OpenCV'));
    document.head.appendChild(script);
  });
}

/**
 * 🔍 Détecte automatiquement les coins d'un document avec OpenCV
 * Algorithme optimisé pour précision maximale
 */
export async function detectDocumentCorners(imageDataUrl: string): Promise<Corner[]> {
  try {
    const cv = (window as any).cv;
    if (!cv) {
      return getDefaultCorners(await getImageDimensions(imageDataUrl));
    }

    const img = await loadImage(imageDataUrl);
    const src = cv.imread(img);
    
    // Traitement optimisé pour détection
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const edges = new cv.Mat();
    const hierarchy = new cv.Mat();
    const contours = new cv.MatVector();

    try {
      // Conversion en niveaux de gris
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

      // Amélioration du contraste avec CLAHE
      const clahe = cv.createCLAHE(2.0, new cv.Size(8, 8));
      clahe.apply(gray, gray);
      clahe.delete();

      // Flou gaussien pour réduire le bruit
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

      // Détection de contours Canny avec seuils optimisés (plus sensible)
      cv.Canny(blurred, edges, 30, 120);

      // Dilatation pour connecter les contours brisés
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));
      cv.dilate(edges, edges, kernel);
      cv.erode(edges, edges, kernel); // Fermeture morphologique
      kernel.delete();

      // Trouver les contours
      cv.findContours(
        edges,
        contours,
        hierarchy,
        cv.RETR_EXTERNAL,
        cv.CHAIN_APPROX_SIMPLE
      );

      // Trouver le meilleur contour (plus grande aire)
      let bestContour = null;
      let maxArea = src.rows * src.cols * 0.1; // Minimum 10% de l'image

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const area = cv.contourArea(contour);
        
        if (area > maxArea) {
          const peri = cv.arcLength(contour, true);
          const approx = new cv.Mat();
          
          // Approximation plus flexible pour détecter les documents légèrement déformés
          cv.approxPolyDP(contour, approx, 0.015 * peri, true);

          // Recherche d'un quadrilatère (4 côtés) ou polygone proche
          if (approx.rows === 4) {
            maxArea = area;
            if (bestContour) bestContour.delete();
            bestContour = approx;
          } else if (approx.rows > 4 && approx.rows <= 8) {
            // Réessayer avec approximation plus stricte pour simplifier
            const approx2 = new cv.Mat();
            cv.approxPolyDP(contour, approx2, 0.03 * peri, true);
            if (approx2.rows === 4) {
              maxArea = area;
              if (bestContour) bestContour.delete();
              bestContour = approx2;
            } else {
              approx2.delete();
            }
            approx.delete();
          } else {
            approx.delete();
          }
        }
      }

      if (bestContour) {
        // Extraire les 4 coins
        const corners: Corner[] = [];
        for (let i = 0; i < 4; i++) {
          corners.push({
            x: bestContour.data32S[i * 2],
            y: bestContour.data32S[i * 2 + 1]
          });
        }
        bestContour.delete();

        // Ordonner les coins (top-left, top-right, bottom-right, bottom-left)
        const orderedCorners = orderCorners(corners);
        
        return orderedCorners;
      }

      // Si aucun contour valide, retourner les coins par défaut
      return getDefaultCorners({ width: src.cols, height: src.rows });

    } finally {
      // Nettoyage mémoire
      src.delete();
      gray.delete();
      blurred.delete();
      edges.delete();
      hierarchy.delete();
      contours.delete();
    }

  } catch (error) {
    console.error('Erreur détection OpenCV:', error);
    return getDefaultCorners(await getImageDimensions(imageDataUrl));
  }
}

/**
 * ✂️ Recadre et corrige la perspective d'un document
 */
export async function cropAndCorrectPerspective(
  imageDataUrl: string,
  corners: Corner[]
): Promise<string> {
  try {
    const cv = (window as any).cv;
    if (!cv || corners.length !== 4) {
      return imageDataUrl;
    }

    const img = await loadImage(imageDataUrl);
    const src = cv.imread(img);

    // Calculer les dimensions du document final
    const orderedCorners = orderCorners(corners);
    const width = Math.max(
      distance(orderedCorners[0], orderedCorners[1]),
      distance(orderedCorners[2], orderedCorners[3])
    );
    const height = Math.max(
      distance(orderedCorners[0], orderedCorners[3]),
      distance(orderedCorners[1], orderedCorners[2])
    );

    // Créer les matrices de transformation
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      orderedCorners[0].x, orderedCorners[0].y,
      orderedCorners[1].x, orderedCorners[1].y,
      orderedCorners[2].x, orderedCorners[2].y,
      orderedCorners[3].x, orderedCorners[3].y
    ]);

    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0,
      width, 0,
      width, height,
      0, height
    ]);

    // Calculer la matrice de perspective
    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    const dst = new cv.Mat();

    // Appliquer la transformation
    cv.warpPerspective(
      src,
      dst,
      M,
      new cv.Size(width, height),
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar(255, 255, 255, 255)
    );

    // Convertir en dataURL
    const canvas = document.createElement('canvas');
    cv.imshow(canvas, dst);
    const result = canvas.toDataURL('image/jpeg', 0.98);

    // Nettoyage
    src.delete();
    dst.delete();
    M.delete();
    srcTri.delete();
    dstTri.delete();

    return result;

  } catch (error) {
    console.error('Erreur correction perspective:', error);
    return imageDataUrl;
  }
}

// ===== FONCTIONS UTILITAIRES =====

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function getDefaultCorners(dims: { width: number; height: number }): Corner[] {
  const margin = Math.min(dims.width, dims.height) * 0.05;
  return [
    { x: margin, y: margin },
    { x: dims.width - margin, y: margin },
    { x: dims.width - margin, y: dims.height - margin },
    { x: margin, y: dims.height - margin }
  ];
}

/**
 * Ordonne les coins dans le sens: top-left, top-right, bottom-right, bottom-left
 */
function orderCorners(corners: Corner[]): Corner[] {
  // Calculer le centre
  const centerX = corners.reduce((sum, c) => sum + c.x, 0) / 4;
  const centerY = corners.reduce((sum, c) => sum + c.y, 0) / 4;

  // Trier par angle depuis le centre
  const sorted = corners.slice().sort((a, b) => {
    const angleA = Math.atan2(a.y - centerY, a.x - centerX);
    const angleB = Math.atan2(b.y - centerY, b.x - centerX);
    return angleA - angleB;
  });

  // Identifier top-left (coin avec plus petite somme x+y)
  const topLeftIdx = sorted.reduce((minIdx, corner, idx) => {
    const sum = corner.x + corner.y;
    const minSum = sorted[minIdx].x + sorted[minIdx].y;
    return sum < minSum ? idx : minIdx;
  }, 0);

  // Réorganiser pour commencer par top-left
  const ordered = [
    ...sorted.slice(topLeftIdx),
    ...sorted.slice(0, topLeftIdx)
  ];

  return ordered;
}

function distance(p1: Corner, p2: Corner): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}
