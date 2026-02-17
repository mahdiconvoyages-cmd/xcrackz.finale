import { useState, useEffect } from 'react';
import { Building2, Save, X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CompanyProfile {
  company_name: string;
  legal_form: string;
  capital_social: number | null;
  siret: string;
  rcs_city: string;
  tva_number: string;
  phone: string;
  address: string;
  tva_applicable: boolean;
  tva_regime: string;
  payment_conditions: string;
  late_penalty_rate: number;
  recovery_fee: number;
  discount_early_payment: string;
  insurance_name: string;
  insurance_address: string;
  insurance_coverage: string;
}

export default function CompanyProfileForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState<CompanyProfile>({
    company_name: '',
    legal_form: 'SARL',
    capital_social: null,
    siret: '',
    rcs_city: '',
    tva_number: '',
    phone: '',
    address: '',
    tva_applicable: true,
    tva_regime: 'normal',
    payment_conditions: '30 jours fin de mois',
    late_penalty_rate: 10,
    recovery_fee: 40,
    discount_early_payment: '',
    insurance_name: '',
    insurance_address: '',
    insurance_coverage: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (data) {
      setFormData({
        company_name: data.company_name || '',
        legal_form: data.legal_form || 'SARL',
        capital_social: data.capital_social || null,
        siret: data.company_siret || '',
        rcs_city: data.rcs_city || '',
        tva_number: data.tva_number || '',
        phone: data.phone || '',
        address: data.address || '',
        tva_applicable: data.tva_applicable ?? true,
        tva_regime: data.tva_regime || 'normal',
        payment_conditions: data.payment_conditions || '30 jours fin de mois',
        late_penalty_rate: data.late_penalty_rate || 10,
        recovery_fee: data.recovery_fee || 40,
        discount_early_payment: data.discount_early_payment || '',
        insurance_name: data.insurance_name || '',
        insurance_address: data.insurance_address || '',
        insurance_coverage: data.insurance_coverage || '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setSaved(false);

    try {
      const { siret, ...restFormData } = formData;
      const { error } = await supabase
        .from('profiles')
        .update({
          ...restFormData,
          company_siret: siret,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleLegalFormChange = (newForm: string) => {
    const updated = { ...formData, legal_form: newForm };
    
    // Auto-configure TVA based on legal form
    if (newForm === 'Auto-entrepreneur') {
      updated.tva_applicable = false;
      updated.tva_regime = 'auto-entrepreneur';
      updated.capital_social = null;
      updated.rcs_city = '';
    } else if (newForm === 'EI') {
      updated.capital_social = null;
      updated.rcs_city = '';
    }
    
    setFormData(updated);
  };

  const needsCapitalSocial = ['SAS', 'SASU', 'SARL', 'EURL', 'SA', 'SNC'].includes(formData.legal_form);
  const needsRCS = !['Auto-entrepreneur', 'EI'].includes(formData.legal_form);
  const isMicro = formData.legal_form === 'Auto-entrepreneur';

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
          <Building2 className="w-7 h-7 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Profil Entreprise</h2>
          <p className="text-slate-600 text-sm">Informations légales pour vos factures</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Informations de base */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold">1</span>
            </div>
            Informations de base
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Ma Société SARL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Forme juridique *
              </label>
              <select
                value={formData.legal_form}
                onChange={(e) => handleLegalFormChange(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="SARL">SARL</option>
                <option value="SAS">SAS</option>
                <option value="EURL">EURL</option>
                <option value="SASU">SASU</option>
                <option value="EI">EI (Entreprise Individuelle)</option>
                <option value="Auto-entrepreneur">Auto-entrepreneur / Micro-entreprise</option>
                <option value="SA">SA</option>
                <option value="SNC">SNC</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SIRET *
              </label>
              <input
                type="text"
                required
                value={formData.siret}
                onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="123 456 789 00000"
                maxLength={14}
              />
              <p className="text-xs text-slate-500 mt-1">14 chiffres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Ville RCS
                {!needsRCS && <span className="text-xs text-slate-400 ml-1">(non requis)</span>}
              </label>
              <input
                type="text"
                value={formData.rcs_city}
                onChange={(e) => setFormData({ ...formData, rcs_city: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Paris"
                disabled={!needsRCS}
              />
              {!needsRCS && <p className="text-xs text-amber-600 mt-1">Non applicable pour {isMicro ? 'micro-entrepreneur' : 'EI'}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Capital social (€)
                {needsCapitalSocial && <span className="text-xs text-red-500 ml-1">*obligatoire</span>}
                {!needsCapitalSocial && <span className="text-xs text-slate-400 ml-1">(non requis)</span>}
              </label>
              <input
                type="number"
                value={formData.capital_social || ''}
                onChange={(e) => setFormData({ ...formData, capital_social: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="10000"
                disabled={!needsCapitalSocial}
              />
              {!needsCapitalSocial && <p className="text-xs text-slate-400 mt-1">Pas de capital social pour {isMicro ? 'micro-entrepreneur' : 'EI'}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Numéro TVA intracommunautaire
              </label>
              <input
                type="text"
                value={formData.tva_number}
                onChange={(e) => setFormData({ ...formData, tva_number: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="FR12345678901"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Téléphone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="06 12 34 56 78"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adresse complète *
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                rows={2}
                placeholder="12 Rue de la République&#10;75001 Paris"
              />
            </div>
          </div>
        </div>

        {/* Configuration TVA */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <span className="text-emerald-600 font-bold">2</span>
            </div>
            Configuration TVA
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                checked={formData.tva_applicable}
                onChange={(e) => setFormData({ ...formData, tva_applicable: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={isMicro}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  TVA applicable
                </label>
                <p className="text-xs text-slate-500">
                  {isMicro 
                    ? 'TVA non applicable (Art. 293 B CGI) - Micro-entrepreneur' 
                    : 'Décocher si franchise en base de TVA'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Régime TVA
              </label>
              <select
                value={formData.tva_regime}
                onChange={(e) => setFormData({ ...formData, tva_regime: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                <option value="normal">Régime normal</option>
                <option value="franchise">Franchise en base</option>
                <option value="auto-entrepreneur">Auto-entrepreneur</option>
              </select>
            </div>
          </div>
        </div>

        {/* Conditions de paiement */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 font-bold">3</span>
            </div>
            Conditions de paiement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Conditions de règlement
              </label>
              <input
                type="text"
                value={formData.payment_conditions}
                onChange={(e) => setFormData({ ...formData, payment_conditions: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="30 jours fin de mois"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Taux de pénalités de retard (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.late_penalty_rate}
                onChange={(e) => setFormData({ ...formData, late_penalty_rate: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <p className="text-xs text-slate-500 mt-1">Légal : 3x le taux d'intérêt légal</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Indemnité forfaitaire de recouvrement (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.recovery_fee}
                onChange={(e) => setFormData({ ...formData, recovery_fee: Number(e.target.value) })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <p className="text-xs text-slate-500 mt-1">Légal : 40€ minimum</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Escompte pour paiement anticipé (optionnel)
              </label>
              <input
                type="text"
                value={formData.discount_early_payment}
                onChange={(e) => setFormData({ ...formData, discount_early_payment: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="2% à 8 jours"
              />
            </div>
          </div>
        </div>

        {/* Assurance (optionnel) */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold">4</span>
            </div>
            Assurance professionnelle (optionnel)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom de l'assureur
              </label>
              <input
                type="text"
                value={formData.insurance_name}
                onChange={(e) => setFormData({ ...formData, insurance_name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Allianz, AXA, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Couverture géographique
              </label>
              <input
                type="text"
                value={formData.insurance_coverage}
                onChange={(e) => setFormData({ ...formData, insurance_coverage: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="France / UE / Monde"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adresse de l'assureur
              </label>
              <input
                type="text"
                value={formData.insurance_address}
                onChange={(e) => setFormData({ ...formData, insurance_address: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="1 Cours du Triangle, 92800 Puteaux"
              />
            </div>
          </div>
        </div>

        {/* Boutons */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
          {saved && (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold">
              <CheckCircle className="w-5 h-5" />
              Enregistré !
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Prévisualisation mentions légales */}
      <div className="mt-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
        <h4 className="font-semibold text-slate-800 mb-3">Aperçu des mentions légales sur vos factures :</h4>
        <div className="text-xs text-slate-600 space-y-1 font-mono">
          <p className="font-semibold">
            {formData.company_name || '[Nom entreprise]'}
            {needsRCS && formData.legal_form ? ` (${formData.legal_form})` : ''}
          </p>
          {(isMicro || formData.legal_form === 'EI') && (
            <p className="italic">Entrepreneur individuel</p>
          )}
          {formData.siret && <p>SIRET : {formData.siret}</p>}
          {needsCapitalSocial && formData.capital_social && (
            <p>Capital social : {formData.capital_social.toLocaleString('fr-FR')} EUR</p>
          )}
          {needsRCS && formData.rcs_city && (
            <p>RCS {formData.rcs_city}{formData.siret ? ` ${formData.siret.substring(0, 9)}` : ''}</p>
          )}
          {formData.tva_applicable && formData.tva_number && <p>TVA : {formData.tva_number}</p>}
          {formData.address && <p className="mt-2">{formData.address}</p>}
          {formData.phone && <p>Tel : {formData.phone}</p>}

          {!formData.tva_applicable && (
            <p className="mt-2 italic text-amber-700 font-semibold">TVA non applicable - Article 293 B du Code general des impots</p>
          )}

          <p className="mt-3 font-semibold">CONDITIONS DE PAIEMENT</p>
          <p>{formData.payment_conditions}</p>
          {formData.discount_early_payment && <p>Escompte : {formData.discount_early_payment}</p>}

          <p className="mt-2">Penalites de retard : {formData.late_penalty_rate}% par an</p>
          <p>Indemnite forfaitaire pour frais de recouvrement : {formData.recovery_fee} EUR</p>

          {formData.insurance_name && (
            <>
              <p className="mt-3 font-semibold">ASSURANCE</p>
              <p>{formData.insurance_name}</p>
              {formData.insurance_address && <p>{formData.insurance_address}</p>}
              {formData.insurance_coverage && <p>Couverture : {formData.insurance_coverage}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
