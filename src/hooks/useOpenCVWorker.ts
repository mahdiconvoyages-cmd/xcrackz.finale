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

// Singleton pour éviter les instances multiples du worker
let sharedWorker: Worker | null = null;
let sharedWorkerReady = false;
let sharedWorkerRefCount = 0;
const sharedPendingRequests = new Map<number, (result: any) => void>();
let messageIdCounter = 0;
const readyListeners: Array<() => void> = [];

function getOrCreateWorker(): Worker {
  if (!sharedWorker) {
    sharedWorker = new Worker('/opencv-worker.js');
    
    sharedWorker.onmessage = (e) => {
      const { type, id, corners, imageData, message } = e.data;

      if (type === 'ready') {
        sharedWorkerReady = true;
        console.log('OpenCV worker ready (shared)');
        // Notifier tous les listeners
        readyListeners.forEach(cb => cb());
        readyListeners.length = 0;
      } else if (type === 'error') {
        console.error('Worker error:', message);
      } else if (type === 'detected') {
        const callback = sharedPendingRequests.get(id);
        if (callback) {
          callback(corners);
          sharedPendingRequests.delete(id);
        }
      } else if (type === 'cropped') {
        const callback = sharedPendingRequests.get(id);
        if (callback) {
          callback(imageData);
          sharedPendingRequests.delete(id);
        }
      }
    };

    sharedWorker.onerror = (error) => {
      console.error('Worker error:', error);
    };
  }
  return sharedWorker;
}

export const useOpenCVWorker = (): UseOpenCVWorkerReturn => {
  const [isReady, setIsReady] = useState(sharedWorkerReady);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sharedWorkerRefCount++;
    const worker = getOrCreateWorker();

    // Si déjà prêt, mettre à jour l'état
    if (sharedWorkerReady) {
      setIsReady(true);
    } else {
      // Sinon, attendre
      const onReady = () => setIsReady(true);
      readyListeners.push(onReady);
      
      // Timeout si OpenCV ne charge pas en 30 secondes
      readyTimeoutRef.current = setTimeout(() => {
        if (!sharedWorkerReady) {
          console.error('OpenCV worker timeout - failed to load in 30 seconds');
        }
      }, 30000);
    }

    return () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
      }
      
      sharedWorkerRefCount--;
      
      // Ne terminer le worker que si plus personne ne l'utilise
      if (sharedWorkerRefCount === 0 && sharedWorker) {
        sharedWorker.terminate();
        sharedWorker = null;
        sharedWorkerReady = false;
      }
    };
  }, []);

  const detectDocument = useCallback(
    (imageData: ImageData): Promise<Point[] | null> => {
      return new Promise((resolve) => {
        if (!sharedWorker || !sharedWorkerReady) {
          resolve(null);
          return;
        }

        const id = messageIdCounter++;
        sharedPendingRequests.set(id, resolve);

        // Timeout de sécurité
        setTimeout(() => {
          if (sharedPendingRequests.has(id)) {
            sharedPendingRequests.delete(id);
            resolve(null);
          }
        }, 1000);

        sharedWorker.postMessage({ type: 'detect', imageData, id });
      });
    },
    [isReady]
  );

  const cropDocument = useCallback(
    (imageData: ImageData, corners: Point[]): Promise<ImageData | null> => {
      return new Promise((resolve) => {
        if (!sharedWorker || !sharedWorkerReady) {
          resolve(null);
          return;
        }

        const id = messageIdCounter++;
        sharedPendingRequests.set(id, resolve);

        // Timeout de sécurité
        setTimeout(() => {
          if (sharedPendingRequests.has(id)) {
            sharedPendingRequests.delete(id);
            resolve(null);
          }
        }, 2000);

        sharedWorker.postMessage({ type: 'crop', imageData, corners, id });
      });
    },
    [isReady]
  );

  const terminateWorker = useCallback(() => {
    // Ne rien faire - le worker partagé sera terminé automatiquement
    // quand tous les composants seront démontés
  }, []);

  return {
    isReady,
    detectDocument,
    cropDocument,
    terminateWorker,
  };
};
