import { useEffect, useRef, useState } from 'react';
import { X, Check, Sparkles, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

interface Corner {
  x: number;
  y: number;
}

interface CropWorkspaceProps {
  imageUrl: string;
  initialCorners: Corner[];
  onApply: (corners: Corner[]) => void | Promise<void>;
  onCancel: () => void;
}

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.05;

export default function CropWorkspace({ imageUrl, initialCorners, onApply, onCancel }: CropWorkspaceProps) {
  const [corners, setCorners] = useState<Corner[]>(initialCorners);
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [statusMessage, setStatusMessage] = useState('Ajustez les coins pour suivre le document.');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || corners.length !== 4) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const { clientWidth, clientHeight } = parent;

    canvas.width = clientWidth;
    canvas.height = clientHeight;
    canvas.style.width = `${clientWidth}px`;
    canvas.style.height = `${clientHeight}px`;

    const imgRatio = img.width / img.height;
    const parentRatio = clientWidth / clientHeight;

    let baseWidth: number;
    let baseHeight: number;

    if (imgRatio > parentRatio) {
      baseWidth = clientWidth;
      baseHeight = clientWidth / imgRatio;
    } else {
      baseHeight = clientHeight;
      baseWidth = clientHeight * imgRatio;
    }

    const displayWidth = baseWidth * zoom;
    const displayHeight = baseHeight * zoom;
    const offsetX = (clientWidth - displayWidth) / 2;
    const offsetY = (clientHeight - displayHeight) / 2;
    const scaleX = displayWidth / img.width;
    const scaleY = displayHeight / img.height;

    canvas.setAttribute('data-scale-x', scaleX.toString());
    canvas.setAttribute('data-scale-y', scaleY.toString());
    canvas.setAttribute('data-offset-x', offsetX.toString());
    canvas.setAttribute('data-offset-y', offsetY.toString());
    canvas.setAttribute('data-img-width', img.width.toString());
    canvas.setAttribute('data-img-height', img.height.toString());

    ctx.clearRect(0, 0, clientWidth, clientHeight);
    ctx.drawImage(img, offsetX, offsetY, displayWidth, displayHeight);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.fillRect(0, 0, clientWidth, clientHeight);

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(corners[0].x * scaleX + offsetX, corners[0].y * scaleY + offsetY);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x * scaleX + offsetX, corners[i].y * scaleY + offsetY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#0d9488';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(corners[0].x * scaleX + offsetX, corners[0].y * scaleY + offsetY);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x * scaleX + offsetX, corners[i].y * scaleY + offsetY);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    corners.forEach((corner, index) => {
      const x = corner.x * scaleX + offsetX;
      const y = corner.y * scaleY + offsetY;
      ctx.fillStyle = index === activeCorner ? '#14b8a6' : '#22d3ee';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  // Charger l'image source
  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [imageUrl]);

  // Revenir aux coins détectés si detect change
  useEffect(() => {
    setCorners(initialCorners);
  }, [initialCorners]);

  // Redessiner quand les états changent
  useEffect(() => {
    drawCanvas();
  }, [corners, zoom, activeCorner]);

  const getPointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();

    const scaleX = parseFloat(canvas.getAttribute('data-scale-x') || '1');
    const scaleY = parseFloat(canvas.getAttribute('data-scale-y') || '1');
    const offsetX = parseFloat(canvas.getAttribute('data-offset-x') || '0');
    const offsetY = parseFloat(canvas.getAttribute('data-offset-y') || '0');
    const imgWidth = parseFloat(canvas.getAttribute('data-img-width') || '1');
    const imgHeight = parseFloat(canvas.getAttribute('data-img-height') || '1');

    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    const x = (canvasX - offsetX) / scaleX;
    const y = (canvasY - offsetY) / scaleY;

    return { x, y, imgWidth, imgHeight };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getPointerPosition(event);
    if (!pos) return;

    let nearestCorner = -1;
    let minDistance = Infinity;

    for (let i = 0; i < corners.length; i++) {
      const dx = corners[i].x - pos.x;
      const dy = corners[i].y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCorner = i;
      }
    }

    if (minDistance < 60) {
      setActiveCorner(nearestCorner);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeCorner === null) return;
    const pos = getPointerPosition(event);
    if (!pos) return;

    const x = Math.max(0, Math.min(pos.imgWidth, pos.x));
    const y = Math.max(0, Math.min(pos.imgHeight, pos.y));

    const updated = [...corners];
    updated[activeCorner] = { x, y };
    setCorners(updated);
    event.preventDefault();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeCorner !== null) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setActiveCorner(null);
  };

  const handleResetCorners = () => {
    setCorners(initialCorners);
    setStatusMessage('Coins réinitialisés à la détection automatique.');
  };

  const handleApply = async () => {
    setStatusMessage('Application du recadrage...');
    await onApply(corners);
  };

  const cornerLabels = ['Haut gauche', 'Haut droit', 'Bas droit', 'Bas gauche'];

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">Recadrage intelligent</p>
            <p className="text-xs text-slate-400">Nouvelle interface claire et concentrée</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-slate-300 hover:text-white transition-colors flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          Fermer
        </button>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.25),_transparent_60%)]"></div>
          <div className="absolute top-4 left-4 bg-black/40 text-white text-sm px-4 py-2 rounded-full backdrop-blur">
            {statusMessage}
          </div>
          {activeCorner !== null && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/70 border border-slate-700 text-white text-sm px-4 py-2 rounded-full">
              {cornerLabels[activeCorner]}
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <p className="text-sm text-slate-300 font-medium">Zoom</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoom(prev => Math.max(ZOOM_MIN, +(prev - ZOOM_STEP).toFixed(2)))}
                className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={ZOOM_STEP}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-teal-400"
              />
              <button
                onClick={() => setZoom(prev => Math.min(ZOOM_MAX, +(prev + ZOOM_STEP).toFixed(2)))}
                className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">Zoom actuel: {(zoom * 100).toFixed(0)}%</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Coins détectés</p>
              <button
                onClick={handleResetCorners}
                className="text-xs text-teal-300 hover:text-teal-100 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Réinitialiser
              </button>
            </div>
            <div className="space-y-3">
              {corners.map((corner, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between text-xs rounded-xl px-3 py-2 border ${
                    activeCorner === index ? 'border-teal-400/70 bg-teal-400/10 text-teal-100' : 'border-slate-700 text-slate-300'
                  }`}
                >
                  <span>{cornerLabels[index]}</span>
                  <span>
                    {Math.round(corner.x)}px • {Math.round(corner.y)}px
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-white">Actions</p>
            <button
              onClick={handleResetCorners}
              className="w-full border border-slate-700 text-slate-200 hover:border-teal-400 hover:text-white rounded-xl py-3"
            >
              Rétablir la détection
            </button>
            <button
              onClick={onCancel}
              className="w-full border border-transparent bg-slate-800 text-white rounded-xl py-3 hover:bg-slate-700"
            >
              Annuler
            </button>
            <button
              onClick={handleApply}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Appliquer le recadrage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
