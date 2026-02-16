import { useState, useEffect } from 'react';
import { UserCircle, Mail, Save, Camera, Star, Award, MapPin, Phone, Building, Calendar, Shield, TrendingUp, Clock, CheckCircle2, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useSubscription } from '../hooks/useSubscription';
import { compressImage } from '../utils/imageCompression';

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  company_siret: string;
  company_address: string;
  address: string;
  user_type: string;
  rating_average: number;
  rating_count: number;
  is_verified: boolean;
  is_admin: boolean;
  created_at: string;
  avatar_url: string | null;
}

interface UserStats {
  total_missions: number;
  completed_missions: number;
  in_progress_missions: number;
  credits_balance: number;
}

export default function Profile() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    email: user?.email || '',
    phone: '',
    company_name: '',
    company_siret: '',
    company_address: '',
    address: '',
    user_type: 'client',
    rating_average: 0,
    rating_count: 0,
    is_verified: false,
    is_admin: false,
    created_at: '',
    avatar_url: null,
  });
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    total_missions: 0,
    completed_missions: 0,
    in_progress_missions: 0,
    credits_balance: 0,
  });

  useEffect(() => {
    loadProfile();
    loadStats();
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
          email: data.email || user.email || '',
          phone: data.phone || '',
          company_name: data.company_name || '',
          company_siret: data.company_siret || '',
          company_address: data.company_address || '',
          address: data.address || '',
          user_type: data.user_type || 'client',
          rating_average: data.rating_average || 0,
          rating_count: data.rating_count || 0,
          is_verified: data.is_verified || false,
          is_admin: data.is_admin || false,
          created_at: data.created_at || '',
          avatar_url: data.avatar_url || null,
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const [missionsResult, creditsResult] = await Promise.all([
        supabase
          .from('missions')
          .select('status')
          .eq('user_id', user.id),
        supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const missions = missionsResult.data || [];
      const completedMissions = missions.filter(m => m.status === 'completed').length;
      const inProgressMissions = missions.filter(m => m.status === 'in_progress').length;

      setStats({
        total_missions: missions.length,
        completed_missions: completedMissions,
        in_progress_missions: inProgressMissions,
        credits_balance: creditsResult.data?.balance || 0,
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          company_name: profile.company_name,
          company_siret: profile.company_siret,
          company_address: profile.company_address,
          address: profile.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      setSuccess('Profil mis à jour avec succès');
      setTimeout(() => setSuccess(''), 3000);
      loadProfile();
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    setUploading(true);
    setError('');

    try {
      // Supprimer l'ancien avatar s'il existe
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').slice(-2).join('/');
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      // Compress avatar before upload
      const compressed = await compressImage(file, { maxDimension: 400, quality: 0.85 });

      // Upload le nouveau fichier avec upsert pour éviter les conflits
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressed, {
          cacheControl: '3600',
          upsert: true, // Changé à true pour écraser si existe
          contentType: compressed.type
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      console.log('Public URL:', publicUrl);

      // Mettre à jour le profil
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      setSuccess('Photo de profil mise à jour avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setError(err.message || 'Erreur lors de l\'upload de la photo');
    } finally {
      setUploading(false);
    }
  };

  const fullName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.email;

  const initials = profile.first_name && profile.last_name
    ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase()
    : profile.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="animate-in slide-in-from-left duration-500">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          Mon Profil
        </h1>
        <p className="text-slate-600 text-lg">Gérez vos informations et suivez votre activité</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl p-6 shadow-xl text-white animate-in slide-in-from-left duration-700">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div className="w-32 h-32 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-4xl font-bold shadow-2xl border-4 border-white/30 overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                <label
                  htmlFor="avatar-upload"
                  className={`absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full flex items-center justify-center text-teal-600 hover:bg-teal-50 transition shadow-xl hover:scale-110 cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Camera className="w-5 h-5" />
                </label>
              </div>
              <h3 className="text-2xl font-bold mb-1">{fullName}</h3>
              <p className="text-white/80 flex items-center gap-2 text-sm mb-4">
                <Mail className="w-4 h-4" />
                {profile.email}
              </p>

              <div className="flex gap-2 mb-4">
                {profile.is_verified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-xl rounded-full text-xs font-bold border border-white/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Vérifié
                  </span>
                )}
                {profile.is_admin && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 backdrop-blur-xl rounded-full text-xs font-bold border border-white/30">
                    <Shield className="w-3 h-3" />
                    Admin
                  </span>
                )}
              </div>

              <div className="w-full space-y-3">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Crown className="w-5 h-5 text-yellow-300" />
                    <p className="text-sm font-semibold">Plan d'abonnement</p>
                  </div>
                  {subscription.loading ? (
                    <p className="text-lg font-bold text-white/60">Chargement...</p>
                  ) : subscription.hasActiveSubscription ? (
                    <>
                      <p className="text-2xl font-bold uppercase">{subscription.plan || 'Premium'}</p>
                      <p className="text-xs text-white/60 mt-1">
                        {subscription.daysRemaining} jours restants
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">Gratuit</p>
                      <p className="text-xs text-white/60 mt-1">Aucun abonnement actif</p>
                    </>
                  )}
                </div>

                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5" />
                    <p className="text-sm font-semibold">Membre depuis</p>
                  </div>
                  <p className="text-lg font-bold">
                    {new Date(profile.created_at).toLocaleDateString('fr-FR', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-blue-200 rounded-xl p-4 hover:shadow-lg transition animate-in slide-in-from-left duration-700" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.total_missions}</p>
              <p className="text-xs text-slate-600 font-semibold">Missions totales</p>
            </div>

            <div className="bg-white border border-green-200 rounded-xl p-4 hover:shadow-lg transition animate-in slide-in-from-left duration-700" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.completed_missions}</p>
              <p className="text-xs text-slate-600 font-semibold">Complétées</p>
            </div>

            <div className="bg-white border border-amber-200 rounded-xl p-4 hover:shadow-lg transition animate-in slide-in-from-left duration-700" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.in_progress_missions}</p>
              <p className="text-xs text-slate-600 font-semibold">En cours</p>
            </div>

            <div className="bg-white border border-purple-200 rounded-xl p-4 hover:shadow-lg transition animate-in slide-in-from-left duration-700" style={{ animationDelay: '400ms' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Award className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.credits_balance}</p>
              <p className="text-xs text-slate-600 font-semibold">Crédits</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-sm animate-in slide-in-from-right duration-700">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <UserCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Informations personnelles
              </h2>
              <p className="text-sm text-slate-600">Mettez à jour vos informations</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 text-red-700 animate-in slide-in-from-top duration-300 flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 font-bold">!</span>
                </div>
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 text-green-700 animate-in slide-in-from-top duration-300 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <p>{success}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <UserCircle className="w-4 h-4 text-teal-600" />
                  Prénom
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={profile.first_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition hover:border-slate-300"
                  placeholder="Jean"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <UserCircle className="w-4 h-4 text-teal-600" />
                  Nom
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={profile.last_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition hover:border-slate-300"
                  placeholder="Dupont"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 text-slate-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Phone className="w-4 h-4 text-teal-600" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition hover:border-slate-300"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Adresse personnelle
                </label>
                <input
                  type="text"
                  name="address"
                  value={profile.address}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition hover:border-slate-300"
                  placeholder="123 Rue Example, Paris"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Building className="w-4 h-4 text-teal-600" />
                  Entreprise
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={profile.company_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition hover:border-slate-300"
                  placeholder="Mon Entreprise SARL"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <Building className="w-4 h-4 text-teal-600" />
                  SIRET
                </label>
                <input
                  type="text"
                  name="company_siret"
                  value={profile.company_siret}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition hover:border-slate-300"
                  placeholder="123 456 789 00012"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Adresse entreprise
                </label>
                <textarea
                  name="company_address"
                  value={profile.company_address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition hover:border-slate-300 resize-none"
                  placeholder="123 Avenue des Champs, 75008 Paris"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold py-4 rounded-xl hover:shadow-xl hover:shadow-teal-500/30 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-lg"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
