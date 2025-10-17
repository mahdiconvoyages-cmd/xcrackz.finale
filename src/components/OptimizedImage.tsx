import { useState, ImgHTMLAttributes } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  eager?: boolean; // Force eager loading même sur mobile
}

/**
 * Composant d'image optimisé pour mobile
 * - Lazy loading automatique sur mobile
 * - Gestion d'erreurs avec fallback
 * - Placeholder pendant le chargement
 */
export default function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  className = '',
  eager = false,
  ...props
}: OptimizedImageProps) {
  const isMobile = useIsMobile();
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    if (fallbackSrc) {
      setIsLoaded(true);
    }
  };

  // Sur mobile, lazy load par défaut sauf si eager=true
  const loading = (!isMobile || eager) ? 'eager' : 'lazy';

  return (
    <div className={`relative ${className}`}>
      {/* Placeholder pendant le chargement */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse rounded-lg" />
      )}

      {/* Image principale ou fallback */}
      <img
        src={hasError && fallbackSrc ? fallbackSrc : src}
        alt={alt}
        loading={loading}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        {...props}
      />

      {/* Indicateur d'erreur si pas de fallback */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 bg-slate-200 rounded-lg flex items-center justify-center">
          <div className="text-center text-slate-500 p-4">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs">Image non disponible</p>
          </div>
        </div>
      )}
    </div>
  );
}
