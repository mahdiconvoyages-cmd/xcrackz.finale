// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UserPlus, Chrome, Mail, Lock, User, Phone, Building,
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
        // @ts-ignore - Supabase generated types may be outdated
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
          // @ts-ignore - Supabase generated types may be outdated
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
    if (step === 2 && (!company || !address)) {
      setError('Veuillez remplir tous les champs obligatoires (entreprise et adresse)');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItMnptMC0ydi0yIDJ6bTAtMnYtMiAyem0wLTJ2LTIgMnptMC0ydi0yIDJ6bTAtMnYtMiAyem0wLTJ2LTIgMnptMC0ydi0yIDJ6bTAtMnYtMiAyem0wLTJ2LTIgMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>

      <div className="w-full max-w-7xl grid lg:grid-cols-[1fr,1.2fr] gap-8 lg:gap-12 relative z-10">
        {/* Left Panel - Branding & Features */}
        <div className="hidden lg:flex flex-col justify-center p-8 lg:p-12 text-white">
          <div className="space-y-10">
            {/* Logo & Headline */}
            <div className="space-y-6 animate-in fade-in slide-in-from-left duration-700">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-sm font-bold text-green-400">Plateforme Active</span>
              </div>
              
              <h1 className="text-6xl lg:text-7xl font-black mb-4">
                <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  xCrackz
                </span>
              </h1>
              
              <div className="space-y-2">
                <p className="text-2xl lg:text-3xl font-bold text-white/90">
                  Rejoignez la communauté
                </p>
                <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                  La solution complète pour gérer vos missions de convoyage en toute simplicité
                </p>
              </div>
            </div>

            {/* Feature Cards */}
            <div className="space-y-4">
              {[
                { 
                  icon: Zap, 
                  title: 'Configuration instantanée', 
                  desc: 'Prêt en moins de 2 minutes',
                  color: 'from-yellow-400 to-orange-500',
                  delay: '200'
                },
                { 
                  icon: Shield, 
                  title: 'Sécurité maximale', 
                  desc: 'Vos données protégées',
                  color: 'from-teal-400 to-cyan-500',
                  delay: '400'
                },
                { 
                  icon: Truck, 
                  title: 'Plateforme complète', 
                  desc: 'Tout ce dont vous avez besoin',
                  color: 'from-blue-400 to-purple-500',
                  delay: '600'
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  style={{ animationDelay: `${feature.delay}ms` }}
                  className="group flex items-center gap-4 p-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 animate-in slide-in-from-left cursor-pointer"
                >
                  <div className={`p-3.5 bg-gradient-to-br ${feature.color} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-white mb-1">{feature.title}</div>
                    <div className="text-sm text-slate-400 font-medium">{feature.desc}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>

            {/* Progress Steps */}
            <div className="mt-12 space-y-3 pt-8 border-t border-white/10">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Votre progression</p>
              {[
                { num: 1, text: 'Informations personnelles', icon: User },
                { num: 2, text: 'Entreprise & Adresse', icon: Building },
                { num: 3, text: 'Type de compte', icon: Briefcase },
                { num: 4, text: 'Sécurité', icon: Lock },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex items-center gap-4 transition-all duration-300 ${
                    step >= s.num ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  <div className="relative">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                        step > s.num
                          ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30'
                          : step === s.num
                          ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white ring-4 ring-teal-500/30 shadow-lg shadow-teal-500/50 scale-110'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {step > s.num ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <s.icon className="w-5 h-5" />
                      )}
                    </div>
                    {s.num < 4 && (
                      <div className={`absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-3 transition-colors ${
                        step > s.num ? 'bg-teal-500' : 'bg-slate-700'
                      }`}></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className={`font-bold text-sm transition-colors ${
                      step >= s.num ? 'text-white' : 'text-slate-500'
                    }`}>
                      {s.text}
                    </span>
                  </div>
                  {step > s.num && (
                    <span className="text-xs font-bold text-teal-400 px-2 py-1 bg-teal-500/20 rounded-lg">
                      ✓ Validé
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex items-center justify-center animate-in slide-in-from-right duration-700">
          <div className="w-full max-w-lg">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8 animate-in fade-in zoom-in duration-500">
              <h1 className="text-5xl font-black mb-3">
                <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  xCrackz
                </span>
              </h1>
              <p className="text-slate-400 text-lg font-semibold">Créez votre compte gratuit</p>
              <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-teal-500/20 rounded-full">
                <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></span>
                <span className="text-sm font-bold text-teal-400">Étape {step}/4</span>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 lg:p-10 animate-in zoom-in duration-500 hover:shadow-3xl transition-shadow">
              {/* Header */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Inscription
                  </h2>
                  <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full shadow-lg">
                    <span className="text-sm font-bold text-white">Étape {step}/4</span>
                  </div>
                </div>
                <p className="text-slate-600 font-medium">
                  {step === 1 && "Commençons par vos informations de base"}
                  {step === 2 && "Parlez-nous de votre entreprise"}
                  {step === 3 && "Quel type de compte souhaitez-vous ?"}
                  {step === 4 && "Sécurisez votre compte"}
                </p>
              </div>

              {/* Google Sign In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full mb-6 py-4 px-6 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
              >
                <Chrome className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
                {googleLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"></div>
                    <span>Connexion...</span>
                  </>
                ) : (
                  <span>Continuer avec Google</span>
                )}
              </button>

              {/* Divider */}
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-slate-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-6 bg-white text-slate-500 font-bold text-sm uppercase tracking-wider">
                    Ou par email
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Alert */}
                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top shadow-lg">
                    <div className="p-2 bg-red-500 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
                    </div>
                    <div className="flex-1">
                      <p className="text-red-900 text-sm font-bold leading-relaxed">{error}</p>
                    </div>
                  </div>
                )}

                {/* Step 1 - Personal Info */}
                {step === 1 && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right duration-500">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="group">
                        <label className="block text-sm font-black text-slate-700 mb-2 group-hover:text-teal-600 transition-colors">
                          Prénom <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                            className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 focus:bg-white transition-all"
                            placeholder="Jean"
                          />
                        </div>
                      </div>

                      <div className="group">
                        <label className="block text-sm font-black text-slate-700 mb-2 group-hover:text-teal-600 transition-colors">
                          Nom <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                            className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 focus:bg-white transition-all"
                            placeholder="Dupont"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-black text-slate-700 mb-2 group-hover:text-teal-600 transition-colors">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 focus:bg-white transition-all"
                          placeholder="votre@email.com"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-black text-slate-700 mb-2 group-hover:text-teal-600 transition-colors">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 focus:bg-white transition-all"
                          placeholder="+33 6 12 34 56 78"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2 - Company & Address */}
                {step === 2 && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right duration-500">
                    <div className="group">
                      <label className="block text-sm font-black text-slate-700 mb-2 group-hover:text-teal-600 transition-colors">
                        Entreprise <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors z-10" />
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50/80 border-2 border-slate-200 rounded-xl text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 focus:bg-white transition-all"
                          placeholder="Mon Entreprise SARL"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-black text-slate-700 mb-2 group-hover:text-teal-600 transition-colors">
                        Adresse complète <span className="text-red-500">*</span>
                      </label>
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
                        label=""
                        required
                      />
                    </div>

                    {/* Info automatique */}
                    <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-teal-500 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-teal-900 mb-1">
                            Adresse intelligente
                          </p>
                          <p className="text-xs text-teal-700">
                            La ville et le code postal sont automatiquement extraits de votre adresse
                          </p>
                          {city && postalCode && (
                            <p className="text-xs text-teal-600 mt-2 font-semibold">
                              📍 {postalCode} {city}
                            </p>
                          )}
                        </div>
                      </div>
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

                {/* Navigation Buttons */}
                <div className="flex gap-4 pt-6">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep(step - 1);
                        setError('');
                      }}
                      className="flex-1 py-4 px-6 bg-slate-100 text-slate-700 rounded-xl font-black hover:bg-slate-200 hover:shadow-lg transition-all group"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        Retour
                      </span>
                    </button>
                  )}
                  
                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 py-4 px-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-black hover:from-teal-600 hover:to-cyan-600 hover:shadow-xl hover:shadow-teal-500/50 transition-all group"
                    >
                      <span className="flex items-center justify-center gap-2">
                        Suivant
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading || !acceptTerms || !isPasswordValid}
                      className="flex-1 py-4 px-6 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-black hover:from-teal-600 hover:to-cyan-600 hover:shadow-xl hover:shadow-teal-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Création...</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span>Créer mon compte</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>

              {/* Login Link */}
              <div className="mt-8 text-center pt-6 border-t-2 border-slate-100">
                <p className="text-slate-600 font-semibold">
                  Vous avez déjà un compte ?{' '}
                  <Link 
                    to="/login" 
                    className="text-transparent bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text font-black hover:underline transition-all"
                  >
                    Se connecter →
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
