// src/utils/opencv.ts
import cv from '@techstark/opencv-js';

let isOpenCvLoaded = false;

export const loadOpenCV = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isOpenCvLoaded) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // @ts-ignore
      if (cv.getBuildInformation) {
        console.log('OpenCV.js chargé avec succès.');
        isOpenCvLoaded = true;
        resolve();
      } else {
        reject(new Error('Erreur au chargement d\'OpenCV.js'));
      }
    };
    script.onerror = () => {
      reject(new Error('Impossible de charger le script OpenCV.js'));
    };
    document.body.appendChild(script);
  });
};

export const detectDocumentCorners = (videoElement: HTMLVideoElement): cv.Point[] | null => {
  if (!isOpenCvLoaded) return null;

  const src = new cv.Mat(videoElement.videoHeight, videoElement.videoWidth, cv.CV_8UC4);
  const cap = new cv.VideoCapture(videoElement);
  cap.read(src);

  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  const edged = new cv.Mat();
  cv.Canny(blurred, edged, 75, 200);

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edged, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let biggestContour: cv.Mat | null = null;

  for (let i = 0; i < contours.size(); ++i) {
    const contour = contours.get(i);
    const area = cv.contourArea(contour, false);
    const peri = cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.02 * peri, true);

    if (approx.rows === 4 && area > maxArea && area > 1000) {
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
    const points: cv.Point[] = [];
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
  videoElement: HTMLVideoElement,
  corners: cv.Point[]
): string => {
  const src = new cv.Mat(videoElement.videoHeight, videoElement.videoWidth, cv.CV_8UC4);
  const cap = new cv.VideoCapture(videoElement);
  cap.read(src);

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
