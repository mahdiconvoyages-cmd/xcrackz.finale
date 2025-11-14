import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export interface Point {
  x: number;
  y: number;
}

export interface DetectionResult {
  corners: Point[] | null;
  confidence: number;
  areaRatio: number;
}

interface CornerDetection {
  corners: Point[];
  areaRatio: number;
}

let isInitialized = false;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const initializeTensorFlow = async (): Promise<void> => {
  if (isInitialized) return;

  await tf.setBackend('webgl');
  await tf.ready();
  tf.env().set('WEBGL_PACK', true);
  tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
  isInitialized = true;
  console.log('TensorFlow.js initialisé avec backend:', tf.getBackend());
};

const preprocessImage = (canvas: HTMLCanvasElement): tf.Tensor3D => {
  return tf.tidy(() => {
    const tensor = tf.browser.fromPixels(canvas);
    const resized = tf.image.resizeBilinear(tensor, [320, 320], true);
    const normalized = resized.div(255);
    return normalized as tf.Tensor3D;
  });
};

const detectEdges = (imageTensor: tf.Tensor3D): tf.Tensor2D => {
  return tf.tidy(() => {
    const r = imageTensor.slice([0, 0, 0], [-1, -1, 1]);
    const g = imageTensor.slice([0, 0, 1], [-1, -1, 1]);
    const b = imageTensor.slice([0, 0, 2], [-1, -1, 1]);
    const grayscale = r.mul(0.299).add(g.mul(0.587)).add(b.mul(0.114)).squeeze();

    const blurred = tf.tidy(() => {
      const gaussianKernel = tf.tensor2d([
        [1 / 16, 2 / 16, 1 / 16],
        [2 / 16, 4 / 16, 2 / 16],
        [1 / 16, 2 / 16, 1 / 16],
      ]);
      const kernelReshaped = gaussianKernel.expandDims(2).expandDims(3);
      const imageReshaped = grayscale.expandDims(0).expandDims(-1);
      return tf.conv2d(imageReshaped as any, kernelReshaped as any, 1, 'same').squeeze();
    });

    const sobelX = tf.tensor2d([
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ]);
    const sobelY = tf.tensor2d([
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ]);

    const kernel = blurred.expandDims(0).expandDims(-1);
    const filterX = sobelX.expandDims(2).expandDims(3);
    const filterY = sobelY.expandDims(2).expandDims(3);

    const edgesX = tf.conv2d(kernel as any, filterX as any, 1, 'same');
    const edgesY = tf.conv2d(kernel as any, filterY as any, 1, 'same');

    const magnitude = tf.sqrt(edgesX.square().add(edgesY.square())).squeeze();
    const maxVal = magnitude.max();
    const normalized = magnitude.div(maxVal.add(1e-4));
    return normalized as tf.Tensor2D;
  });
};

const computeConvexHull = (points: Point[]): Point[] => {
  if (points.length <= 3) return points;
  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
};

const orderCorners = (corners: Point[]): Point[] => {
  const sorted = [...corners].sort((a, b) => a.y - b.y);
  const [top1, top2, bottom1, bottom2] = sorted;
  const topLeft = top1.x < top2.x ? top1 : top2;
  const topRight = top1.x < top2.x ? top2 : top1;
  const bottomLeft = bottom1.x < bottom2.x ? bottom1 : bottom2;
  const bottomRight = bottom1.x < bottom2.x ? bottom2 : bottom1;
  return [topLeft, topRight, bottomRight, bottomLeft];
};

