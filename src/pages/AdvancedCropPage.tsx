/**
 * 📐 Page de Recadrage Avancée
 * 
 * Fonctionnalités:
 * - Détection automatique IA
 * - Recadrage manuel 4 points
 * - Zoom & Pan pour précision
 * - Rotation rapide (90°)
 * - Réinitialisation détection
 * - Aperçu en temps réel
 * - Correction perspective automatique
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Check, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  RefreshCw,
  Move,
  Grid3x3
} from 'lucide-react';

interface Corner {
  x: number;
  y: number;
}

interface AdvancedCropPageProps {
  imageUrl: string;
  initialCorners: Corner[];
  onApply: (corners: Corner[]) => void;
  onCancel: () => void;
}

export default function AdvancedCropPage({ 
  imageUrl, 
  initialCorners, 
  onApply, 
  onCancel 
}: AdvancedCropPageProps) {
  const [corners, setCorners] = useState<Corner[]>(initialCorners);
  const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [imageRotation, setImageRotation] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Charger l'image et calculer les dimensions
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      // Image dimensions are calculated but not stored in state
    };
  }, [imageUrl]);

  // Dessiner le canvas avec tous les effets
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || corners.length !== 4) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    const img = new Image();
    img.src = imageUrl;
    
    if (img.complete && img.naturalWidth > 0) {
      renderCropView(canvas, ctx, img);
    } else {
      img.onload = () => renderCropView(canvas, ctx, img);
    }
  }, [imageUrl, corners, zoomLevel, panOffset, showGrid, imageRotation]);

  const renderCropView = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement
  ) => {
    const container = canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculer les dimensions d'affichage
    const imgRatio = img.width / img.height;
    const containerRatio = containerWidth / containerHeight;

    let baseWidth: number;
    let baseHeight: number;

    if (imgRatio > containerRatio) {
      baseWidth = containerWidth;
      baseHeight = containerWidth / imgRatio;
    } else {
      baseHeight = containerHeight;
      baseWidth = containerHeight * imgRatio;
    }

    // Appliquer le zoom
    const displayWidth = baseWidth * zoomLevel;
    const displayHeight = baseHeight * zoomLevel;

    // Définir les dimensions du canvas
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    // Calculer l'offset pour centrer + pan
    const offsetX = (containerWidth - displayWidth) / 2 + panOffset.x;
    const offsetY = (containerHeight - displayHeight) / 2 + panOffset.y;

    // Calculer le scale
    const scaleX = displayWidth / img.width;
    const scaleY = displayHeight / img.height;

    // Sauvegarder les scales
    canvas.setAttribute('data-scale-x', scaleX.toString());
    canvas.setAttribute('data-scale-y', scaleY.toString());
    canvas.setAttribute('data-img-width', img.width.toString());
    canvas.setAttribute('data-img-height', img.height.toString());
    canvas.setAttribute('data-offset-x', offsetX.toString());
    canvas.setAttribute('data-offset-y', offsetY.toString());

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner l'image avec rotation si besoin
    ctx.save();
    if (imageRotation !== 0) {
      ctx.translate(containerWidth / 2, containerHeight / 2);
      ctx.rotate((imageRotation * Math.PI) / 180);
      ctx.translate(-containerWidth / 2, -containerHeight / 2);
    }
    ctx.drawImage(img, offsetX, offsetY, displayWidth, displayHeight);
    ctx.restore();

    // Masque sombre
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Zone sélectionnée (clear)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(
      corners[0].x * scaleX + offsetX,
      corners[0].y * scaleY + offsetY
    );
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(
        corners[i].x * scaleX + offsetX,
        corners[i].y * scaleY + offsetY
      );
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Grille de guidage
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      const minX = Math.min(...corners.map(c => c.x)) * scaleX + offsetX;
      const maxX = Math.max(...corners.map(c => c.x)) * scaleX + offsetX;
      const minY = Math.min(...corners.map(c => c.y)) * scaleY + offsetY;
      const maxY = Math.max(...corners.map(c => c.y)) * scaleY + offsetY;
      const widthZone = maxX - minX;
      const heightZone = maxY - minY;

      // Lignes verticales
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(minX + (i * widthZone) / 3, minY);
        ctx.lineTo(minX + (i * widthZone) / 3, maxY);
        ctx.stroke();
      }

      // Lignes horizontales
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(minX, minY + (i * heightZone) / 3);
        ctx.lineTo(maxX, minY + (i * heightZone) / 3);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Bordure du document
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.shadowColor = '#14b8a6';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(
      corners[0].x * scaleX + offsetX,
      corners[0].y * scaleY + offsetY
    );
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(
        corners[i].x * scaleX + offsetX,
        corners[i].y * scaleY + offsetY
      );
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Gestion du pointer
  const getPointerPosition = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = parseFloat(canvas.getAttribute('data-scale-x') || '1');
    const scaleY = parseFloat(canvas.getAttribute('data-scale-y') || '1');
    const imgWidth = parseFloat(canvas.getAttribute('data-img-width') || '1');
    const imgHeight = parseFloat(canvas.getAttribute('data-img-height') || '1');
    const offsetX = parseFloat(canvas.getAttribute('data-offset-x') || '0');
    const offsetY = parseFloat(canvas.getAttribute('data-offset-y') || '0');

    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    if (!scaleX || !scaleY) return null;

    const x = (canvasX - offsetX) / scaleX;
    const y = (canvasY - offsetY) / scaleY;

    return { x, y, scaleX, scaleY, imgWidth, imgHeight, canvasX, canvasY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getPointerPosition(e);
    if (!pos) return;

    // Vérifier si on clique sur un coin
    const TOUCH_RADIUS = 50 / pos.scaleX;
    let foundCorner = false;

    for (let i = 0; i < corners.length; i++) {
      const dx = corners[i].x - pos.x;
      const dy = corners[i].y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < TOUCH_RADIUS) {
        setDraggingCorner(i);
        foundCorner = true;
        e.preventDefault();
        return;
      }
    }

    // Sinon, démarrer le pan
    if (!foundCorner && e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: pos.canvasX - panOffset.x, y: pos.canvasY - panOffset.y });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getPointerPosition(e);
    if (!pos) return;

    if (draggingCorner !== null) {
      const x = Math.max(0, Math.min(pos.imgWidth, pos.x));
      const y = Math.max(0, Math.min(pos.imgHeight, pos.y));

      const currentCorner = corners[draggingCorner];
      if (Math.abs(currentCorner.x - x) < 1 && Math.abs(currentCorner.y - y) < 1) return;

      const newCorners = [...corners];
      newCorners[draggingCorner] = { x, y };
      setCorners(newCorners);
      e.preventDefault();
    } else if (isPanning) {
      setPanOffset({
        x: pos.canvasX - panStart.x,
        y: pos.canvasY - panStart.y,
      });
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setDraggingCorner(null);
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const pos = getPointerPosition(e);
    if (!pos) return;

    const TOUCH_RADIUS = 50 / pos.scaleX;

    for (let i = 0; i < corners.length; i++) {
      const dx = corners[i].x - pos.x;
      const dy = corners[i].y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < TOUCH_RADIUS) {
        setDraggingCorner(i);
        e.preventDefault();
        return;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (draggingCorner === null) return;

    const pos = getPointerPosition(e);
    if (!pos) return;

    const x = Math.max(0, Math.min(pos.imgWidth, pos.x));
    const y = Math.max(0, Math.min(pos.imgHeight, pos.y));

    const currentCorner = corners[draggingCorner];
    if (Math.abs(currentCorner.x - x) < 1 && Math.abs(currentCorner.y - y) < 1) return;

    const newCorners = [...corners];
    newCorners[draggingCorner] = { x, y };
    setCorners(newCorners);
    e.preventDefault();
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setCorners(initialCorners);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setImageRotation(0);
  };

  const cornerLabels = ['Haut gauche', 'Haut droit', 'Bas droit', 'Bas gauche'];

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Maximize2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Recadrage Avancé</h2>
              <p className="text-xs text-slate-400">Zoom • Pan • Ajustement précis</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Toolbar latéral */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Outils à gauche */}
        <div className="w-20 bg-slate-900/80 backdrop-blur-sm border-r border-slate-700 flex flex-col items-center gap-2 p-3">
          <button
            onClick={handleZoomIn}
            className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors group"
            title="Zoom +"
          >
            <ZoomIn className="w-6 h-6 text-slate-400 group-hover:text-teal-400" />
          </button>

          <button
            onClick={handleZoomOut}
            className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors group"
            title="Zoom -"
          >
            <ZoomOut className="w-6 h-6 text-slate-400 group-hover:text-teal-400" />
          </button>

          <button
            onClick={handleResetZoom}
            className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors group"
            title="Réinitialiser vue"
          >
            <Maximize2 className="w-6 h-6 text-slate-400 group-hover:text-teal-400" />
          </button>

          <div className="h-px w-10 bg-slate-700 my-2"></div>

          <button
            onClick={handleRotate}
            className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors group"
            title="Rotation 90°"
          >
            <RotateCw className="w-6 h-6 text-slate-400 group-hover:text-teal-400" />
          </button>

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
              showGrid
                ? 'bg-teal-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
            }`}
            title="Afficher/Masquer la grille"
          >
            <Grid3x3 className="w-6 h-6" />
          </button>

          <div className="h-px w-10 bg-slate-700 my-2"></div>

          <button
            onClick={handleReset}
            className="w-14 h-14 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors group"
            title="Réinitialiser"
          >
            <RefreshCw className="w-6 h-6 text-slate-400 group-hover:text-orange-400" />
          </button>
        </div>

        {/* Zone canvas */}
        <div className="flex-1 relative bg-black" ref={containerRef}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            className={`w-full h-full ${
              isPanning ? 'cursor-grabbing' : draggingCorner !== null ? 'cursor-move' : 'cursor-grab'
            }`}
          />

          {/* Coins draggables */}
          {canvasRef.current && corners.length === 4 && (() => {
            const canvas = canvasRef.current;
            const scaleX = parseFloat(canvas.getAttribute('data-scale-x') || '1');
            const scaleY = parseFloat(canvas.getAttribute('data-scale-y') || '1');
            const offsetX = parseFloat(canvas.getAttribute('data-offset-x') || '0');
            const offsetY = parseFloat(canvas.getAttribute('data-offset-y') || '0');

            return corners.map((corner, index) => {
              const displayX = corner.x * scaleX + offsetX;
              const displayY = corner.y * scaleY + offsetY;
              const isActive = draggingCorner === index;

              return (
                <div
                  key={index}
                  className="absolute pointer-events-auto transition-transform"
                  style={{
                    left: `${displayX - 35}px`,
                    top: `${displayY - 35}px`,
                    width: '70px',
                    height: '70px',
                    transform: isActive ? 'scale(1.3)' : 'scale(1)',
                    zIndex: isActive ? 200 : 100,
                  }}
                  onMouseDown={(e) => {
                    setDraggingCorner(index);
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchStart={(e) => {
                    setDraggingCorner(index);
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <div
                    className={`w-full h-full rounded-full border-4 border-white shadow-2xl flex items-center justify-center transition-all cursor-grab active:cursor-grabbing ${
                      isActive ? 'bg-teal-400 scale-110' : 'bg-teal-500'
                    }`}
                  >
                    <span className="text-white font-bold text-xl">{index + 1}</span>
                  </div>

                  {isActive && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-teal-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      {cornerLabels[index]}
                    </div>
                  )}
                </div>
              );
            });
          })()}

          {/* Instructions */}
          <div className="absolute top-4 left-4 right-4 pointer-events-none">
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white px-5 py-3 rounded-xl shadow-2xl inline-block border-2 border-white/30">
              <div className="flex items-center gap-3">
                <Move className="w-5 h-5 animate-pulse" />
                <div>
                  <p className="text-sm font-bold">
                    {isPanning ? 'Déplacer la vue' : 'Ajustez les 4 coins'}
                  </p>
                  <p className="text-xs opacity-90">
                    {isPanning
                      ? 'Glissez pour déplacer'
                      : `Zoom: ${(zoomLevel * 100).toFixed(0)}%`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Indicateur coin actif */}
          {draggingCorner !== null && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-2xl border-2 border-teal-400">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center font-bold">
                    {draggingCorner + 1}
                  </div>
                  <span className="font-semibold">
                    {['Coin supérieur gauche', 'Coin supérieur droit', 'Coin inférieur droit', 'Coin inférieur gauche'][draggingCorner]}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions footer */}
      <div className="bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onApply(corners)}
            className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-teal-700 transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Appliquer le recadrage
          </button>
        </div>
      </div>
    </div>
  );
}
