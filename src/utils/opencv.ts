// src/utils/opencv.ts
// Déclaration globale pour OpenCV chargé via script
declare const cv: any;

// Types pour OpenCV
interface Point {
  x: number;
  y: number;
}

let isOpenCvLoaded = false;

// URLs CDN par ordre de préférence (jsDelivr est généralement plus rapide)
const OPENCV_URLS = [
  'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.8.0-release.1/opencv.js',
  'https://docs.opencv.org/4.8.0/opencv.js'
];

export const loadOpenCV = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isOpenCvLoaded) {
      resolve();
      return;
    }
    
    // Vérifier si OpenCV est déjà chargé
    if (typeof cv !== 'undefined' && cv.getBuildInformation) {
      isOpenCvLoaded = true;
      resolve();
      return;
    }

    const tryLoadFromUrl = (urlIndex: number) => {
      if (urlIndex >= OPENCV_URLS.length) {
        reject(new Error('Impossible de charger OpenCV depuis tous les CDN'));
        return;
      }

      const url = OPENCV_URLS[urlIndex];
      console.log(`Tentative de chargement d'OpenCV depuis: ${url}`);

      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // Attendre que cv soit disponible
        const checkCV = setInterval(() => {
          if (typeof cv !== 'undefined' && cv.getBuildInformation) {
            clearInterval(checkCV);
            console.log(`OpenCV.js chargé avec succès depuis ${url}`);
            isOpenCvLoaded = true;
            resolve();
          }
        }, 100);
        
        // Timeout de 15 secondes par CDN
        setTimeout(() => {
          clearInterval(checkCV);
          if (!isOpenCvLoaded) {
            console.warn(`Timeout sur ${url}, essai du CDN suivant...`);
            document.head.removeChild(script);
            tryLoadFromUrl(urlIndex + 1);
          }
        }, 15000);
      };

      script.onerror = () => {
        console.error(`Erreur de chargement depuis ${url}`);
        document.head.removeChild(script);
        tryLoadFromUrl(urlIndex + 1);
      };

      document.head.appendChild(script);
    };

    tryLoadFromUrl(0);
  });
};

export const detectDocumentCorners = (sourceElement: HTMLVideoElement | HTMLCanvasElement): Point[] | null => {
  if (!isOpenCvLoaded) return null;

  const src = cv.imread(sourceElement);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(9, 9), 0);

  const edged = new cv.Mat();
  cv.Canny(blurred, edged, 50, 150);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let biggestContour: any | null = null;

  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour, false);
    const peri = cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.03 * peri, true);

    if (approx.rows === 4 && area > maxArea && area > 500) {
      maxArea = area;
      biggestContour = approx.clone();
    }
    approx.delete();
  }

  src.delete();
  gray.delete();
  blurred.delete();
  edged.delete();
  contours.delete();
  hierarchy.delete();

  if (biggestContour) {
    const points: Point[] = [];
    for (let i = 0; i < biggestContour.rows; i++) {
      points.push({
        x: biggestContour.data32S[i * 2],
        y: biggestContour.data32S[i * 2 + 1],
      });
    }
    biggestContour.delete();

    // Trier les points: haut-gauche, haut-droit, bas-droit, bas-gauche
    points.sort((a, b) => a.y - b.y);
    const [pt1, pt2, pt3, pt4] = points;
    const topPoints = [pt1, pt2].sort((a, b) => a.x - b.x);
    const bottomPoints = [pt3, pt4].sort((a, b) => a.x - b.x);

    return [topPoints[0], topPoints[1], bottomPoints[1], bottomPoints[0]];
  }

  return null;
};

export const cropAndCorrectPerspective = (
  sourceElement: HTMLVideoElement | HTMLCanvasElement,
  corners: Point[]
): string => {
  const src = cv.imread(sourceElement);
  const [tl, tr, br, bl] = corners;

  const widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
  const widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
  const maxWidth = Math.max(widthA, widthB);

  const heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2));
  const heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2));
  const maxHeight = Math.max(heightA, heightB);

  const dst = new cv.Mat();
  const dsize = new cv.Size(maxWidth, maxHeight);
  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    tl.x,
    tl.y,
    tr.x,
    tr.y,
    br.x,
    br.y,
    bl.x,
    bl.y,
  ]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0,
    0,
    maxWidth - 1,
    0,
    maxWidth - 1,
    maxHeight - 1,
    0,
    maxHeight - 1,
  ]);

  const M = cv.getPerspectiveTransform(srcTri, dstTri);
  cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

  const outputCanvas = document.createElement('canvas');
  cv.imshow(outputCanvas, dst);

  src.delete();
  dst.delete();
  M.delete();
  srcTri.delete();
  dstTri.delete();

  return outputCanvas.toDataURL('image/jpeg', 0.9);
};
