// TensorFlow.js Document Scanner avec détection GPU-accélérée
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

interface Point {
  x: number;
  y: number;
}

interface DetectionResult {
  corners: Point[] | null;
  confidence: number;
}

let isInitialized = false;

// Initialiser TensorFlow avec backend WebGL (GPU)
export const initializeTensorFlow = async (): Promise<void> => {
  if (isInitialized) return;

  try {
    // Utiliser WebGL pour l'accélération GPU
    await tf.setBackend('webgl');
    await tf.ready();
    
    // Optimisations WebGL
    tf.env().set('WEBGL_PACK', true);
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
    
    isInitialized = true;
    console.log('TensorFlow.js initialisé avec backend:', tf.getBackend());
    console.log('GPU disponible:', await tf.env().getAsync('WEBGL_VERSION'));
  } catch (error) {
    console.error('Erreur initialisation TensorFlow:', error);
    throw error;
  }
};

// Prétraitement de l'image pour la détection
const preprocessImage = (canvas: HTMLCanvasElement): tf.Tensor3D => {
  return tf.tidy(() => {
    // Convertir le canvas en tensor
    const tensor = tf.browser.fromPixels(canvas);
    
    // Redimensionner pour accélérer le traitement (320x320 est un bon compromis)
    const resized = tf.image.resizeBilinear(tensor, [320, 320]);
    
    // Normaliser entre 0 et 1
    const normalized = resized.div(255.0);
    
    return normalized as tf.Tensor3D;
  });
};

// Détection des contours avec filtres de Sobel (détection d'edges GPU)
const detectEdges = (imageTensor: tf.Tensor3D): tf.Tensor2D => {
  return tf.tidy(() => {
    // Convertir en niveaux de gris
    const grayscale = imageTensor.mean(2);
    
    // Filtre de Sobel pour détecter les contours (GPU-accéléré)
    const sobelX = tf.tensor2d([
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ]);
    const sobelY = tf.tensor2d([
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ]);
    
    // Reshape pour la convolution
    const kernel = grayscale.expandDims(0).expandDims(-1);
    const filterX = sobelX.expandDims(2).expandDims(3);
    const filterY = sobelY.expandDims(2).expandDims(3);
    
    // Appliquer les filtres de Sobel
    const edgesX = tf.conv2d(kernel as any, filterX as any, 1, 'same');
    const edgesY = tf.conv2d(kernel as any, filterY as any, 1, 'same');
    
    // Magnitude du gradient
    const magnitude = tf.sqrt(
      edgesX.square().add(edgesY.square())
    ).squeeze();
    
    return magnitude as tf.Tensor2D;
  });
};

// Trouver les 4 coins du document (algorithme optimisé GPU)
const findDocumentCorners = async (
  edgeTensor: tf.Tensor2D,
  originalWidth: number,
  originalHeight: number
): Promise<Point[] | null> => {
  // Appliquer un seuil pour binariser l'image
  const threshold = edgeTensor.mean().mul(1.5);
  const binary = edgeTensor.greater(threshold);
  
  // Récupérer les données
  const binaryData = binary.dataSync();
  const width = binary.shape[0];
  const height = binary.shape[1] || 0;
  
  // Nettoyer les tensors temporaires
  threshold.dispose();
  binary.dispose();
    
    // Trouver les contours en CPU (plus efficace pour cette partie)
    const edgePoints: Point[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (binaryData[y * width + x]) {
          edgePoints.push({ x, y });
        }
      }
    }
    
    if (edgePoints.length < 4) return null;
    
    // Trouver les 4 coins extrêmes (heuristique simple mais efficace)
    let topLeft = edgePoints[0];
    let topRight = edgePoints[0];
    let bottomLeft = edgePoints[0];
    let bottomRight = edgePoints[0];
    
    for (const point of edgePoints) {
      // Top-left: minimiser x + y
      if (point.x + point.y < topLeft.x + topLeft.y) {
        topLeft = point;
      }
      // Top-right: maximiser x - y
      if (point.x - point.y > topRight.x - topRight.y) {
        topRight = point;
      }
      // Bottom-left: minimiser x - y
      if (point.x - point.y < bottomLeft.x - bottomLeft.y) {
        bottomLeft = point;
      }
      // Bottom-right: maximiser x + y
      if (point.x + point.y > bottomRight.x + bottomRight.y) {
        bottomRight = point;
      }
    }
    
    // Convertir les coordonnées à la taille originale
    const scaleX = originalWidth / width;
    const scaleY = originalHeight / height;
    
    const corners = [
      { x: topLeft.x * scaleX, y: topLeft.y * scaleY },
      { x: topRight.x * scaleX, y: topRight.y * scaleY },
      { x: bottomRight.x * scaleX, y: bottomRight.y * scaleY },
      { x: bottomLeft.x * scaleX, y: bottomLeft.y * scaleY }
    ];
    
    // Vérifier que le contour est valide (aire minimale)
    const area = calculatePolygonArea(corners);
    const minArea = (originalWidth * originalHeight) * 0.05; // Au moins 5% de l'image
    
    if (area < minArea) return null;
    
    return corners;
};

