import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
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
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Oups ! Une erreur est survenue</h1>
                <p className="text-slate-600">L'application a rencontré un problème inattendu</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-red-800 mb-2">Message d'erreur :</p>
              <p className="text-sm text-red-700 font-mono">
                {this.state.error?.message || 'Erreur inconnue'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-700 leading-relaxed">
                Ne vous inquiétez pas ! Vos données sont sauvegardées. Vous pouvez essayer de :
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full"></span>
                  Rafraîchir la page pour réessayer
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full"></span>
                  Retourner à l'accueil
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-600 rounded-full"></span>
                  Contacter le support si le problème persiste
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition font-medium"
              >
                <RefreshCw className="w-5 h-5" />
                Réessayer
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition font-medium"
              >
                <Home className="w-5 h-5" />
                Accueil
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6">
                <summary className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-slate-800">
                  Détails techniques (développement uniquement)
                </summary>
                <pre className="mt-3 p-4 bg-slate-100 rounded-lg text-xs overflow-auto max-h-64">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
