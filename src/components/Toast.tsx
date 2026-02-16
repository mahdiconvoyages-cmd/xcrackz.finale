import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

let toastCount = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

export const showToast = (
  type: ToastType,
  message: string,
  description?: string,
  duration = 4000
) => {
  const id = `toast-${++toastCount}`;
  const newToast: Toast = { id, type, message, description, duration };

  toasts = [...toasts, newToast];
  listeners.forEach((listener) => listener(toasts));

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
};

const removeToast = (id: string) => {
  toasts = toasts.filter((t) => t.id !== id);
  listeners.forEach((listener) => listener(toasts));
};

export default function ToastContainer() {
  const [activeToasts, setActiveToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setActiveToasts);
    return () => {
      listeners.delete(setActiveToasts);
    };
  }, []);

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-md">
      {activeToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const config = {
    success: {
      icon: CheckCircle,
      bg: 'from-emerald-500 to-teal-500',
      border: 'border-emerald-400',
      text: 'text-white',
    },
    error: {
      icon: XCircle,
      bg: 'from-red-500 to-rose-500',
      border: 'border-red-400',
      text: 'text-white',
    },
    warning: {
      icon: AlertCircle,
      bg: 'from-amber-500 to-orange-500',
      border: 'border-amber-400',
      text: 'text-white',
    },
    info: {
      icon: Info,
      bg: 'from-blue-500 to-cyan-500',
      border: 'border-blue-400',
      text: 'text-white',
    },
  };

  const { icon: Icon, bg, border, text } = config[toast.type];

  return (
    <div
      className={`
        backdrop-blur-xl bg-gradient-to-r ${bg} border ${border}
        rounded-2xl shadow-2xl p-4 min-w-[320px]
        transform transition-all duration-300
        ${isExiting ? 'translate-x-[400px] opacity-0' : 'translate-x-0 opacity-100'}
        animate-slide-in-right
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${text} leading-tight`}>{toast.message}</p>
          {toast.description && (
            <p className={`text-sm ${text} opacity-90 mt-1`}>{toast.description}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className={`flex-shrink-0 ${text} hover:opacity-70 transition`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {toast.duration && toast.duration > 0 && (
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/60 animate-progress-bar"
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      )}
    </div>
  );
}
