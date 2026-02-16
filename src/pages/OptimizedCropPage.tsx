/**
 * ✂️ RECADRAGE MANUEL OPTIMISÉ AVEC PREVIEW EN TEMPS RÉEL
 * Interface fluide et précise pour ajustement des coins
 */

import { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCw, RefreshCw, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

export interface Corner {
  x: number;
  y: number;
}

interface OptimizedCropPageProps {
  imageUrl: string;
  initialCorners: Corner[];
  onApply: (corners: Corner[]) => void;
  onCancel: () => void;
}

export default function OptimizedCropPage({
  imageUrl,
  initialCorners,
  onApply,
  onCancel
}: OptimizedCropPageProps) {
  const [corners, setCorners] = useState<Corner[]>(initialCorners);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Charger l'image
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [imageUrl]);

  // Redessiner quand les coins changent
  useEffect(() => {
    drawCanvas();
  }, [corners, zoom, rotation]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;

    if (!canvas || !container || !img) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    // Adapter le canvas au container
    const containerRect = container.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    // Calculer le ratio d'affichage
    const imgRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
      displayWidth = canvas.width * zoom;
      displayHeight = (canvas.width / imgRatio) * zoom;
      offsetX = 0;
      offsetY = (canvas.height - displayHeight) / 2;
    } else {
      displayHeight = canvas.height * zoom;
      displayWidth = (canvas.height * imgRatio) * zoom;
      offsetX = (canvas.width - displayWidth) / 2;
      offsetY = 0;
    }

    // Sauvegarder le contexte pour restaurer après rotation
    ctx.save();

    // Appliquer la rotation si nécessaire
    if (rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Dessiner l'image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, displayWidth, displayHeight);

    // Dessiner le masque semi-transparent (zone non sélectionnée)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Découper la zone sélectionnée
    if (corners.length === 4) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      
      const scaledCorners = corners.map(c => ({
        x: offsetX + (c.x / img.width) * displayWidth,
        y: offsetY + (c.y / img.height) * displayHeight
      }));

      ctx.moveTo(scaledCorners[0].x, scaledCorners[0].y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(scaledCorners[i].x, scaledCorners[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Dessiner les bordures de la sélection
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(scaledCorners[0].x, scaledCorners[0].y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(scaledCorners[i].x, scaledCorners[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Dessiner les coins draggables
      scaledCorners.forEach((corner, index) => {
        const isActive = draggingIndex === index;
        
        // Ombre du coin
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // Cercle extérieur
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, isActive ? 16 : 14, 0, Math.PI * 2);
        ctx.fill();

        // Cercle intérieur
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = isActive ? '#3b82f6' : '#60a5fa';
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, isActive ? 10 : 8, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculer les coordonnées d'affichage
    const imgRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
      displayWidth = canvas.width * zoom;
      displayHeight = (canvas.width / imgRatio) * zoom;
      offsetX = 0;
      offsetY = (canvas.height - displayHeight) / 2;
    } else {
      displayHeight = canvas.height * zoom;
      displayWidth = (canvas.height * imgRatio) * zoom;
      offsetX = (canvas.width - displayWidth) / 2;
      offsetY = 0;
    }

    // Vérifier si un coin est cliqué
    const scaledCorners = corners.map(c => ({
      x: offsetX + (c.x / img.width) * displayWidth,
      y: offsetY + (c.y / img.height) * displayHeight
    }));

    for (let i = 0; i < scaledCorners.length; i++) {
      const corner = scaledCorners[i];
      const distance = Math.sqrt(
        Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2)
      );

      if (distance < 25) {
        setDraggingIndex(i);
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingIndex === null) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculer les coordonnées d'affichage
    const imgRatio = img.width / img.height;
    const canvasRatio = canvas.width / canvas.height;

    let displayWidth, displayHeight, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
      displayWidth = canvas.width * zoom;
      displayHeight = (canvas.width / imgRatio) * zoom;
      offsetX = 0;
      offsetY = (canvas.height - displayHeight) / 2;
    } else {
      displayHeight = canvas.height * zoom;
      displayWidth = (canvas.height * imgRatio) * zoom;
      offsetX = (canvas.width - displayWidth) / 2;
      offsetY = 0;
    }

    // Convertir en coordonnées image
    const imageX = ((x - offsetX) / displayWidth) * img.width;
    const imageY = ((y - offsetY) / displayHeight) * img.height;

    // Contraindre dans les limites de l'image
    const clampedX = Math.max(0, Math.min(img.width, imageX));
    const clampedY = Math.max(0, Math.min(img.height, imageY));

    // Mettre à jour le coin
    const newCorners = [...corners];
    newCorners[draggingIndex] = { x: clampedX, y: clampedY };
    setCorners(newCorners);
  };

  const handlePointerUp = () => {
    setDraggingIndex(null);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    
    // Rotation des coins aussi
    const img = imageRef.current;
    if (!img) return;

    const centerX = img.width / 2;
    const centerY = img.height / 2;

    const rotatedCorners = corners.map(corner => {
      const dx = corner.x - centerX;
      const dy = corner.y - centerY;
      
      return {
        x: centerX - dy,
        y: centerY + dx
      };
    });

    setCorners(rotatedCorners);
  };

  const handleReset = () => {
    setCorners(initialCorners);
    setZoom(1);
    setRotation(0);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleFitScreen = () => {
    setZoom(1);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>

          <h2 className="text-white font-semibold flex items-center gap-2">
            <Maximize2 className="w-5 h-5" />
            Ajuster le recadrage
          </h2>

          <button
            onClick={() => onApply(corners)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Appliquer
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-full touch-none cursor-move"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Toolbar */}
      <div className="bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 px-4 py-4">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleZoomOut}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Zoom arrière"
          >
            <ZoomOut className="w-5 h-5 text-gray-300" />
          </button>

          <button
            onClick={handleFitScreen}
            className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-gray-300 text-sm font-medium"
            title="Adapter à l'écran"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Zoom avant"
          >
            <ZoomIn className="w-5 h-5 text-gray-300" />
          </button>

          <div className="w-px h-8 bg-gray-700 mx-2" />

          <button
            onClick={handleRotate}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Rotation 90°"
          >
            <RotateCw className="w-5 h-5 text-gray-300" />
          </button>

          <button
            onClick={handleReset}
            className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Réinitialiser"
          >
            <RefreshCw className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-center text-gray-400 text-sm mt-3">
          Déplacez les coins bleus pour ajuster le cadrage
        </p>
      </div>
    </div>
  );
}
