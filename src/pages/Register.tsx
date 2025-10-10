import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Chrome } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { accountVerificationService } from '../services/accountVerification';

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [userType, setUserType] = useState<'convoyeur' | 'donneur_ordre'>('donneur_ordre');
  const [isDriver, setIsDriver] = useState(false);
  const [driverLicenses, setDriverLicenses] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      const existingUser = await accountVerificationService.checkExistingUser(email, phone);

      if (existingUser.exists) {
        const errorMsg = accountVerificationService.getErrorMessage(existingUser.matchedBy);
        setError(errorMsg);

        await accountVerificationService.logAccountCreationAttempt(
          email,
          phone,
          false,
          errorMsg,
          true,
          existingUser.userId || undefined
        );

        await accountVerificationService.detectSuspiciousBehavior(email, phone);

        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        await accountVerificationService.logAccountCreationAttempt(
          email,
          phone,
          false,
          authError.message,
          false
        );
        throw authError;
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              email,
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`,
              phone,
              company,
              address,
              user_type: userType,
            },
          ]);

        if (profileError) {
          await accountVerificationService.logAccountCreationAttempt(
            email,
            phone,
            false,
            profileError.message,
            false
          );
          throw profileError;
        }

        if (isDriver) {
          const { error: contactError } = await supabase
            .from('contacts')
            .insert([
              {
                user_id: authData.user.id,
                name: `${firstName} ${lastName}`,
                email,
                phone,
                address,
                company,
                is_driver: true,
                driver_licenses: driverLicenses,
                availability_status: 'available',
                category: 'driver',
              },
            ]);

          if (contactError) throw contactError;
        }

        await accountVerificationService.logAccountCreationAttempt(
          email,
          phone,
          true,
          undefined,
          false
        );
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            xCrackz
          </h1>
          <p className="text-slate-400">Créez votre compte gratuit</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Prénom <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Jean"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nom <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Téléphone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="+33 6 12 34 56 78"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Entreprise <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Mon Entreprise"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Adresse <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="123 Rue de la Paix, 75001 Paris"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type de compte <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUserType('donneur_ordre')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    userType === 'donneur_ordre'
                      ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold mb-1">Donneur d'ordre</div>
                  <div className="text-xs">Je crée des missions</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserType('convoyeur');
                    setIsDriver(true);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    userType === 'convoyeur'
                      ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                      : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="font-semibold mb-1">Convoyeur</div>
                  <div className="text-xs">J'effectue des missions</div>
                </button>
              </div>
            </div>

            {userType === 'convoyeur' && (
              <div className="border-2 border-teal-500/30 bg-teal-500/5 rounded-lg p-4">
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Permis de conduire <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['B', 'C', 'D', 'CE', 'DE', 'C1', 'D1'].map((license) => (
                    <label
                      key={license}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/30 p-2 rounded transition"
                    >
                      <input
                        type="checkbox"
                        checked={driverLicenses.includes(license)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setDriverLicenses([...driverLicenses, license]);
                          } else {
                            setDriverLicenses(driverLicenses.filter((l) => l !== license));
                          }
                        }}
                        className="w-5 h-5 text-teal-500 bg-slate-800 border-slate-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-slate-300 font-semibold">Permis {license}</span>
                    </label>
                  ))}
                </div>
                {userType === 'convoyeur' && driverLicenses.length === 0 && (
                  <p className="text-amber-400 text-xs mt-2">Veuillez sélectionner au moins un permis</p>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mot de passe <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirmer le mot de passe <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading || (userType === 'convoyeur' && driverLicenses.length === 0)}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold py-3 rounded-lg hover:shadow-lg hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-700"></div>
            <span className="text-slate-500 text-sm">OU</span>
            <div className="flex-1 h-px bg-slate-700"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full bg-white text-slate-900 font-semibold py-3 rounded-lg hover:bg-slate-100 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Chrome className="w-5 h-5" />
            {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
          </button>

          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-teal-400 hover:text-teal-300 font-semibold">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
