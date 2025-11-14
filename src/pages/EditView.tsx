import React, { useState, useMemo, useCallback } from 'react';
import { X, Check, RotateCw, Zap, Sun, Droplet, Palette } from 'lucide-react';
import { ScannedPage } from './ScannerPage';
import { applyFilter } from '../utils/imageFilters';

interface EditViewProps {
  page: ScannedPage;
  onComplete: (page: ScannedPage) => void;
  onCancel: () => void;
}

const FILTERS = [
  { id: 'magic', name: 'Magique', icon: Zap },
  { id: 'bw', name: 'N&B', icon: Sun },
  { id: 'grayscale', name: 'Gris', icon: Droplet },
  { id: 'color', name: 'Original', icon: Palette },
];

const EditView: React.FC<EditViewProps> = ({ page, onComplete, onCancel }) => {
  const [editedPage, setEditedPage] = useState<ScannedPage>(page);
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const applyAndSetFilter = useCallback(async (filterId: string) => {
    setIsProcessing(true);
    try {
      const newUri = await applyFilter(editedPage.originalUri, filterId);
      setEditedPage((p) => ({ ...p, processedUri: newUri, filterId }));
    } catch (error) {
      console.error('Erreur de filtre:', error);
      alert('Impossible d\'appliquer le filtre.');
    } finally {
      setIsProcessing(false);
    }
  }, [editedPage.originalUri]);

  // Appliquer le filtre initial
  useEffect(() => {
    if (page.filterId) {
      applyAndSetFilter(page.filterId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.originalUri, page.filterId]);


  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleDone = async () => {
    setIsProcessing(true);
    try {
      let finalUri = editedPage.processedUri;
      if (rotation !== 0) {
        finalUri = await rotateImage(finalUri, rotation);
      }
      onComplete({ ...editedPage, processedUri: finalUri });
    } catch (error) {
      console.error('Erreur de finalisation:', error);
      alert('Impossible de sauvegarder les modifications.');
      setIsProcessing(false);
    }
  };

  const rotateImage = (imageUri: string, angle: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageUri;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas context not available');

        if (angle === 90 || angle === 270) {
          canvas.width = image.height;
          canvas.height = image.width;
        } else {
          canvas.width = image.width;
          canvas.height = image.height;
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      image.onerror = reject;
    });
  };

  return (
    <div className="absolute inset-0 bg-gray-800 text-white flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-gray-900">
        <button onClick={onCancel} className="p-2">
          <X size={24} />
        </button>
        <h2 className="text-lg font-semibold">Édition</h2>
        <button
          onClick={handleDone}
          disabled={isProcessing}
          className="p-2 bg-teal-600 rounded-full text-white disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <Check size={24} />
          )}
        </button>
      </header>

      {/* Image Preview */}
      <main className="flex-grow flex items-center justify-center p-4 overflow-hidden">
        <div className="relative w-full h-full flex items-center justify-center">
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}
          <img
            key={editedPage.processedUri} // Re-render on change
            src={editedPage.processedUri}
            alt="Document scanné"
            className="max-w-full max-h-full object-contain"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900">
        {/* Filtres */}
        <div className="p-4 flex justify-around">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => applyAndSetFilter(filter.id)}
              className={`flex flex-col items-center space-y-1 p-2 rounded-lg ${
                editedPage.filterId === filter.id ? 'text-teal-400' : 'text-gray-400'
              }`}
            >
              <filter.icon size={24} />
              <span className="text-xs font-medium">{filter.name}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-700 flex justify-around">
          <button
            onClick={handleRotate}
            className="flex flex-col items-center space-y-1 text-gray-300 hover:text-white"
          >
            <RotateCw size={24} />
            <span className="text-xs">Pivoter</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default EditView;