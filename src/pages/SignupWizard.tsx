/**
 * Inscription simplifiee - 4 etapes rapides
 * 1. Type (Entreprise / Convoyeur)
 * 2. Infos personnelles + photo
 * 3. Email + mot de passe
 * 4. Resume + CGU
 * 
 * Le profil de facturation (SIRET, adresse, IBAN...) est rempli APRES
 * depuis la page dediee /billing-profile avant d'acceder au CRM.
 */

import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { validationService } from '../services/validationService';
import { fraudPreventionService } from '../services/fraudPreventionService';

/* -- PremiumTheme tokens -- */
const T = {
  primaryBlue: '#0066FF',
  primaryIndigo: '#5B8DEF',
  primaryPurple: '#8B7EE8',
  primaryTeal: '#14B8A6',
  accentGreen: '#10B981',
  accentAmber: '#F59E0B',
  accentRed: '#EF4444',
  lightBg: '#F8F9FA',
  fieldBg: '#F8FAFC',
  borderDefault: '#E5E7EB',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
};

const inputCls = "w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-colors border focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20";
const inputStyle: React.CSSProperties = { backgroundColor: T.fieldBg, borderColor: T.borderDefault, color: T.textPrimary };

/* -- Steps config -- */
const STEPS = [
  { label: 'Profil', color: T.primaryTeal },
  { label: 'Identite', color: T.primaryBlue },
  { label: 'Compte', color: T.primaryPurple },
  { label: 'Confirmer', color: T.accentGreen },
];

