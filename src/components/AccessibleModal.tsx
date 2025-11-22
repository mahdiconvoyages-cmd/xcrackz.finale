import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../utils/accessibility';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

/**
 * Modal entièrement accessible avec :
 * - Focus trap (Tab reste dans la modal)
 * - Escape pour fermer
 * - aria-modal et role=dialog
 * - Focus automatique sur la modal à l'ouverture
 * - Restauration du focus après fermeture
 */
export default function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: AccessibleModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap
  useFocusTrap(isOpen, modalRef);

  // Escape pour fermer
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Gérer le focus
  useEffect(() => {
    if (isOpen) {
      // Sauvegarder l'élément qui avait le focus
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Bloquer le scroll du body
      document.body.style.overflow = 'hidden';
    } else {
      // Restaurer le scroll
      document.body.style.overflow = '';
      
      // Restaurer le focus après un petit délai
      setTimeout(() => {
        previousFocusRef.current?.focus();
      }, 0);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-7xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`
          relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]}
          max-h-[90vh] overflow-hidden flex flex-col
          animate-in fade-in zoom-in duration-200
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 id="modal-title" className="text-2xl font-bold text-slate-900">
            {title}
          </h2>
          
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              aria-label="Fermer la modal"
            >
              <X className="w-6 h-6 text-slate-600" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
