import { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

/**
 * Bouton flottant d'accessibilité pour ajuster le zoom sur mobile
 * Visible uniquement sur écrans < 1024px
 */
export default function AccessibilityZoom() {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Afficher uniquement sur mobile/tablette
    const checkMobile = () => {
      setIsVisible(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const adjustZoom = (direction: 'in' | 'out' | 'reset') => {
    let newZoom = zoomLevel;
    
    if (direction === 'in') {
      newZoom = Math.min(zoomLevel + 0.1, 2.0);
    } else if (direction === 'out') {
      newZoom = Math.max(zoomLevel - 0.1, 0.5);
    } else {
      newZoom = 1;
    }
    
    setZoomLevel(newZoom);
    document.body.style.zoom = `${newZoom}`;
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 bg-white rounded-2xl shadow-2xl p-2 border-2 border-teal-200">
      <button
        onClick={() => adjustZoom('in')}
        className="w-12 h-12 bg-teal-500 hover:bg-teal-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
        title="Zoom avant"
        aria-label="Augmenter le zoom"
      >
        <ZoomIn className="w-6 h-6" />
      </button>
      
      <button
        onClick={() => adjustZoom('reset')}
        className="w-12 h-12 bg-gray-500 hover:bg-gray-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
        title="Réinitialiser"
        aria-label="Réinitialiser le zoom"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
      
      <button
        onClick={() => adjustZoom('out')}
        className="w-12 h-12 bg-teal-500 hover:bg-teal-600 text-white rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
        title="Zoom arrière"
        aria-label="Réduire le zoom"
      >
        <ZoomOut className="w-6 h-6" />
      </button>
      
      <div className="text-center text-xs font-bold text-gray-600 mt-1">
        {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  );
}