const selectRectangleCorners = (
  hull: Point[],
  scaleX: number,
  scaleY: number,
  originalWidth: number,
  originalHeight: number
): CornerDetection | null => {
  if (hull.length < 4) return null;

  let topLeft = hull[0];
  let topRight = hull[0];
  let bottomRight = hull[0];
  let bottomLeft = hull[0];

  for (const point of hull) {
    const sum = point.x + point.y;
    const diff = point.x - point.y;
    if (sum < topLeft.x + topLeft.y) topLeft = point;
    if (diff > topRight.x - topRight.y) topRight = point;
    if (sum > bottomRight.x + bottomRight.y) bottomRight = point;
    if (diff < bottomLeft.x - bottomLeft.y) bottomLeft = point;
  }

  const scaled: Point[] = orderCorners([
    { x: topLeft.x * scaleX, y: topLeft.y * scaleY },
    { x: topRight.x * scaleX, y: topRight.y * scaleY },
    { x: bottomRight.x * scaleX, y: bottomRight.y * scaleY },
    { x: bottomLeft.x * scaleX, y: bottomLeft.y * scaleY },
  ]);

  const area = calculatePolygonArea(scaled);
  const areaRatio = area / (originalWidth * originalHeight);

  if (areaRatio < 0.1 || areaRatio > 0.95) return null;

  const [tl, tr, br, bl] = scaled;
  const topLength = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const bottomLength = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftLength = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightLength = Math.hypot(br.x - tr.x, br.y - tr.y);

  const horizontalRatio = Math.min(topLength, bottomLength) / Math.max(topLength, bottomLength);
  const verticalRatio = Math.min(leftLength, rightLength) / Math.max(leftLength, rightLength);

  if (horizontalRatio < 0.5 || verticalRatio < 0.5) return null;

  return { corners: scaled, areaRatio };
};

const findDocumentCorners = async (
  edgeTensor: tf.Tensor2D,
  originalWidth: number,
  originalHeight: number
): Promise<CornerDetection | null> => {
  const flatTensor = edgeTensor.flatten();
  const values = await flatTensor.data();
  const sorted = Array.from(values).sort((a, b) => a - b);
  const percentile = sorted[Math.floor(sorted.length * 0.7)];
  const thresholdValue = Math.max(percentile, 0.2);
  flatTensor.dispose();

  const threshold = tf.scalar(thresholdValue);
  const binary = edgeTensor.greater(threshold);

  const binaryData = binary.dataSync();
  const height = binary.shape[0];
  const width = binary.shape[1];
  threshold.dispose();
  binary.dispose();

  const edgePoints: Point[] = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 120));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (binaryData[y * width + x]) {
        edgePoints.push({ x, y });
      }
    }
  }

  if (edgePoints.length < 80) return null;

  const hull = computeConvexHull(edgePoints);
  if (hull.length < 4) return null;

  const scaleX = originalWidth / width;
  const scaleY = originalHeight / height;
  return selectRectangleCorners(hull, scaleX, scaleY, originalWidth, originalHeight);
};

const calculatePolygonArea = (points: Point[]): number => {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area / 2);
};

export const detectDocument = async (canvas: HTMLCanvasElement): Promise<DetectionResult> => {
  if (!isInitialized) {
    await initializeTensorFlow();
  }

  const imageTensor = preprocessImage(canvas);
  const edgeTensor = detectEdges(imageTensor);

  try {
    const cornerResult = await findDocumentCorners(edgeTensor, canvas.width, canvas.height);
    const edgeStrength = await edgeTensor.mean().data();
    const gradientScore = clamp(edgeStrength[0] * 3, 0, 1);

    if (!cornerResult) {
      return { corners: null, confidence: gradientScore * 0.3, areaRatio: 0 };
    }

    const areaScore = clamp((cornerResult.areaRatio - 0.12) / 0.7, 0, 1);
    const confidence = clamp(0.6 * areaScore + 0.4 * gradientScore, 0, 1);

    return {
      corners: cornerResult.corners,
      confidence,
      areaRatio: cornerResult.areaRatio,
    };
  } finally {
    imageTensor.dispose();
    edgeTensor.dispose();
  }
};

