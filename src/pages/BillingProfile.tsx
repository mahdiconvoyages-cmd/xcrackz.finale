/**
 * Profil de Facturation — Page dédiée (style TimeInvoice/Premium)
 * 
 * Champs : Logo, Raison sociale, SIRET, Adresse siège, Code postal, Ville,
 *          Email facturation, IBAN (opt), N° TVA (opt), Conditions de paiement.
 * 
 * Stocké dans la table `profiles` (colonnes existantes + metadata JSON).
 * Requis AVANT d'accéder au CRM / Facturation.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { validationService } from '../services/validationService';
import { Building2, Save, Upload, CheckCircle, AlertCircle, FileText, CreditCard, MapPin, Mail, Hash } from 'lucide-react';

/* PremiumTheme tokens */
const T = {
  primaryBlue: '#0066FF',
  primaryTeal: '#14B8A6',
  accentGreen: '#10B981',
  accentAmber: '#F59E0B',
  accentRed: '#EF4444',
  fieldBg: '#F8FAFC',
  borderDefault: '#E5E7EB',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
};

const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors border focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20";
const inputStyle: React.CSSProperties = { backgroundColor: T.fieldBg, borderColor: T.borderDefault, color: T.textPrimary };
const labelCls = "block text-sm font-medium mb-1.5";

interface BillingData {
  company_name: string;
  company_siret: string;
  billing_address: string;
  billing_postal_code: string;
  billing_city: string;
  billing_email: string;
  iban: string;
  tva_number: string;
  payment_terms: string;
  company_logo_url: string;
}

const PAYMENT_TERMS_OPTIONS = [
  'Paiement à réception',
  'Net 15 jours',
  'Net 30 jours',
  'Net 45 jours',
  'Net 60 jours',
];

