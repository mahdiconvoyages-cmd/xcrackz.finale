import { useEffect, useState } from 'react';
import { ShoppingCart, Zap, Star, Crown, Check, CreditCard, Coins, Sparkles, Users, Package, TrendingUp, Shield, Info, Rocket, Award, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';

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

interface FeatureCost {
  feature_name: string;
  feature_key: string;
  description: string;
  credit_cost: number;
  free_from_plan: string | null;
}

interface UserCredits {
  balance: number;
}

export default function Shop() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [featureCosts, setFeatureCosts] = useState<FeatureCost[]>([]);
  const [userCredits, setUserCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    loadData();
  }, [user, billingPeriod]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadPackages(),
      loadFeatureCosts(),
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
        .order('price', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const loadFeatureCosts = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_costs')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      setFeatureCosts(data || []);
    } catch (error) {
      console.error('Error loading feature costs:', error);
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
        shadow: 'shadow-lg shadow-teal-300/50'
      };
    }
    if (name.includes('Starter')) {
      return {
        gradient: 'from-slate-500 to-slate-600',
        iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
        border: 'border-slate-300',
        shadow: 'shadow-slate-200/50'
      };
    }
    if (name.includes('Basic')) {
      return {
        gradient: 'from-blue-500 to-blue-600',
        iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
        border: 'border-blue-300',
        shadow: 'shadow-blue-200/50'
      };
    }
    if (name.includes('Pro')) {
      return {
        gradient: 'from-orange-500 to-orange-600',
        iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
        border: 'border-orange-300',
        shadow: 'shadow-orange-200/50'
      };
    }
    if (name.includes('Business')) {
      return {
        gradient: 'from-green-500 to-green-600',
        iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
        border: 'border-green-300',
        shadow: 'shadow-green-200/50'
      };
    }
    if (name.includes('Enterprise')) {
      return {
        gradient: 'from-purple-500 to-purple-600',
        iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
        border: 'border-purple-300',
        shadow: 'shadow-purple-200/50'
      };
    }
    return {
      gradient: 'from-slate-700 to-slate-800',
      iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
      border: 'border-slate-200',
      shadow: 'shadow-slate-200/50'
    };
  };

  const getPackageFeatures = (pkg: CreditPackage) => {
    const features = [
      { icon: Coins, text: `${pkg.credits} crédits/mois` },
      { icon: Package, text: `${pkg.credits} missions max/mois` },
      { icon: Shield, text: 'Facturation & Devis illimités' },
      { icon: TrendingUp, text: 'Scan de documents illimité' },
    ];

    if (pkg.name.includes('Basic') || pkg.name.includes('Pro') || pkg.name.includes('Business') || pkg.name.includes('Enterprise')) {
      features.push({ icon: Users, text: 'Covoiturage inclus' });
    }

    if (pkg.free_tracking) {
      features.push({ icon: Star, text: 'Tracking GPS illimité GRATUIT' });
    }

    if (pkg.name.includes('Enterprise')) {
      features.push({ icon: Award, text: 'Support dédié prioritaire' });
    }

    return features;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-teal-500 absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="animate-in slide-in-from-left duration-500">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent drop-shadow-sm flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-teal-500" />
          Plans & Tarifs
        </h1>
        <p className="text-slate-600 text-lg">Choisissez le plan qui correspond à vos besoins</p>
      </div>

      {user && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-teal-500/90 via-cyan-500/90 to-blue-500/90 border border-white/40 rounded-2xl p-8 text-white shadow-2xl shadow-lg shadow-teal-300/50 animate-in slide-in-from-top duration-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Coins className="w-8 h-8" />
              </div>
              <div>
                <p className="text-white/90 text-sm uppercase tracking-wide font-semibold">Votre solde</p>
                <p className="text-4xl font-black">{userCredits?.balance || 0} crédits</p>
                {subscription.hasActiveSubscription && (
                  <p className="text-white/80 text-sm mt-1">
                    Expire dans {subscription.daysRemaining} jour{subscription.daysRemaining !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
                <p className="text-white font-semibold text-sm mb-1">Renouvellement</p>
                <p className="text-white/90 text-xs">Tous les 30 jours</p>
                <p className="text-white/80 text-xs">Crédits non cumulables</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-4 animate-in slide-in-from-top duration-500">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            billingPeriod === 'monthly'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          }`}
        >
          <Calendar className="w-5 h-5 inline mr-2" />
          Mensuel
        </button>
        <button
          onClick={() => setBillingPeriod('annual')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all relative ${
            billingPeriod === 'annual'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg'
              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
          }`}
        >
          <Calendar className="w-5 h-5 inline mr-2" />
          Annuel
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            -20%
          </span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        {packages.map((pkg, index) => {
          const Icon = getPackageIcon(pkg.name);
          const isPopular = pkg.is_popular;
          const isProcessing = processingPackageId === pkg.id;
          const features = getPackageFeatures(pkg);
          const colors = getPackageColor(pkg.name, isPopular);

          return (
            <div
              key={pkg.id}
              style={{ animationDelay: `${index * 100}ms` }}
              className={`relative backdrop-blur-xl bg-white border-2 rounded-2xl p-6 shadow-xl hover:shadow-depth-xl transition-all duration-300 hover:-translate-y-2 animate-in perspective-card slide-in-from-bottom ${
                colors.border
              } ${colors.shadow}`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  POPULAIRE
                </div>
              )}

              {pkg.discount_percent > 0 && (
                <div className="absolute -top-4 -right-4 bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                  -{pkg.discount_percent}%
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors.iconBg}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-1">{pkg.name}</h3>
              <p className="text-slate-600 text-xs mb-4 min-h-[32px]">{pkg.description}</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    {pkg.price.toFixed(2)}€
                  </span>
                </div>
                <p className="text-slate-500 text-xs">
                  {billingPeriod === 'monthly' ? 'par mois' : 'par an'}
                </p>
                {billingPeriod === 'annual' && (
                  <p className="text-teal-600 text-xs font-semibold">
                    {(pkg.price / 12).toFixed(2)}€/mois
                  </p>
                )}
              </div>

              <div className="space-y-2 mb-6 min-h-[200px]">
                {features.map((feature, idx) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5 bg-${colors.gradient.split(' ')[0].replace('from-', '').replace('-500', '-100')}`}>
                        <FeatureIcon className={`w-2.5 h-2.5 text-${colors.gradient.split(' ')[0].replace('from-', '').replace('-500', '-600')}`} />
                      </div>
                      <span className="text-xs">{feature.text}</span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={isProcessing}
                className={`w-full py-3 rounded-lg font-bold transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white shadow-lg`}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Chargement...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Commencer
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 animate-in slide-in-from-bottom duration-700">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-blue-900 mb-3">Coûts des fonctionnalités en crédits</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {featureCosts.map((feature) => (
                <div key={feature.feature_key} className="bg-white/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm text-blue-900">{feature.feature_name}</p>
                    <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                      {feature.credit_cost === 0 ? 'GRATUIT' : `${feature.credit_cost} crédit${feature.credit_cost > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700">{feature.description}</p>
                  {feature.free_from_plan && (
                    <p className="text-xs text-teal-600 font-semibold mt-1">
                      ✨ Gratuit à partir du plan {feature.free_from_plan.charAt(0).toUpperCase() + feature.free_from_plan.slice(1)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 animate-in slide-in-from-bottom duration-700 delay-200">
        <div className="backdrop-blur-xl bg-teal-500/10 border border-teal-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-teal-900 mb-3">Paiement sécurisé avec Mollie</h3>
              <div className="space-y-2 text-teal-700 text-sm">
                <p>Tous les paiements sont sécurisés et traités par Mollie, un processeur de paiement certifié PCI-DSS.</p>
                <p><strong>Méthodes acceptées :</strong></p>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  <li>Cartes bancaires (Visa, Mastercard, Amex)</li>
                  <li>PayPal</li>
                  <li>Virement bancaire</li>
                </ul>
                <p className="font-semibold">✓ Activation instantanée après paiement</p>
              </div>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900 mb-3">Garanties</h3>
              <div className="space-y-2 text-amber-700 text-sm">
                <p><strong>✓ Satisfait ou remboursé</strong> - 14 jours pour changer d'avis</p>
                <p><strong>✓ Annulation à tout moment</strong> - Sans engagement, sans frais cachés</p>
                <p><strong>✓ Support réactif</strong> - Réponse en moins de 24h</p>
                <p><strong>✓ Renouvellement automatique</strong> - Tous les 30 jours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
