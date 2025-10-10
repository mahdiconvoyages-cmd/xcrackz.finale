import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SuccessAnimationProps {
  message: string;
  onComplete?: () => void;
}

export default function SuccessAnimation({ message, onComplete }: SuccessAnimationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="backdrop-blur-xl bg-white/90 border border-white/60 rounded-3xl p-8 shadow-depth-xl max-w-sm mx-4 animate-in zoom-in duration-300">
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full animate-pulse"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-glow-green animate-in zoom-in duration-500 delay-100">
              <Check className="w-10 h-10 text-white animate-in zoom-in duration-300 delay-200" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2 animate-in slide-in-from-bottom duration-300 delay-150">
            Succès!
          </h3>
          <p className="text-slate-600 text-center animate-in slide-in-from-bottom duration-300 delay-200">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
