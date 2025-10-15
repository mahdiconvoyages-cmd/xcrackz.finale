import { useEffect, useState } from 'react';
import { 
  ShoppingCart, Zap, Star, Crown, Coins, Sparkles, 
  Users, Package, TrendingUp, Shield, Info, Award, Calendar, 
  Building2, X, Send, CheckCircle, FileText
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ChatAssistant from '../components/ChatAssistant';

// ===== INTERFACES =====
interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  is_popular: boolean;
  is_active: boolean;
  billing_period: 'monthly' | 'annual';
  discount_percent: number;
  free_tracking: boolean;
}

interface UserCredits {
  balance: number;
}

interface QuoteForm {
  company_name: string;
  email: string;
  phone: string;
  expected_volume: string;
  message: string;
}

export default function ShopNew() {
  const { user } = useAuth();
  
  // States
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  
  // Modal Devis
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>({
    company_name: '',
    email: user?.email || '',
    phone: '',
    expected_volume: '',
    message: ''
  });

  useEffect(() => {
    loadData();
  }, [user, billingPeriod]);

  useEffect(() => {
    if (user?.email) {
      setQuoteForm(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadPackages(),
      loadUserCredits(),
    ]);
    setLoading(false);
  };

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('credits_packages')
        .select('*')
        .eq('is_active', true)
        .eq('billing_period', billingPeriod)
        .gte('price', 19.99) // ← Exclure le Starter (< 19.99€)
        .order('price', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const loadUserCredits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newCredits, error: insertError } = await supabase
          .from('user_credits')
          .insert([{ user_id: user.id, balance: 0 }])
          .select()
          .single();

        if (insertError) throw insertError;
        setUserCredits(newCredits);
      } else {
        setUserCredits(data);
      }
    } catch (error) {
      console.error('Error loading user credits:', error);
    }
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user) {
      alert('Vous devez être connecté pour effectuer un achat.');
      return;
    }

    setProcessingPackageId(pkg.id);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: pkg.id,
          user_id: user.id,
          amount: pkg.price,
          credits: pkg.credits,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Payment error:', errorData);
        throw new Error(errorData.error || 'Erreur lors de la création du paiement');
      }

      const data = await response.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Une erreur est survenue lors du paiement:\n${errorMessage}\n\nVeuillez vérifier la configuration Mollie ou contacter le support.`);
    } finally {
      setProcessingPackageId(null);
    }
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('Vous devez être connecté pour demander un devis.');
      return;
    }

    setSubmittingQuote(true);

    try {
      const { error } = await supabase
        .from('shop_quote_requests')
        .insert([{
          user_id: user.id,
          company_name: quoteForm.company_name,
          email: quoteForm.email,
          phone: quoteForm.phone,
          expected_volume: quoteForm.expected_volume,
          message: quoteForm.message,
          status: 'pending'
        }]);

      if (error) throw error;

      setQuoteSuccess(true);
      setTimeout(() => {
        setShowQuoteModal(false);
        setQuoteSuccess(false);
        setQuoteForm({
          company_name: '',
          email: user.email || '',
          phone: '',
          expected_volume: '',
          message: ''
        });
      }, 2000);
    } catch (error) {
      console.error('Error submitting quote request:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const getPackageIcon = (name: string) => {
    if (name.includes('Starter')) return Package;
    if (name.includes('Basic')) return Zap;
    if (name.includes('Pro')) return Star;
    if (name.includes('Business')) return Award;
    if (name.includes('Enterprise')) return Crown;
    return Coins;
  };

  const getPackageColor = (name: string, isPopular: boolean) => {
    if (isPopular) {
      return {
        gradient: 'from-teal-500 to-cyan-500',
        iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-500',
        border: 'border-teal-400 ring-4 ring-teal-100',
        shadow: 'shadow-xl shadow-teal-300/50'
      };
    }
    if (name.includes('Starter')) {
      return {
        gradient: 'from-slate-500 to-slate-600',
        iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
        border: 'border-slate-300',
        shadow: 'shadow-lg shadow-slate-200/50'
      };
    }
    if (name.includes('Basic')) {
      return {
        gradient: 'from-blue-500 to-blue-600',
        iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
        border: 'border-blue-300',
        shadow: 'shadow-lg shadow-blue-200/50'
      };
    }
    if (name.includes('Pro')) {
      return {
        gradient: 'from-orange-500 to-orange-600',
        iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
        border: 'border-orange-300',
        shadow: 'shadow-lg shadow-orange-200/50'
      };
    }
    if (name.includes('Business')) {
      return {
        gradient: 'from-purple-500 to-purple-600',
        iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
        border: 'border-purple-300',
        shadow: 'shadow-lg shadow-purple-200/50'
      };
    }
    return {
      gradient: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      border: 'border-emerald-300',
      shadow: 'shadow-lg shadow-emerald-200/50'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Chargement de la boutique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 pb-20">
      {/* Header avec Clara AI */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
        <div className="absolute top-0 right-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl px-4 sm:px-6 py-2 rounded-full mb-4 sm:mb-6 border border-white/30">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
              <span className="font-semibold text-xs sm:text-sm">Assistant Clara disponible pour vous aider</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 sm:mb-4 drop-shadow-lg px-4">
              Abonnements xCrackz
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-6 sm:mb-8 max-w-xs sm:max-w-lg md:max-w-2xl mx-auto px-4">
              Choisissez votre plan et accédez à toutes les fonctionnalités de la plateforme
            </p>
            
            {/* Info Badge */}
            <div className="inline-flex flex-col sm:flex-row items-center gap-2 bg-teal-500/20 backdrop-blur-xl px-4 sm:px-6 py-3 rounded-2xl border border-teal-300/30 max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto mb-4">
              <Shield className="w-5 h-5 text-teal-200 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-white font-medium text-center sm:text-left">
                <strong className="font-black">Tous les abonnements</strong> donnent accès à toutes les fonctionnalités • 
                Seul le covoiturage consomme des crédits
              </span>
            </div>

            {/* User Credits Display */}
            {userCredits && (
              <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-xl px-6 sm:px-8 py-3 sm:py-4 rounded-2xl border border-white/30 shadow-lg">
                <Coins className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-300" />
                <div className="text-left">
                  <p className="text-xs sm:text-sm text-blue-100 font-medium">Votre solde</p>
                  <p className="text-xl sm:text-2xl font-black">{userCredits.balance.toLocaleString()} crédits</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 -mt-8 relative z-20">
        {/* Toggle Monthly/Annual */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white backdrop-blur-xl p-1.5 sm:p-2 rounded-2xl shadow-xl border border-slate-200">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-xl font-bold text-xs sm:text-sm md:text-base transition-all duration-300 ${
                billingPeriod === 'monthly'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-300/50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-5 h-5 inline-block mr-2" />
              Mensuel
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-8 py-3 rounded-xl font-bold transition-all duration-300 ${
                billingPeriod === 'annual'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-300/50'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-5 h-5 inline-block mr-2" />
              Annuel
            </button>
          </div>
        </div>

        {/* Packages Grid - Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {packages.map((pkg) => {
            const Icon = getPackageIcon(pkg.name);
            const colors = getPackageColor(pkg.name, pkg.is_popular);

            return (
              <div
                key={pkg.id}
                className={`relative backdrop-blur-xl bg-white/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border-2 ${colors.border} ${colors.shadow} hover:scale-105 transition-all duration-300`}
              >
                {/* Popular Badge */}
                {pkg.is_popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-6 py-2 rounded-full font-black text-sm shadow-lg flex items-center gap-2 border-2 border-white">
                      <Star className="w-4 h-4 fill-current" />
                      POPULAIRE
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 ${colors.iconBg} rounded-2xl mb-6 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Package Info */}
                <h3 className="text-2xl font-black text-slate-900 mb-2">{pkg.name}</h3>
                <p className="text-slate-600 mb-6 text-sm leading-relaxed">{pkg.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-5xl font-black bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                      {pkg.price}€
                    </span>
                    <span className="text-slate-500 font-semibold">
                      /{billingPeriod === 'monthly' ? 'mois' : 'an'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-teal-600">
                    {pkg.credits.toLocaleString()} crédits inclus
                  </p>
                </div>

                {/* Features - NOUVEAU */}
                <div className="space-y-3 mb-8">
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 mb-4 border border-teal-200">
                    <p className="text-xs font-black text-teal-700 uppercase tracking-wide mb-2">
                      ✨ Fonctionnalités incluses
                    </p>
                    <p className="text-sm text-slate-700 font-bold">
                      Accès complet à la plateforme
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">
                      <strong className="text-slate-900">Missions illimitées</strong> - 1 crédit/création
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">
                      <strong className="text-slate-900">Inspections gratuites</strong> - Incluses avec chaque mission
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">
                      <strong className="text-slate-900">Tracking GPS</strong> - Suivi en temps réel gratuit
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">
                      <strong className="text-slate-900">Scanner QR</strong> - Scans illimités gratuits
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">
                      <strong className="text-slate-900">Factures & Devis</strong> - Création illimitée gratuite
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">
                      <strong className="text-slate-900">CRM complet</strong> - Gestion clients & contacts
                    </span>
                  </div>
                  
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <div className="flex items-start gap-2 text-sm">
                      <Zap className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 font-medium">
                        <strong className="text-amber-700">Covoiturage</strong> - 2 crédits pour publier, 2 crédits pour réserver
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purchase Button */}
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={processingPackageId === pkg.id}
                  className={`w-full bg-gradient-to-r ${colors.gradient} text-white py-4 rounded-xl font-black text-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                >
                  {processingPackageId === pkg.id ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Acheter maintenant
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Offre Sur Devis Section */}
        <div className="mb-12">
          <div className="backdrop-blur-xl bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white rounded-3xl p-12 shadow-2xl border border-purple-400/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl px-6 py-2 rounded-full mb-6 border border-white/30">
                <Building2 className="w-5 h-5" />
                <span className="font-bold text-sm">Pour les grandes entreprises</span>
              </div>

              <h2 className="text-4xl font-black mb-4">Offre Sur Devis</h2>
              <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
                Besoin d'un volume important de crédits ou de fonctionnalités personnalisées ? 
                Contactez-nous pour obtenir une offre adaptée à vos besoins.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <Users className="w-12 h-12 mx-auto mb-4 text-purple-200" />
                  <h3 className="font-black text-lg mb-2">Volumes importants</h3>
                  <p className="text-purple-100 text-sm">Tarifs dégressifs adaptés</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-purple-200" />
                  <h3 className="font-black text-lg mb-2">Support dédié</h3>
                  <p className="text-purple-100 text-sm">Account manager personnel</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-200" />
                  <h3 className="font-black text-lg mb-2">Fonctionnalités sur mesure</h3>
                  <p className="text-purple-100 text-sm">Solutions personnalisées</p>
                </div>
              </div>

              <button
                onClick={() => setShowQuoteModal(true)}
                className="inline-flex items-center gap-3 bg-white text-purple-700 px-8 py-4 rounded-xl font-black text-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <FileText className="w-6 h-6" />
                Demander un devis gratuit
              </button>
            </div>
          </div>
        </div>

        {/* Feature Costs Table - NOUVELLE VERSION */}
        <div className="backdrop-blur-xl bg-white/90 rounded-3xl p-8 shadow-xl border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Utilisation des Crédits</h2>
              <p className="text-slate-600">Détail de la consommation par fonctionnalité</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Fonctionnalités GRATUITES */}
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border-2 border-teal-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Fonctionnalités Incluses</h3>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-teal-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900">📦 Création de Mission</span>
                    <span className="inline-flex items-center gap-1 bg-teal-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                      <Coins className="w-4 h-4" />
                      1 crédit
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Créez autant de missions que vous le souhaitez
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-teal-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900">✅ Inspection Véhicule</span>
                    <span className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                      GRATUIT
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Incluse avec chaque mission créée par vous ou un tiers
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-teal-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900">📍 Tracking GPS</span>
                    <span className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                      GRATUIT
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Suivi en temps réel pour tous les utilisateurs
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-teal-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900">📱 Scanner QR</span>
                    <span className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                      GRATUIT
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Scans illimités sans consommation de crédits
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-teal-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900">📄 Factures & Devis</span>
                    <span className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                      GRATUIT
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Création et génération PDF illimitées
                  </p>
                </div>
              </div>
            </div>

            {/* Fonctionnalités PAYANTES */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Avec Consommation</h3>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900">🚗 Publication Covoiturage</span>
                    <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                      <Coins className="w-4 h-4" />
                      2 crédits
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Pour publier un trajet de covoiturage
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-amber-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900">🎫 Réservation Covoiturage</span>
                    <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-lg font-bold text-sm">
                      <Coins className="w-4 h-4" />
                      2 crédits
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Pour réserver une place dans un trajet
                  </p>
                </div>

                <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-4 border-2 border-amber-300 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    <span className="font-black text-amber-900 text-sm">À NOTER</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>Toutes les autres fonctionnalités</strong> de la plateforme sont 
                    <strong> entièrement gratuites</strong> du moment que vous avez un abonnement actif 
                    (Basique, Pro, Business ou Entreprise).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Générale */}
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-black text-slate-900 mb-2">Principe Simple</h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Avec <strong>n'importe quel abonnement</strong> (Basique, Pro, Business, Entreprise), 
                  vous avez accès à <strong>toutes les fonctionnalités</strong> de xCrackz. 
                  Les crédits ne sont utilisés que pour la <strong>création de missions (1 crédit)</strong> et 
                  le <strong>covoiturage (2 crédits par action)</strong>. Tout le reste est inclus sans limite !
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {quoteSuccess ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-4">Demande envoyée !</h3>
                <p className="text-slate-600 text-lg">
                  Nous avons bien reçu votre demande de devis. Notre équipe vous contactera dans les plus brefs délais.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-t-3xl relative">
                  <button
                    onClick={() => setShowQuoteModal(false)}
                    className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black">Demande de Devis</h3>
                      <p className="text-purple-100">Obtenez une offre personnalisée</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleQuoteSubmit} className="p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Nom de l'entreprise *
                    </label>
                    <input
                      type="text"
                      required
                      value={quoteForm.company_name}
                      onChange={(e) => setQuoteForm({ ...quoteForm, company_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium"
                      placeholder="Votre entreprise"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={quoteForm.email}
                        onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium"
                        placeholder="contact@entreprise.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-900 mb-2">
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={quoteForm.phone}
                        onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium"
                        placeholder="+33 6 12 34 56 78"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Volume mensuel estimé
                    </label>
                    <input
                      type="text"
                      value={quoteForm.expected_volume}
                      onChange={(e) => setQuoteForm({ ...quoteForm, expected_volume: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium"
                      placeholder="Ex: 10 000 crédits/mois, 500 missions/mois"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Message / Besoins spécifiques *
                    </label>
                    <textarea
                      required
                      value={quoteForm.message}
                      onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium resize-none"
                      placeholder="Décrivez vos besoins, le nombre d'utilisateurs, les fonctionnalités souhaitées..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingQuote}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-xl font-black text-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingQuote ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Envoyer la demande
                      </>
                    )}
                  </button>

                  <p className="text-sm text-slate-500 text-center">
                    Nous vous répondrons dans les 24h ouvrées
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Clara AI Assistant */}
      <ChatAssistant />
    </div>
  );
}
