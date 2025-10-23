import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserPlus, Chrome, Mail, Lock, User, Phone, Building, MapPin, 
  Eye, EyeOff, CheckCircle, XCircle, Shield, Zap, ArrowRight,
  Truck, Briefcase, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { accountVerificationService } from '../services/accountVerification';
import AddressAutocomplete from '../components/AddressAutocomplete';

export default function Register() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [userType, setUserType] = useState<'convoyeur' | 'donneur_ordre'>('donneur_ordre');
  const [isDriver, setIsDriver] = useState(false);
  const [driverLicenses, setDriverLicenses] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Validation du mot de passe
  const validatePassword = (pass: string) => {
    return {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    };
  };

  const passwordValidation = validatePassword(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  // Strength du mot de passe
  const getPasswordStrength = () => {
    const validCount = Object.values(passwordValidation).filter(Boolean).length;
    if (validCount <= 2) return { text: 'Faible', color: 'red', width: '33%' };
    if (validCount <= 4) return { text: 'Moyen', color: 'yellow', width: '66%' };
    return { text: 'Fort', color: 'green', width: '100%' };
  };

  const passwordStrength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptTerms) {
      setError('Veuillez accepter les conditions d\'utilisation');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas tous les critères de sécurité');
      return;
    }

    setLoading(true);

    try {
      // Vérification compte existant
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

      // Création du compte Supabase
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
        // Création du profil
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
              city,
              postal_code: postalCode,
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

        // Si convoyeur, créer contact
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

        // Log succès
        await accountVerificationService.logAccountCreationAttempt(
          email,
          phone,
          true,
          undefined,
          false
        );

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de l\'inscription');
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
      setError(err.message || 'Erreur lors de la connexion avec Google');
      setGoogleLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && (!firstName || !lastName || !email || !phone)) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (step === 2 && (!company || !address || !city)) {
      setError('Veuillez remplir tous les champs obligatoires (entreprise, adresse et ville)');
      return;
    }
    if (step === 3 && userType === 'convoyeur' && driverLicenses.length === 0) {
      setError('Veuillez sélectionner au moins un permis');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItMnptMC0ydi0yIDJ6bTAtMnYtMiAyem0wLTJ2LTIgMnptMC0ydi0yIDJ6bTAtMnYtMiAyem0wLTJ2LTIgMnptMC0ydi0yIDJ6bTAtMnYtMiAyem0wLTJ2LTIgMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 relative z-10">
        {/* Panneau Gauche - Info */}
        <div className="hidden lg:flex flex-col justify-center p-12 text-white animate-in slide-in-from-left duration-700">
          <div className="space-y-8">
            <div className="animate-in fade-in duration-1000">
              <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                xCrackz
              </h1>
              <p className="text-2xl font-bold text-slate-300 mb-2">
                Rejoignez notre communauté
              </p>
              <p className="text-slate-400 text-lg">
                Créez votre compte en quelques minutes et accédez à tous nos services
              </p>
            </div>

            <div className="space-y-6 animate-in slide-in-from-left duration-1000 delay-200">
              {[
                { icon: Zap, text: 'Configuration instantanée', color: 'from-yellow-400 to-orange-400' },
                { icon: Shield, text: 'Données 100% sécurisées', color: 'from-teal-400 to-cyan-400' },
                { icon: ArrowRight, text: 'Accès immédiat à la plateforme', color: 'from-blue-400 to-purple-400' },
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

            {/* Progress Steps */}
            <div className="mt-12 space-y-4">
              {[
                { num: 1, text: 'Informations personnelles' },
                { num: 2, text: 'Entreprise & Adresse' },
                { num: 3, text: 'Type de compte' },
                { num: 4, text: 'Sécurité' },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex items-center gap-3 transition-all ${
                    step >= s.num ? 'text-teal-400' : 'text-slate-500'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      step > s.num
                        ? 'bg-teal-500 text-white'
                        : step === s.num
                        ? 'bg-teal-500 text-white ring-4 ring-teal-500/30'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                  </div>
                  <span className="font-semibold">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panneau Droit - Formulaire */}
        <div className="flex items-center justify-center animate-in slide-in-from-right duration-700">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-4xl font-black bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                xCrackz
              </h1>
              <p className="text-slate-400">Créez votre compte gratuit</p>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-xl animate-in zoom-in duration-500">
              <div className="mb-6">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Inscription</h2>
                <p className="text-slate-600">Étape {step} sur 4</p>
              </div>

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full mb-6 py-3 px-4 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Chrome className="w-5 h-5 text-red-500" />
                {googleLoading ? 'Connexion...' : 'Continuer avec Google'}
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500 font-bold">OU</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm font-semibold">{error}</p>
                  </div>
                )}

                {/* Étape 1 - Informations personnelles */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-black text-slate-700 mb-2">
                          Prénom <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition"
                            placeholder="Jean"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-black text-slate-700 mb-2">
                          Nom <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition"
                            placeholder="Dupont"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition"
                          placeholder="votre@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition"
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Étape 2 - Entreprise & Adresse */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2">
                        Entreprise <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition"
                          placeholder="Mon Entreprise SARL"
                        />
                      </div>
                    </div>

                    <div>
                      <AddressAutocomplete
                        value={address}
                        onChange={(newAddress) => {
                          setAddress(newAddress);
                          // Extraire ville et code postal de l'adresse
                          const addressParts = newAddress.split(',').map(p => p.trim());
                          if (addressParts.length >= 2) {
                            const lastPart = addressParts[addressParts.length - 1];
                            const postalMatch = lastPart.match(/\b\d{5}\b/);
                            if (postalMatch) {
                              setPostalCode(postalMatch[0]);
                              setCity(lastPart.replace(postalMatch[0], '').trim());
                            } else {
                              setCity(lastPart);
                            }
                          }
                        }}
                        placeholder="Commencez à taper votre adresse..."
                        label="Adresse complète"
                        required
                      />
                    </div>

                    {/* Ville et code postal remplis automatiquement par AddressAutocomplete */}
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <p className="text-sm text-teal-700">
                        <CheckCircle className="w-4 h-4 inline mr-2" />
                        La ville et le code postal sont remplis automatiquement lors de la sélection de l'adresse
                      </p>
                    </div>
                  </div>
                )}

                {/* Étape 3 - Type de compte */}
                {step === 3 && (
                  <div className="space-y-4">
                    <label className="block text-sm font-black text-slate-700 mb-3">
                      Type de compte <span className="text-red-500">*</span>
                    </label>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setUserType('donneur_ordre');
                          setIsDriver(false);
                          setDriverLicenses([]);
                        }}
                        className={`p-5 rounded-xl border-3 transition-all text-left ${
                          userType === 'donneur_ordre'
                            ? 'border-teal-500 bg-teal-50 ring-4 ring-teal-200'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${
                            userType === 'donneur_ordre' ? 'bg-teal-500' : 'bg-slate-200'
                          }`}>
                            <Briefcase className={`w-6 h-6 ${
                              userType === 'donneur_ordre' ? 'text-white' : 'text-slate-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className={`font-black text-lg mb-1 ${
                              userType === 'donneur_ordre' ? 'text-teal-700' : 'text-slate-900'
                            }`}>
                              Donneur d'ordre
                            </div>
                            <div className="text-sm text-slate-600 font-medium">
                              Je crée des missions et gère mon activité
                            </div>
                          </div>
                          {userType === 'donneur_ordre' && (
                            <CheckCircle className="w-6 h-6 text-teal-500 flex-shrink-0" />
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserType('convoyeur');
                          setIsDriver(true);
                        }}
                        className={`p-5 rounded-xl border-3 transition-all text-left ${
                          userType === 'convoyeur'
                            ? 'border-teal-500 bg-teal-50 ring-4 ring-teal-200'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${
                            userType === 'convoyeur' ? 'bg-teal-500' : 'bg-slate-200'
                          }`}>
                            <Truck className={`w-6 h-6 ${
                              userType === 'convoyeur' ? 'text-white' : 'text-slate-600'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className={`font-black text-lg mb-1 ${
                              userType === 'convoyeur' ? 'text-teal-700' : 'text-slate-900'
                            }`}>
                              Convoyeur
                            </div>
                            <div className="text-sm text-slate-600 font-medium">
                              J'effectue des missions de convoyage
                            </div>
                          </div>
                          {userType === 'convoyeur' && (
                            <CheckCircle className="w-6 h-6 text-teal-500 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Permis pour convoyeurs */}
                    {userType === 'convoyeur' && (
                      <div className="mt-6 p-5 bg-teal-50 border-2 border-teal-200 rounded-xl">
                        <label className="block text-sm font-black text-slate-700 mb-3">
                          Permis de conduire <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {['B', 'C', 'CE', 'D'].map((license) => (
                            <button
                              key={license}
                              type="button"
                              onClick={() => {
                                setDriverLicenses(
                                  driverLicenses.includes(license)
                                    ? driverLicenses.filter((l) => l !== license)
                                    : [...driverLicenses, license]
                                );
                              }}
                              className={`py-3 px-4 rounded-lg border-2 font-bold transition-all ${
                                driverLicenses.includes(license)
                                  ? 'border-teal-500 bg-teal-500 text-white'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-teal-300'
                              }`}
                            >
                              Permis {license}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Étape 4 - Mot de passe */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2">
                        Mot de passe <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-12 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* Password Strength */}
                      {password && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-600">Force du mot de passe</span>
                            <span className={`text-xs font-black ${
                              passwordStrength.color === 'green' ? 'text-green-600' :
                              passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {passwordStrength.text}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                passwordStrength.color === 'green' ? 'bg-green-500' :
                                passwordStrength.color === 'yellow' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: passwordStrength.width }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Critères de validation */}
                      <div className="mt-4 space-y-2">
                        {[
                          { key: 'length', text: 'Au moins 8 caractères' },
                          { key: 'uppercase', text: 'Une majuscule (A-Z)' },
                          { key: 'lowercase', text: 'Une minuscule (a-z)' },
                          { key: 'number', text: 'Un chiffre (0-9)' },
                          { key: 'special', text: 'Un caractère spécial (!@#$...)' },
                        ].map((criterion) => (
                          <div key={criterion.key} className="flex items-center gap-2 text-xs">
                            {passwordValidation[criterion.key as keyof typeof passwordValidation] ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-300" />
                            )}
                            <span className={`font-semibold ${
                              passwordValidation[criterion.key as keyof typeof passwordValidation]
                                ? 'text-green-700'
                                : 'text-slate-500'
                            }`}>
                              {criterion.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-black text-slate-700 mb-2">
                        Confirmer le mot de passe <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-12 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="mt-2 text-xs text-red-600 font-semibold flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          Les mots de passe ne correspondent pas
                        </p>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <p className="mt-2 text-xs text-green-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Les mots de passe correspondent
                        </p>
                      )}
                    </div>

                    {/* Conditions d'utilisation */}
                    <div className="pt-4">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={acceptTerms}
                          onChange={(e) => setAcceptTerms(e.target.checked)}
                          className="mt-1 w-5 h-5 rounded border-2 border-slate-300 text-teal-500 focus:ring-4 focus:ring-teal-200"
                        />
                        <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900">
                          J'accepte les{' '}
                          <Link to="/terms" className="text-teal-600 font-bold hover:underline">
                            conditions d'utilisation
                          </Link>
                          {' '}et la{' '}
                          <Link to="/privacy" className="text-teal-600 font-bold hover:underline">
                            politique de confidentialité
                          </Link>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Boutons Navigation */}
                <div className="flex gap-3 pt-4">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep(step - 1);
                        setError('');
                      }}
                      className="flex-1 py-3 px-6 bg-slate-100 text-slate-700 rounded-xl font-black hover:bg-slate-200 transition"
                    >
                      Retour
                    </button>
                  )}
                  
                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-black hover:from-teal-600 hover:to-cyan-600 transition shadow-lg shadow-teal-500/30"
                    >
                      Suivant
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading || !acceptTerms || !isPasswordValid}
                      className="flex-1 py-3 px-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-black hover:from-teal-600 hover:to-cyan-600 transition shadow-lg shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Création...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5" />
                          Créer mon compte
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              {/* Lien connexion */}
              <div className="mt-6 text-center">
                <p className="text-slate-600 font-semibold">
                  Vous avez déjà un compte ?{' '}
                  <Link to="/login" className="text-teal-600 font-black hover:underline">
                    Se connecter
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