const solveLinearSystem = (A: number[][], b: number[]): number[] => {
  const n = A.length;
  const augmented = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    let pivotRow = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(augmented[j][i]) > Math.abs(augmented[pivotRow][i])) {
        pivotRow = j;
      }
    }

    if (Math.abs(augmented[pivotRow][i]) < 1e-8) continue;
    [augmented[i], augmented[pivotRow]] = [augmented[pivotRow], augmented[i]];

    const pivot = augmented[i][i];
    for (let k = i; k <= n; k++) {
      augmented[i][k] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = augmented[r][i];
      for (let c = i; c <= n; c++) {
        augmented[r][c] -= factor * augmented[i][c];
      }
    }
  }

  return augmented.map((row) => row[n]);
};

const getPerspectiveTransformMatrix = (src: Point[], dst: Point[]): number[][] => {
  const A: number[][] = [];
  const B: number[] = [];

  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const X = dst[i].x;
    const Y = dst[i].y;

    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    B.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    B.push(Y);
  }

  const h = solveLinearSystem(A, B);
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
};

const invertMatrix3x3 = (m: number[][]): number[][] => {
  const det =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

  if (Math.abs(det) < 1e-8) {
    return [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
  }

  const invDet = 1 / det;
  return [
    [
      invDet * (m[1][1] * m[2][2] - m[1][2] * m[2][1]),
      invDet * (m[0][2] * m[2][1] - m[0][1] * m[2][2]),
      invDet * (m[0][1] * m[1][2] - m[0][2] * m[1][1]),
    ],
    [
      invDet * (m[1][2] * m[2][0] - m[1][0] * m[2][2]),
      invDet * (m[0][0] * m[2][2] - m[0][2] * m[2][0]),
      invDet * (m[0][2] * m[1][0] - m[0][0] * m[1][2]),
    ],
    [
      invDet * (m[1][0] * m[2][1] - m[1][1] * m[2][0]),
      invDet * (m[0][1] * m[2][0] - m[0][0] * m[2][1]),
      invDet * (m[0][0] * m[1][1] - m[0][1] * m[1][0]),
    ],
  ];
};

const matrixToTransformVector = (m: number[][]): Float32Array => {
  return new Float32Array([
    m[0][0],
    m[0][1],
    m[0][2],
    m[1][0],
    m[1][1],
    m[1][2],
    m[2][0],
    m[2][1],
  ]);
};

export const correctPerspective = async (canvas: HTMLCanvasElement, corners: Point[]): Promise<string> => {
  const [tl, tr, br, bl] = corners;
  const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
    const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);

    const targetWidth = Math.max(widthTop, widthBottom);
    const targetHeight = Math.max(heightLeft, heightRight);

    const dstPoints: Point[] = [
      { x: 0, y: 0 },
      { x: targetWidth, y: 0 },
      { x: targetWidth, y: targetHeight },
      { x: 0, y: targetHeight },
    ];

    const transformMatrix = getPerspectiveTransformMatrix([tl, tr, br, bl], dstPoints);
    const inverse = invertMatrix3x3(transformMatrix);
    const transformTensor = tf.tensor(matrixToTransformVector(inverse), [8]);

    const imageTensor = tf.browser.fromPixels(canvas);
    const output = tf.image.transform(imageTensor, transformTensor, 'bilinear', 'constant', 0, [
      Math.round(targetHeight),
      Math.round(targetWidth),
    ]);

    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(targetWidth);
    offscreen.height = Math.round(targetHeight);
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      imageTensor.dispose();
      transformTensor.dispose();
      output.dispose();
      throw new Error('Impossible de créer un contexte 2D pour la correction de perspective.');
    }

    const imageData = new ImageData(offscreen.width, offscreen.height);
    await tf.browser.toPixels(output as tf.Tensor3D, imageData.data);
    ctx.putImageData(imageData, 0, 0);

    imageTensor.dispose();
    transformTensor.dispose();
    output.dispose();

    return offscreen.toDataURL('image/jpeg', 0.92);
  };
```}