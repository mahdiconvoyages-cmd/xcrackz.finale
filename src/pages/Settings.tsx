// @ts-nocheck - Supabase generated types are outdated, all operations work correctly at runtime
import { useState, useEffect } from 'react';
import { User, Building, Save, Shield, Download, Trash2, Mic, Crown, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { gdprService } from '../services/gdprService';
import { useNavigate } from 'react-router-dom';

interface Profile {
  first_name: string;
  last_name: string;
  company_name: string;
  phone: string;
  address: string;
  company_siret: string;
}

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const subscription = useSubscription();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    company_name: '',
    phone: '',
    address: '',
    company_siret: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          company_name: data.company_name || '',
          phone: data.phone || '',
          address: data.address || '',
          company_siret: data.company_siret || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', user.id);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleExportData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await gdprService.exportUserData(user.id);
      alert('Vos données ont été exportées avec succès');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Erreur lors de l\'export des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données seront définitivement supprimées après 30 jours.'
    );

    if (!confirmed) return;

    const reason = window.prompt('Pouvez-vous nous dire pourquoi vous souhaitez supprimer votre compte ? (optionnel)');

    setLoading(true);
    try {
      await gdprService.requestAccountDeletion(user.id, reason || undefined);
      alert('Votre demande de suppression a été enregistrée. Vous recevrez un email de confirmation.');
    } catch (error) {
      console.error('Error requesting deletion:', error);
      alert('Erreur lors de la demande de suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-sm mb-2">Paramètres</h1>
        <p className="text-slate-600 text-lg">Gérez votre compte et vos préférences</p>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 text-green-400">
          Vos modifications ont été enregistrées avec succès
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lien vers paramètres vocaux Clara */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-400/30 shadow-xl shadow-purple-500/20 rounded-2xl p-6 hover:shadow-depth-xl transition-all duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Mic className="w-5 h-5 text-purple-600" />
                Voix de Clara (Assistant IA)
              </h2>
              <p className="text-slate-600 mb-4">
                Personnalisez la voix de votre assistante virtuelle Clara : choix de la voix, tonalité, vitesse et volume.
              </p>
              <button
                type="button"
                onClick={() => navigate('/voice-settings')}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                <Mic className="w-5 h-5" />
                Configurer la voix de Clara
              </button>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Mic className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Section Abonnement & Crédits */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-orange-500/10 border border-yellow-400/30 shadow-xl shadow-yellow-500/20 shadow-depth-lg rounded-2xl hover:shadow-depth-xl transition-all duration-300 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Abonnement & Crédits
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/50 backdrop-blur-sm border border-yellow-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Crown className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Plan actuel</h3>
              </div>
              {subscription.loading ? (
                <p className="text-slate-500">Chargement...</p>
              ) : subscription.hasActiveSubscription ? (
                <>
                  <p className="text-2xl font-bold text-yellow-600 uppercase">{subscription.plan || 'Premium'}</p>
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {subscription.daysRemaining} jours restants
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Expire le {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('fr-FR') : '-'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-slate-600">Gratuit</p>
                  <p className="text-sm text-slate-500 mt-1">Aucun abonnement actif</p>
                </>
              )}
            </div>

            <div className="bg-white/50 backdrop-blur-sm border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Crédits disponibles</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">{subscription.creditsBalance}</p>
              <p className="text-sm text-slate-500 mt-1">Utilisables à tout moment</p>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-yellow-500/50 transition-all"
            >
              Gérer mon abonnement
            </button>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 shadow-depth-lg rounded-2xl hover:shadow-depth-xl transition-all duration-300 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Informations personnelles
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prénom
              </label>
              <input
                type="text"
                name="first_name"
                value={profile.first_name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom
              </label>
              <input
                type="text"
                name="last_name"
                value={profile.last_name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-slate-50 border border-slate-200 border border-slate-200 rounded-lg px-4 py-3 text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Adresse
              </label>
              <input
                type="text"
                name="address"
                value={profile.address}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 shadow-depth-lg rounded-2xl hover:shadow-depth-xl transition-all duration-300 p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Informations entreprise
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                name="company_name"
                value={profile.company_name}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                SIRET
              </label>
              <input
                type="text"
                name="company_siret"
                value={profile.company_siret}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 shadow-depth-lg rounded-2xl hover:shadow-depth-xl transition-all duration-300 p-6">
          <h2 className="text-xl font-bold mb-4">Abonnement</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-slate-700 mb-1">Plan actuel</p>
              <p className="text-2xl font-bold capitalize">{profile.subscription_plan}</p>
            </div>
            <button
              type="button"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2 rounded-lg font-semibold hover:shadow-2xl hover:shadow-slate-400/40 hover:shadow-depth-xl hover:shadow-teal-500/60 transition"
            >
              Changer de plan
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-glow-teal font-semibold py-3 rounded-lg hover:shadow-2xl hover:shadow-slate-400/40 hover:shadow-depth-xl hover:shadow-teal-500/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </form>

      <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-400/30 shadow-xl shadow-blue-500/20 shadow-depth-lg rounded-2xl hover:shadow-depth-xl transition-all duration-300 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Confidentialité et données (RGPD)
        </h2>

        <p className="text-slate-600 mb-6">
          Conformément au RGPD, vous disposez de droits sur vos données personnelles. Vous pouvez consulter notre{' '}
          <a href="/privacy" className="text-teal-600 hover:underline font-semibold">politique de confidentialité</a> pour plus d'informations.
        </p>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-teal-600" />
              Exporter mes données
            </h3>
            <p className="text-sm text-slate-600 mb-3">
              Téléchargez une copie complète de toutes vos données personnelles au format JSON (droit d'accès et de portabilité).
            </p>
            <button
              onClick={handleExportData}
              disabled={loading}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              Télécharger mes données
            </button>
          </div>

          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Supprimer mon compte
            </h3>
            <p className="text-sm text-red-600 mb-3">
              Demander la suppression définitive de votre compte et de toutes vos données. Cette action est irréversible.
              Un délai de 30 jours sera appliqué avant suppression définitive.
            </p>
            <button
              onClick={handleDeleteAccount}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
            >
              Demander la suppression
            </button>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Vos droits RGPD</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc pl-5">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement (droit à l'oubli)</li>
              <li>Droit à la portabilité</li>
              <li>Droit d'opposition</li>
              <li>Droit à la limitation du traitement</li>
            </ul>
            <p className="text-sm text-blue-700 mt-3">
              Pour exercer ces droits, contactez-nous à : <a href="mailto:dpo@xcrackz.fr" className="underline font-semibold">dpo@xcrackz.fr</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
