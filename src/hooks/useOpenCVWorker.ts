import { useEffect, useRef, useState, useCallback } from 'react';

interface Point {
  x: number;
  y: number;
}

interface UseOpenCVWorkerReturn {
  isReady: boolean;
  detectDocument: (imageData: ImageData) => Promise<Point[] | null>;
  cropDocument: (imageData: ImageData, corners: Point[]) => Promise<ImageData | null>;
  terminateWorker: () => void;
}

export const useOpenCVWorker = (): UseOpenCVWorkerReturn => {
  const [isReady, setIsReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const messageIdRef = useRef(0);
  const pendingRequestsRef = useRef<Map<number, (result: any) => void>>(new Map());

  useEffect(() => {
    // Créer le worker
    const worker = new Worker('/opencv-worker.js');
    workerRef.current = worker;

    // Écouter les messages du worker
    worker.onmessage = (e) => {
      const { type, id, corners, imageData } = e.data;

      if (type === 'ready') {
        setIsReady(true);
      } else if (type === 'detected') {
        const callback = pendingRequestsRef.current.get(id);
        if (callback) {
          callback(corners);
          pendingRequestsRef.current.delete(id);
        }
      } else if (type === 'cropped') {
        const callback = pendingRequestsRef.current.get(id);
        if (callback) {
          callback(imageData);
          pendingRequestsRef.current.delete(id);
        }
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
    };

    return () => {
      worker.terminate();
    };
  }, []);

  const detectDocument = useCallback(
    (imageData: ImageData): Promise<Point[] | null> => {
      return new Promise((resolve) => {
        if (!workerRef.current || !isReady) {
          resolve(null);
          return;
        }

        const id = messageIdRef.current++;
        pendingRequestsRef.current.set(id, resolve);

        // Timeout de sécurité
        setTimeout(() => {
          if (pendingRequestsRef.current.has(id)) {
            pendingRequestsRef.current.delete(id);
            resolve(null);
          }
        }, 1000);

        workerRef.current.postMessage({ type: 'detect', imageData, id });
      });
    },
    [isReady]
  );

  const cropDocument = useCallback(
    (imageData: ImageData, corners: Point[]): Promise<ImageData | null> => {
      return new Promise((resolve) => {
        if (!workerRef.current || !isReady) {
          resolve(null);
          return;
        }

        const id = messageIdRef.current++;
        pendingRequestsRef.current.set(id, resolve);

        // Timeout de sécurité
        setTimeout(() => {
          if (pendingRequestsRef.current.has(id)) {
            pendingRequestsRef.current.delete(id);
            resolve(null);
          }
        }, 2000);

        workerRef.current.postMessage({ type: 'crop', imageData, corners, id });
      });
    },
    [isReady]
  );

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return {
    isReady,
    detectDocument,
    cropDocument,
    terminateWorker,
  };
};