interface SignupData {
  userType: 'company' | 'driver' | '';
  fullName: string;
  avatarFile: File | null;
  avatarUrl: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export default function SignupWizard() {
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<SignupData>({
    userType: '',
    fullName: '',
    avatarFile: null,
    avatarUrl: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });

  /* -- Validation per step -- */
  const validateStep = async (): Promise<boolean> => {
    setError('');
    switch (step) {
      case 0:
        if (!form.userType) { setError('Choisissez votre type de compte'); return false; }
        return true;
      case 1:
        if (!form.fullName.trim() || form.fullName.length < 3) {
          setError('Le nom complet est requis (3 caracteres minimum)');
          return false;
        }
        return true;
      case 2: {
        const emailV = validationService.validateEmail(form.email);
        if (!emailV.isValid) { setError(emailV.error || 'Email invalide'); return false; }
        const emailAvail = await validationService.checkEmailAvailability(form.email);
        if (!emailAvail.isValid) { setError(emailAvail.error || 'Email deja utilise'); return false; }
        if (form.phone && form.phone.trim()) {
          const phoneV = validationService.validatePhone(form.phone);
          if (!phoneV.isValid) { setError(phoneV.error || 'Telephone invalide'); return false; }
        }
        if (form.password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caracteres'); return false; }
        if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas'); return false; }
        const ps = validationService.evaluatePasswordStrength(form.password);
        if (ps.level === 'weak') { setError('Mot de passe trop faible. ' + ps.suggestions[0]); return false; }
        return true;
      }
      case 3:
        if (!form.acceptedTerms) { setError('Acceptez les conditions pour continuer'); return false; }
        return true;
      default: return true;
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      const ok = await validateStep();
      if (ok && step < 3) setStep(s => s + 1);
      else if (ok && step === 3) await handleSubmit();
    } finally { setLoading(false); }
  };

  const handleBack = () => step > 0 && setStep(s => s - 1);

  /* -- Avatar -- */
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("L'image ne doit pas depasser 5 MB"); return; }
    setForm(p => ({ ...p, avatarFile: file, avatarUrl: URL.createObjectURL(file) }));
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const name = `${Math.random().toString(36).substring(2)}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(`${path}/${name}`, file);
    if (error) throw error;
    return supabase.storage.from('avatars').getPublicUrl(`${path}/${name}`).data.publicUrl;
  };

  /* -- Submit -- */
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      let avatarUrl = '';
      if (form.avatarFile) avatarUrl = await uploadImage(form.avatarFile, 'avatars');

      const deviceFingerprint = await fraudPreventionService.generateDeviceFingerprint();
      const ipAddress = await fraudPreventionService.getUserIpAddress();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            phone: form.phone || null,
            user_type: form.userType,
            avatar_url: avatarUrl || null,
            device_fingerprint: deviceFingerprint,
            registration_ip: ipAddress,
            app_role: form.userType === 'company' ? 'donneur_d_ordre' : 'convoyeur',
          }
        }
      });
      if (authError) throw authError;

      // Log signup
      await fraudPreventionService.logSignupAttempt({
        email: form.email, phone: form.phone, deviceFingerprint, ipAddress,
        userAgent: navigator.userAgent, stepReached: 4, success: true,
      });

      // Welcome gift: 10 credits
      if (authData?.user?.id) {
        try {
          const end = new Date();
          end.setDate(end.getDate() + 30);
          await supabase.from('subscriptions').insert({
            user_id: authData.user.id, plan: 'free', status: 'active',
            start_date: new Date().toISOString(), end_date: end.toISOString(),
            credits_remaining: 10, auto_renew: false,
          });
          await supabase.from('user_credits').upsert(
            { user_id: authData.user.id, balance: 10, lifetime_earned: 10, lifetime_spent: 0 },
            { onConflict: 'user_id' }
          );
          await supabase.from('credit_transactions').insert({
            user_id: authData.user.id, amount: 10, transaction_type: 'addition',
            description: 'Cadeau de bienvenue - 10 credits offerts (30 jours)',
          });
        } catch (e) { console.error('Erreur cadeau bienvenue:', e); }
      }

      alert('Inscription reussie ! Verifiez votre email pour activer votre compte.\n\nCadeau de bienvenue : 10 credits offerts pendant 30 jours !');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors de l'inscription");
      const fp = await fraudPreventionService.generateDeviceFingerprint();
      const ip = await fraudPreventionService.getUserIpAddress();
      await fraudPreventionService.logSignupAttempt({
        email: form.email, phone: form.phone, deviceFingerprint: fp, ipAddress: ip,
        userAgent: navigator.userAgent, stepReached: step + 1, success: false, failureReason: err.message,
      });
    } finally { setLoading(false); }
  };

  /* ================================
     RENDER STEPS
     ================================ */

  const renderStep0 = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-center mb-2" style={{ color: T.textPrimary }}>
        Quel est votre profil ?
      </h2>
      <p className="text-sm text-center mb-8" style={{ color: T.textSecondary }}>
        Choisissez pour une experience adaptee
      </p>

      <div className="space-y-4 max-w-md mx-auto">
        {/* Entreprise */}
        <button
          type="button"
          onClick={() => { setForm(p => ({ ...p, userType: 'company' })); setTimeout(() => setStep(1), 200); }}
          className={`w-full p-5 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
            form.userType === 'company' ? 'border-[#0066FF] bg-blue-50/50 shadow-lg shadow-blue-500/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-md bg-white'
          }`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-base" style={{ color: T.textPrimary }}>Entreprise</p>
            <p className="text-sm" style={{ color: T.textSecondary }}>Societe de transport, donneur d'ordre</p>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            form.userType === 'company' ? 'border-[#0066FF] bg-[#0066FF]' : 'border-slate-300'
          }`}>
            {form.userType === 'company' && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>

        {/* Convoyeur */}
        <button
          type="button"
          onClick={() => { setForm(p => ({ ...p, userType: 'driver' })); setTimeout(() => setStep(1), 200); }}
          className={`w-full p-5 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${
            form.userType === 'driver' ? 'border-[#14B8A6] bg-teal-50/50 shadow-lg shadow-teal-500/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-md bg-white'
          }`}
        >
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-base" style={{ color: T.textPrimary }}>Convoyeur</p>
            <p className="text-sm" style={{ color: T.textSecondary }}>Chauffeur independant, auto-entrepreneur</p>
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            form.userType === 'driver' ? 'border-[#14B8A6] bg-[#14B8A6]' : 'border-slate-300'
          }`}>
            {form.userType === 'driver' && (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </button>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-center mb-2" style={{ color: T.textPrimary }}>
        Informations personnelles
      </h2>
      <p className="text-sm text-center mb-8" style={{ color: T.textSecondary }}>
        Parlez-nous un peu de vous
      </p>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <button type="button" onClick={() => avatarInputRef.current?.click()} className="relative group">
          <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-teal-500 shadow-lg shadow-teal-500/20">
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {form.fullName?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        <p className="text-xs mt-2" style={{ color: T.textTertiary }}>Cliquez pour ajouter une photo (optionnel)</p>
      </div>

      {/* Full name */}
      <div className="max-w-md mx-auto">
        <label className="block text-sm font-medium mb-1.5" style={{ color: T.textPrimary }}>
          Nom complet <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.fullName}
          onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
          placeholder="Jean Dupont"
          className={inputCls}
          style={inputStyle}
          autoFocus
        />
      </div>
    </div>
  );

  const renderStep2 = () => {
    const ps = form.password ? validationService.evaluatePasswordStrength(form.password) : null;
    return (
      <div className="py-6">
        <h2 className="text-2xl font-bold text-center mb-2" style={{ color: T.textPrimary }}>
          Creez votre compte
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: T.textSecondary }}>
          Vos identifiants de connexion
        </p>

        <div className="max-w-md mx-auto space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: T.textPrimary }}>
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="jean@entreprise.fr"
              className={inputCls}
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: T.textPrimary }}>
              Telephone <span className="text-xs font-normal" style={{ color: T.textTertiary }}>(optionnel)</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="06 12 34 56 78"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: T.textPrimary }}>
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Minimum 6 caracteres"
                className={inputCls + " pr-12"}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
              >
                <svg className="w-5 h-5" style={{ color: T.textTertiary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {/* Strength indicator */}
            {ps && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full overflow-hidden bg-slate-200">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${ps.score}%`,
                      backgroundColor: ps.level === 'weak' ? T.accentRed : ps.level === 'medium' ? T.accentAmber : T.accentGreen,
                    }}
                  />
                </div>
                <p className="text-xs mt-1" style={{
                  color: ps.level === 'weak' ? T.accentRed : ps.level === 'medium' ? T.accentAmber : T.accentGreen,
                }}>
                  {ps.level === 'weak' ? 'Faible' : ps.level === 'medium' ? 'Moyen' : 'Fort'}
                  {ps.suggestions.length > 0 && ` - ${ps.suggestions[0]}`}
                </p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: T.textPrimary }}>
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="Retapez le mot de passe"
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="py-6">
      <h2 className="text-2xl font-bold text-center mb-2" style={{ color: T.textPrimary }}>
        Recapitulatif
      </h2>
      <p className="text-sm text-center mb-6" style={{ color: T.textSecondary }}>
        Verifiez vos informations
      </p>

      <div className="max-w-md mx-auto">
        {/* Summary card */}
        <div className="rounded-2xl bg-white border p-5 mb-6 space-y-4" style={{ borderColor: T.borderDefault }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-teal-500 flex-shrink-0">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{form.fullName[0]?.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div>
              <p className="font-bold" style={{ color: T.textPrimary }}>{form.fullName}</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                backgroundColor: form.userType === 'company' ? '#DBEAFE' : '#D1FAE5',
                color: form.userType === 'company' ? '#1E40AF' : '#065F46',
              }}>
                {form.userType === 'company' ? 'Entreprise' : 'Convoyeur'}
              </span>
            </div>
          </div>

          <div className="h-px" style={{ backgroundColor: T.borderDefault }} />

          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 flex-shrink-0" style={{ color: T.textTertiary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm" style={{ color: T.textPrimary }}>{form.email}</span>
            </div>
            {form.phone && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: T.textTertiary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-sm" style={{ color: T.textPrimary }}>{form.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Welcome gift */}
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-3" style={{ backgroundColor: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <span className="text-2xl">&#127873;</span>
          <div>
            <p className="text-sm font-bold" style={{ color: '#92400E' }}>Cadeau de bienvenue</p>
            <p className="text-xs" style={{ color: '#B45309' }}>10 credits offerts pendant 30 jours</p>
          </div>
        </div>

        {/* Info: profil facturation */}
        <div className="rounded-2xl p-4 mb-6 flex items-start gap-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#2563EB' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs" style={{ color: '#1E40AF' }}>
            Vous pourrez completer votre <strong>profil de facturation</strong> (SIRET, adresse, IBAN...)
            depuis votre espace pour acceder au CRM et a la facturation.
          </p>
        </div>

        {/* CGU checkbox */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={e => setForm(p => ({ ...p, acceptedTerms: e.target.checked }))}
            className="w-5 h-5 rounded mt-0.5 accent-teal-500"
          />
          <span className="text-sm" style={{ color: T.textSecondary }}>
            J'accepte les{' '}
            <Link to="/terms" target="_blank" className="underline font-semibold" style={{ color: T.primaryBlue }}>
              conditions d'utilisation
            </Link>{' '}
            et la{' '}
            <Link to="/privacy" target="_blank" className="underline font-semibold" style={{ color: T.primaryBlue }}>
              politique de confidentialite
            </Link>
          </span>
        </label>
      </div>
    </div>
  );

  /* ================================
     MAIN RENDER
     ================================ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white/[0.98] backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center gap-3">
          {step > 0 ? (
            <button onClick={handleBack} className="p-2 rounded-xl hover:bg-slate-100 transition">
              <svg className="w-5 h-5" style={{ color: T.textSecondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <button onClick={() => navigate('/login')} className="p-2 rounded-xl hover:bg-slate-100 transition">
              <svg className="w-5 h-5" style={{ color: T.textSecondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: T.textPrimary }}>Creer un compte</h1>
            <p className="text-xs" style={{ color: T.textSecondary }}>Etape {step + 1} sur {STEPS.length}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4 flex gap-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1">
              <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: T.borderDefault }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: i < step ? '100%' : i === step ? '50%' : '0%',
                    backgroundColor: i <= step ? s.color : T.borderDefault,
                    opacity: i === step ? 0.6 : 1,
                  }}
                />
              </div>
              <p className="text-[10px] font-medium text-center mt-1.5" style={{ color: i <= step ? s.color : T.textTertiary }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Step content */}
        <div className="px-6 min-h-[360px]">
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Bottom button */}
        {step > 0 && (
          <div className="px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={handleNext}
              disabled={loading || (step === 3 && !form.acceptedTerms)}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{
                backgroundColor: step === 3 ? T.accentGreen : T.primaryBlue,
                boxShadow: `0 4px 14px ${step === 3 ? T.accentGreen : T.primaryBlue}40`,
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {step === 3 ? 'Creation en cours...' : 'Verification...'}
                </>
              ) : step === 3 ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Creer mon compte
                </>
              ) : (
                <>
                  Continuer
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}

        {/* Login link */}
        {step === 0 && (
          <div className="px-6 pb-6">
            <p className="text-center text-sm" style={{ color: T.textSecondary }}>
              Deja un compte ?{' '}
              <Link to="/login" className="font-bold" style={{ color: T.primaryBlue }}>Se connecter</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}