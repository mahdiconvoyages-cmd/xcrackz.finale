/**
 * Composant Galerie Photos - Affichage plein écran avec navigation
 */

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';

interface Photo {
  id?: string;
  photo_url: string;
  photo_type: string;
  created_at?: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function PhotoGallery({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  title = 'Photos d\'inspection'
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
    setIsZoomed(false);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentIndex]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    setZoom(1);
    setIsZoomed(false);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setZoom(1);
    setIsZoomed(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
    setIsZoomed(true);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.5, 1);
    setZoom(newZoom);
    if (newZoom === 1) setIsZoomed(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentPhoto.photo_url;
    link.download = `photo-${currentPhoto.photo_type || currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-white">
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-sm text-slate-300">
              {currentIndex + 1} / {photos.length} • {currentPhoto.photo_type.replace(/_/g, ' ')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 1}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Dézoomer"
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <span className="text-white text-sm font-semibold min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoomer"
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
              title="Télécharger"
            >
              <Download className="w-5 h-5 text-white" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition"
              title="Fermer (Échap)"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Gauche */}
      {photos.length > 1 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition backdrop-blur-sm"
          title="Photo précédente (←)"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Image principale */}
      <div className="h-full flex items-center justify-center p-20">
        <div
          className={`relative max-w-full max-h-full transition-transform duration-300 ${
            isZoomed ? 'cursor-move' : 'cursor-zoom-in'
          }`}
          style={{
            transform: `scale(${zoom})`,
          }}
          onClick={() => zoom === 1 && handleZoomIn()}
        >
          <img
            src={currentPhoto.photo_url}
            alt={currentPhoto.photo_type}
            className="max-w-full max-h-[calc(100vh-10rem)] object-contain rounded-lg shadow-2xl"
            draggable={false}
          />
        </div>
      </div>

      {/* Navigation Droite */}
      {photos.length > 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition backdrop-blur-sm"
          title="Photo suivante (→)"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Miniatures en bas */}
      {photos.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="max-w-7xl mx-auto overflow-x-auto">
            <div className="flex gap-2 justify-center min-w-min">
              {photos.map((photo, index) => (
                <button
                  key={photo.id || index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setZoom(1);
                    setIsZoomed(false);
                  }}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                    index === currentIndex
                      ? 'ring-4 ring-teal-500 scale-110'
                      : 'opacity-60 hover:opacity-100 hover:scale-105'
                  }`}
                >
                  <img
                    src={photo.photo_url}
                    alt={`Miniature ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {index === currentIndex && (
                    <div className="absolute inset-0 bg-teal-500/20" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
