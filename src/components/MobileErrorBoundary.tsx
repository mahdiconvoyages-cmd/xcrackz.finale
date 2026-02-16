import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isMobile: boolean;
}

/**
 * ErrorBoundary amélioré avec support mobile
 * Capture les erreurs DOM spécifiques à mobile (insertBefore, appendChild, etc.)
 */
class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isMobile: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Détecter si c'est mobile
    const isMobile = window.innerWidth < 768 || 
                     /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    this.setState({
      error,
      errorInfo,
      isMobile,
    });

    // Log l'erreur
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Erreurs spécifiques mobile DOM
    const isDOMError = error.message.includes('insertBefore') ||
                      error.message.includes('appendChild') ||
                      error.message.includes('removeChild') ||
                      error.message.includes('not a child');

    if (isDOMError && isMobile) {
      console.warn('🔴 Mobile DOM Error detected - attempting recovery');
      
      // Tenter une récupération automatique après un court délai
      setTimeout(() => {
        this.handleReset();
      }, 2000);
    }

    // Appeler le callback optionnel
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Utiliser le fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, isMobile } = this.state;
      const isDOMError = error?.message.includes('insertBefore') ||
                        error?.message.includes('appendChild') ||
                        error?.message.includes('removeChild');

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              {isMobile && isDOMError ? 'Erreur d\'affichage mobile' : 'Une erreur s\'est produite'}
            </h1>

            <p className="text-slate-600 mb-6">
              {isMobile && isDOMError
                ? 'Un problème d\'affichage est survenu sur votre appareil mobile. Nous tentons de le résoudre automatiquement.'
                : 'Quelque chose s\'est mal passé. Veuillez réessayer.'}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-mono text-red-800 break-words">
                  {error.toString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Réessayer
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-all"
              >
                <Home className="w-5 h-5" />
                Accueil
              </button>
            </div>

            {isMobile && isDOMError && (
              <p className="text-xs text-slate-500 mt-4">
                💡 Astuce: Essayez de rafraîchir la page ou de redémarrer votre navigateur
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MobileErrorBoundary;
