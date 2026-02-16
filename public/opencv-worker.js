// Web Worker pour la détection de documents avec OpenCV
let cv = null;
let isOpenCvLoaded = false;
let isLoading = false;
let loadAttempted = false; // Empêcher les tentatives multiples

// URLs alternatives pour OpenCV.js (de la plus rapide à la plus lente)
const OPENCV_URLS = [
  'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.8.0-release.1/opencv.js',
  'https://docs.opencv.org/4.8.0/opencv.js'
];

let currentUrlIndex = 0;

// Charger OpenCV.js avec retry sur différents CDN
function loadOpenCV() {
  // Éviter double chargement qui cause l'erreur "Cannot register public name twice"
  if (isLoading || isOpenCvLoaded || loadAttempted) {
    if (isOpenCvLoaded) {
      self.postMessage({ type: 'ready' });
    }
    return;
  }
  
  isLoading = true;
  loadAttempted = true;

  const tryLoadFromUrl = (urlIndex) => {
    if (urlIndex >= OPENCV_URLS.length) {
      isLoading = false;
      self.postMessage({ 
        type: 'error', 
        message: 'Failed to load OpenCV from all CDN sources' 
      });
      return;
    }

    const url = OPENCV_URLS[urlIndex];
    console.log(`Attempting to load OpenCV from: ${url}`);

    try {
      // Vérifier si cv est déjà défini (double chargement)
      if (typeof cv !== 'undefined' && cv.getBuildInformation) {
        isOpenCvLoaded = true;
        isLoading = false;
        self.postMessage({ type: 'ready' });
        console.log('OpenCV already loaded');
        return;
      }
      
      // Charger le script OpenCV.js
      importScripts(url);
      
      // Attendre que cv soit initialisé
      const checkInterval = setInterval(() => {
        if (typeof cv !== 'undefined' && cv.getBuildInformation) {
          clearInterval(checkInterval);
          isOpenCvLoaded = true;
          isLoading = false;
          self.postMessage({ type: 'ready' });
          console.log('OpenCV.js loaded successfully from: ' + url);
        }
      }, 100);

      // Timeout de 20 secondes par CDN
      setTimeout(() => {
        if (!isOpenCvLoaded) {
          clearInterval(checkInterval);
          console.warn(`Timeout loading from ${url}, trying next CDN...`);
          isLoading = false;
          tryLoadFromUrl(urlIndex + 1);
        }
      }, 20000);
    } catch (error) {
      // Si l'erreur est "Cannot register", OpenCV est déjà chargé
      if (error.message && error.message.includes('Cannot register')) {
        console.log('OpenCV already registered, using existing instance');
        isOpenCvLoaded = true;
        isLoading = false;
        self.postMessage({ type: 'ready' });
        return;
      }
      console.error(`Failed to load from ${url}:`, error);
      isLoading = false;
      tryLoadFromUrl(urlIndex + 1);
    }
  };

  tryLoadFromUrl(0);
}

// Démarrer le chargement immédiatement
loadOpenCV();

// Détection des coins du document
function detectDocumentCorners(imageData) {
  if (!isOpenCvLoaded) return null;

  try {
    const src = cv.matFromImageData(imageData);
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
    let biggestContour = null;

    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour, false);
      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.03 * peri, true);

      if (approx.rows === 4 && area > maxArea && area > 500) {
        maxArea = area;
        if (biggestContour) biggestContour.delete();
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
      const points = [];
      for (let i = 0; i < biggestContour.rows; i++) {
        points.push({
          x: biggestContour.data32S[i * 2],
          y: biggestContour.data32S[i * 2 + 1],
        });
      }
      biggestContour.delete();

      // Trier les points
      points.sort((a, b) => a.y - b.y);
      const [pt1, pt2, pt3, pt4] = points;
      const topPoints = [pt1, pt2].sort((a, b) => a.x - b.x);
      const bottomPoints = [pt3, pt4].sort((a, b) => a.x - b.x);

      return [topPoints[0], topPoints[1], bottomPoints[1], bottomPoints[0]];
    }

    return null;
  } catch (error) {
    console.error('Erreur détection:', error);
    return null;
  }
}

// Recadrage et correction de perspective
function cropAndCorrectPerspective(imageData, corners) {
  if (!isOpenCvLoaded) return null;

  try {
    const src = cv.matFromImageData(imageData);
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
      tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y,
    ]);
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0, 0, maxWidth - 1, 0, maxWidth - 1, maxHeight - 1, 0, maxHeight - 1,
    ]);

    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    // Convertir en ImageData
    const resultImageData = new ImageData(
      new Uint8ClampedArray(dst.data),
      dst.cols,
      dst.rows
    );

    src.delete();
    dst.delete();
    M.delete();
    srcTri.delete();
    dstTri.delete();

    return resultImageData;
  } catch (error) {
    console.error('Erreur recadrage:', error);
    return null;
  }
}

// Écouter les messages du thread principal
self.onmessage = function(e) {
  const { type, imageData, corners, id } = e.data;

  if (type === 'detect') {
    const detectedCorners = detectDocumentCorners(imageData);
    self.postMessage({ type: 'detected', corners: detectedCorners, id });
  } else if (type === 'crop') {
    const croppedImageData = cropAndCorrectPerspective(imageData, corners);
    self.postMessage({ type: 'cropped', imageData: croppedImageData, id });
  }
};