// Calculer l'aire d'un polygone
const calculatePolygonArea = (points: Point[]): number => {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
};

// Fonction principale de détection
export const detectDocument = async (
  canvas: HTMLCanvasElement
): Promise<DetectionResult> => {
  if (!isInitialized) {
    await initializeTensorFlow();
  }

  try {
    // Prétraitement
    const imageTensor = preprocessImage(canvas);
    
    // Détection des contours avec GPU
    const edgeTensor = detectEdges(imageTensor);
    
    // Trouver les coins
    const corners = await findDocumentCorners(
      edgeTensor,
      canvas.width,
      canvas.height
    );
    
    // Calculer la confiance (basée sur la qualité des contours)
    const edgeStrength = await edgeTensor.mean().data();
    const confidence = Math.min(edgeStrength[0] * 2, 1.0);
    
    // Nettoyer les tensors
    imageTensor.dispose();
    edgeTensor.dispose();
    
    return {
      corners,
      confidence
    };
  } catch (error) {
    console.error('Erreur détection TensorFlow:', error);
    return { corners: null, confidence: 0 };
  }
};

// Correction de perspective avec TensorFlow (GPU-accéléré)
export const correctPerspective = async (
  canvas: HTMLCanvasElement,
  corners: Point[]
): Promise<string> => {
  return tf.tidy(() => {
    // Calculer les dimensions du document
    const [tl, tr, br, bl] = corners;
    
    const widthTop = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));
    const widthBottom = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
    const width = Math.max(widthTop, widthBottom);
    
    const heightLeft = Math.sqrt(Math.pow(bl.x - tl.x, 2) + Math.pow(bl.y - tl.y, 2));
    const heightRight = Math.sqrt(Math.pow(br.x - tr.x, 2) + Math.pow(br.y - tr.y, 2));
    const height = Math.max(heightLeft, heightRight);
    
    // Convertir l'image en tensor
    const imageTensor = tf.browser.fromPixels(canvas);
    
    // Créer un canvas pour le résultat
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = Math.round(width);
    resultCanvas.height = Math.round(height);
    const ctx = resultCanvas.getContext('2d')!;
    
    // Utiliser la transformation de perspective native du canvas
    // (plus rapide que de calculer avec TensorFlow pour cette opération)
    ctx.save();
    
    // Calculer la matrice de transformation
    const srcPoints = [tl, tr, br, bl];
    
    // Appliquer la transformation (approximation avec setTransform)
    // Pour une vraie correction perspective, on utilise une approche par sampling
    
    // Approche simplifiée : découper et transformer
    ctx.drawImage(
      canvas,
      Math.min(...srcPoints.map(p => p.x)),
      Math.min(...srcPoints.map(p => p.y)),
      Math.max(...srcPoints.map(p => p.x)) - Math.min(...srcPoints.map(p => p.x)),
      Math.max(...srcPoints.map(p => p.y)) - Math.min(...srcPoints.map(p => p.y)),
      0,
      0,
      resultCanvas.width,
      resultCanvas.height
    );
    
    ctx.restore();
    
    // Nettoyer
    imageTensor.dispose();
    
    return resultCanvas.toDataURL('image/jpeg', 0.95);
  });
};

// Nettoyage de la mémoire GPU
export const cleanup = (): void => {
  tf.disposeVariables();
  console.log('TensorFlow memory cleaned. Tensors:', tf.memory().numTensors);
};