export default function BillingProfile() {
  const { user } = useAuth();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [form, setForm] = useState<BillingData>({
    company_name: '',
    company_siret: '',
    billing_address: '',
    billing_postal_code: '',
    billing_city: '',
    billing_email: '',
    iban: '',
    tva_number: '',
    payment_terms: 'Paiement à réception',
    company_logo_url: '',
  });

  useEffect(() => { if (user) loadProfile(); }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();
      if (err) throw err;
      if (data) {
        // Billing fields can be stored as direct columns or in a billing_meta JSONB
        const meta = data.billing_meta || {};
        setForm({
          company_name: data.company_name || '',
          company_siret: data.company_siret || '',
          billing_address: meta.billing_address || data.address || '',
          billing_postal_code: meta.billing_postal_code || '',
          billing_city: meta.billing_city || '',
          billing_email: meta.billing_email || data.email || '',
          iban: meta.iban || '',
          tva_number: meta.tva_number || '',
          payment_terms: meta.payment_terms || 'Paiement à réception',
          company_logo_url: meta.company_logo_url || '',
        });
        if (meta.company_logo_url) setLogoPreview(meta.company_logo_url);
      }
    } catch (e) {
      console.error('Erreur chargement profil:', e);
    } finally { setLoading(false); }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Le logo ne doit pas dépasser 2 MB'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const validate = (): boolean => {
    setError('');
    if (!form.company_name.trim()) { setError('La raison sociale est requise'); return false; }
    if (!form.company_siret.trim()) { setError('Le SIRET est requis'); return false; }
    const siretV = validationService.validateSiretFormat(form.company_siret);
    if (!siretV.isValid) { setError(siretV.error || 'SIRET invalide'); return false; }
    if (!form.billing_address.trim()) { setError("L'adresse est requise"); return false; }
    if (!form.billing_postal_code.trim()) { setError('Le code postal est requis'); return false; }
    if (!form.billing_city.trim()) { setError('La ville est requise'); return false; }
    if (!form.billing_email.trim()) { setError("L'email de facturation est requis"); return false; }
    const emailV = validationService.validateEmail(form.billing_email);
    if (!emailV.isValid) { setError(emailV.error || 'Email invalide'); return false; }
    if (form.iban.trim()) {
      const ibanV = validationService.validateIban(form.iban);
      if (!ibanV.isValid) { setError(ibanV.error || 'IBAN invalide'); return false; }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      let logoUrl = form.company_logo_url;
      if (logoFile) {
        const ext = logoFile.name.split('.').pop();
        const name = `logo_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('avatars').upload(`logos/${name}`, logoFile);
        if (upErr) throw upErr;
        logoUrl = supabase.storage.from('avatars').getPublicUrl(`logos/${name}`).data.publicUrl;
      }

      const billingMeta = {
        billing_address: form.billing_address,
        billing_postal_code: form.billing_postal_code,
        billing_city: form.billing_city,
        billing_email: form.billing_email,
        iban: form.iban,
        tva_number: form.tva_number,
        payment_terms: form.payment_terms,
        company_logo_url: logoUrl,
        billing_profile_complete: true,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          company_name: form.company_name,
          company_siret: form.company_siret.replace(/\s/g, ''),
          address: form.billing_address,
          billing_meta: billingMeta,
        })
        .eq('id', user!.id);
      if (upErr) throw upErr;

      setForm(p => ({ ...p, company_logo_url: logoUrl }));
      setLogoFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erreur lors de la sauvegarde');
    } finally { setSaving(false); }
  };

  const completionPercent = (() => {
    let filled = 0;
    const required = ['company_name', 'company_siret', 'billing_address', 'billing_postal_code', 'billing_city', 'billing_email'] as const;
    required.forEach(k => { if (form[k].trim()) filled++; });
    return Math.round((filled / required.length) * 100);
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: T.textPrimary }}>Profil de Facturation</h1>
            <p className="text-sm" style={{ color: T.textSecondary }}>
              Informations légales pour vos factures et devis
            </p>
          </div>
        </div>

        {/* Completion bar */}
        <div className="mt-4 bg-white rounded-2xl border p-4" style={{ borderColor: T.borderDefault }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: T.textPrimary }}>Complétion du profil</span>
            <span className="text-sm font-bold" style={{ color: completionPercent === 100 ? T.accentGreen : T.primaryBlue }}>
              {completionPercent}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completionPercent}%`,
                backgroundColor: completionPercent === 100 ? T.accentGreen : completionPercent >= 50 ? T.primaryBlue : T.accentAmber,
              }}
            />
          </div>
          {completionPercent < 100 && (
            <p className="text-xs mt-2" style={{ color: T.accentAmber }}>
              ⚠️ Complétez votre profil pour accéder au CRM et à la facturation
            </p>
          )}
          {completionPercent === 100 && (
            <p className="text-xs mt-2" style={{ color: T.accentGreen }}>
              ✓ Profil complet — CRM et facturation débloqués
            </p>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: '#D1FAE5', border: '1px solid #A7F3D0' }}>
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">Profil de facturation enregistré avec succès !</p>
        </div>
      )}

      {/* Form sections */}
      <div className="space-y-6">
        {/* ── Section 1: Identité entreprise ── */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: T.borderDefault }}>
          <div className="flex items-center gap-2 mb-5">
            <Building2 className="w-5 h-5" style={{ color: T.primaryBlue }} />
            <h2 className="text-base font-bold" style={{ color: T.textPrimary }}>Identité entreprise</h2>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-5 mb-6">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center transition-colors hover:border-blue-400"
              style={{ borderColor: T.borderDefault, backgroundColor: T.fieldBg }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Upload className="w-6 h-6" style={{ color: T.textTertiary }} />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
            <div>
              <p className="text-sm font-medium" style={{ color: T.textPrimary }}>Logo entreprise</p>
              <p className="text-xs" style={{ color: T.textTertiary }}>PNG, JPG — max 2 MB. Apparaît sur vos factures.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls} style={{ color: T.textPrimary }}>
                Raison sociale <span className="text-red-500">*</span>
              </label>
              <input
                value={form.company_name}
                onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                placeholder="Ma Société SAS"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelCls} style={{ color: T.textPrimary }}>
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  SIRET <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                value={form.company_siret}
                onChange={e => setForm(p => ({ ...p, company_siret: e.target.value }))}
                placeholder="123 456 789 00012"
                maxLength={17}
                className={inputCls}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: T.textTertiary }}>14 chiffres — vérification automatique</p>
            </div>
          </div>
        </div>

        {/* ── Section 2: Adresse du siège ── */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: T.borderDefault }}>
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="w-5 h-5" style={{ color: T.primaryTeal }} />
            <h2 className="text-base font-bold" style={{ color: T.textPrimary }}>Adresse du siège</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelCls} style={{ color: T.textPrimary }}>
                Adresse <span className="text-red-500">*</span>
              </label>
              <input
                value={form.billing_address}
                onChange={e => setForm(p => ({ ...p, billing_address: e.target.value }))}
                placeholder="123 rue de la Paix"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: T.textPrimary }}>
                  Code postal <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.billing_postal_code}
                  onChange={e => setForm(p => ({ ...p, billing_postal_code: e.target.value }))}
                  placeholder="75001"
                  maxLength={5}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: T.textPrimary }}>
                  Ville <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.billing_city}
                  onChange={e => setForm(p => ({ ...p, billing_city: e.target.value }))}
                  placeholder="Paris"
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 3: Contact facturation ── */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: T.borderDefault }}>
          <div className="flex items-center gap-2 mb-5">
            <Mail className="w-5 h-5" style={{ color: T.accentAmber }} />
            <h2 className="text-base font-bold" style={{ color: T.textPrimary }}>Contact facturation</h2>
          </div>

          <div>
            <label className={labelCls} style={{ color: T.textPrimary }}>
              Email de facturation <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.billing_email}
              onChange={e => setForm(p => ({ ...p, billing_email: e.target.value }))}
              placeholder="facturation@masociete.fr"
              className={inputCls}
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: T.textTertiary }}>
              Adresse email qui apparaîtra sur vos documents
            </p>
          </div>
        </div>

        {/* ── Section 4: Informations bancaires & TVA ── */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: T.borderDefault }}>
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-5 h-5" style={{ color: T.accentGreen }} />
            <h2 className="text-base font-bold" style={{ color: T.textPrimary }}>Bancaire & TVA</h2>
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-100" style={{ color: T.textTertiary }}>Optionnel</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls} style={{ color: T.textPrimary }}>IBAN</label>
              <input
                value={form.iban}
                onChange={e => setForm(p => ({ ...p, iban: e.target.value.toUpperCase() }))}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                className={inputCls}
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: T.textTertiary }}>Apparaîtra sur vos factures</p>
            </div>
            <div>
              <label className={labelCls} style={{ color: T.textPrimary }}>N° TVA intracommunautaire</label>
              <input
                value={form.tva_number}
                onChange={e => setForm(p => ({ ...p, tva_number: e.target.value.toUpperCase() }))}
                placeholder="FR 12 345678901"
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelCls} style={{ color: T.textPrimary }}>Conditions de paiement par défaut</label>
            <select
              value={form.payment_terms}
              onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))}
              className={inputCls + " cursor-pointer"}
              style={inputStyle}
            >
              {PAYMENT_TERMS_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: T.primaryBlue, boxShadow: '0 4px 14px rgba(0,102,255,0.3)' }}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Enregistrer le profil
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if user's billing profile is complete.
 * Used by CRM and Billing pages to gate access.
 */
export function useBillingProfileComplete() {
  const { user } = useAuth();
  const [complete, setComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setComplete(false); setLoading(false); return; }
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('company_name, company_siret, billing_meta')
          .eq('id', user.id)
          .maybeSingle();
        if (!data) { setComplete(false); return; }
        const meta = data.billing_meta || {};
        const isComplete = !!(
          data.company_name?.trim() &&
          data.company_siret?.trim() &&
          meta.billing_address?.trim() &&
          meta.billing_postal_code?.trim() &&
          meta.billing_city?.trim() &&
          meta.billing_email?.trim()
        );
        setComplete(isComplete);
      } catch { setComplete(false); }
      finally { setLoading(false); }
    })();
  }, [user]);

  return { complete, loading };
}
