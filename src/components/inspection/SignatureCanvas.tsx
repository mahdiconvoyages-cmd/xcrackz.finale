import { useRef, useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface SignatureCanvasProps {
  value?: string;
  onChange?: (signature: string) => void;
  onSave?: (signature: string) => void;
  onCancel?: () => void;
}

export default function SignatureCanvas({ value, onChange, onSave, onCancel }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (value && !hasSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setIsEmpty(false);
        setHasSignature(true);
      };
      img.src = value;
    } else if (!value && !hasSignature) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [value, hasSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setIsEmpty(false);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setHasSignature(false);

    if (onChange) {
      onChange('');
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;

    const dataUrl = canvas.toDataURL('image/png');

    if (onChange) {
      onChange(dataUrl);
      setHasSignature(true);
    }

    if (onSave) {
      onSave(dataUrl);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl p-4">
      <div className="border-2 border-dashed border-slate-600 rounded-lg overflow-hidden mb-4 bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {hasSignature && (
        <div className="mb-3 flex items-center gap-2 text-sm text-green-400">
          <Check className="w-4 h-4" />
          <span>Signature enregistrée</span>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          Effacer
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={saveSignature}
          disabled={isEmpty}
          className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg"
        >
          <Check className="w-5 h-5" />
          {onChange ? 'Enregistrer' : 'Valider'}
        </button>
      </div>
    </div>
  );
}
