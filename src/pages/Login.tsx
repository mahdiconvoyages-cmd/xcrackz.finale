import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Eye, EyeOff, Zap, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect');
      } else if (err.message.includes('Email not confirmed')) {
        setError('Veuillez confirmer votre email');
      } else {
        setError(err.message || 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItMnptMC0ydi0yIDJ6bTAtMnYtMiAyem0wLTJ2LTIgMnptMC0ydi0yIDJ6bTAtMnYtMiAyem0wLTJ2LTIgMnptMC0ydi0yIDJ6bTAtMnYtMiAyem0wLTJ2LTIgMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 relative z-10">
        <div className="hidden lg:flex flex-col justify-center p-12 text-white animate-in slide-in-from-left duration-700">
          <div className="space-y-8">
            <div className="animate-in fade-in duration-1000">
              <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                CHECKSFLEET
              </h1>
              <p className="text-2xl font-bold text-slate-300 mb-2">
                Votre solution de gestion professionnelle
              </p>
              <p className="text-slate-400 text-lg">
                Gérez vos missions, contacts et flotte en toute simplicité
              </p>
            </div>

            <div className="space-y-6 animate-in slide-in-from-left duration-1000 delay-200">
              {[
                { icon: Zap, text: 'Suivi GPS en temps réel', color: 'from-yellow-400 to-orange-400' },
                { icon: Shield, text: 'Sécurité de niveau entreprise', color: 'from-teal-400 to-cyan-400' },
                { icon: ArrowRight, text: 'Interface moderne et intuitive', color: 'from-blue-400 to-purple-400' },
              ].map((feature, i) => (
                <div
                  key={i}
                  style={{ animationDelay: `${(i + 3) * 100}ms` }}
                  className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all animate-in slide-in-from-left"
                >
                  <div className={`p-3 bg-gradient-to-br ${feature.color} rounded-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-lg font-semibold">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 animate-in fade-in duration-1000 delay-500">
              <p className="text-slate-300 text-sm italic">
                "CHECKSFLEET a transformé notre façon de gérer nos missions. Une solution indispensable !"
              </p>
              <p className="text-teal-400 font-bold mt-2">— Client satisfait</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center animate-in slide-in-from-right duration-700">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-4xl font-black bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                CHECKSFLEET
              </h1>
              <p className="text-slate-400">Connectez-vous à votre compte</p>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-xl animate-in zoom-in duration-500">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Bienvenue !</h2>
                <p className="text-slate-600">Connectez-vous pour continuer</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-red-700 text-sm font-semibold animate-in slide-in-from-top">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-700">
                    Adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition"
                      placeholder="votre@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-black text-slate-700">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full pl-12 pr-12 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-2 border-slate-300 text-teal-600 focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-sm font-semibold text-slate-600">Se souvenir</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-bold text-teal-600 hover:text-teal-700 transition"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-black py-4 rounded-xl hover:shadow-2xl hover:shadow-teal-500/50 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <LogIn className="w-5 h-5" />
                  {loading ? 'Connexion en cours...' : 'Se connecter'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-slate-600 font-semibold">
                  Pas encore de compte ?{' '}
                  <Link to="/register" className="text-teal-600 hover:text-teal-700 font-black">
                    Créer un compte
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                En vous connectant, vous acceptez nos{' '}
                <Link to="/legal" className="text-teal-400 hover:text-teal-300 underline">
                  Conditions d'utilisation
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
