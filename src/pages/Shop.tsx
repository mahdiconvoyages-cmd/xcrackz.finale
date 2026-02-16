// @ts-nocheck - Page Abonnements CHECKSFLEET - Prise de rendez-vous
import { useState } from 'react';
import { 
  Crown, Shield, Zap, Building2, CheckCircle, X, Send, 
  Calendar, Phone, Mail, User, Briefcase, Star, Rocket,
  ArrowRight, CreditCard, Gift
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../utils/toast';

// ===== PLANS =====
const PLANS = [
  {
    id: 'essentiel',
    name: 'Essentiel',
    icon: Shield,
    monthlyPrice: 10,
    annualPrice: 120,
    setupFee: 50,
    creditsPerMonth: 10,
    color: 'from-blue-500 to-cyan-500',
    colorLight: 'bg-blue-50 border-blue-200 text-blue-700',
    popular: false,
    features: [
      'Accès complet à toute la plateforme',
      '10 crédits / mois inclus',
      'Missions, inspections, GPS, facturation',
      'Rapports d\'inspection PDF',
      'CRM & gestion clients',
      'Scanner de documents',
      'Support par email',
      'Idéal pour démarrer',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    monthlyPrice: 20,
    annualPrice: 240,
    setupFee: 50,
    creditsPerMonth: 20,
    color: 'from-purple-500 to-indigo-600',
    colorLight: 'bg-purple-50 border-purple-200 text-purple-700',
    popular: true,
    features: [
      'Accès complet à toute la plateforme',
      '20 crédits / mois inclus',
      'Assistant & génération auto',
      'Scanner intelligent avancé',
      'Optimisation de trajets',
      'Rapports PDF enrichis',
      'Support prioritaire',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: Crown,
    monthlyPrice: 50,
    annualPrice: 600,
    setupFee: 0,
    creditsPerMonth: 100,
    color: 'from-amber-500 to-orange-600',
    colorLight: 'bg-amber-50 border-amber-200 text-amber-700',
    popular: false,
    features: [
      'Accès complet à toute la plateforme',
      '100 crédits / mois inclus',
      'Frais de mise en place OFFERTS',
      'Volume idéal flottes & équipes',
      'Toutes les fonctionnalités avancées',
      'Export comptable avancé',
      'Support dédié téléphone',
    ],
  },
];

interface RdvForm {
  full_name: string;
  email: string;
  phone: string;
  company_name: string;
  selected_plan: string;
  billing_period: 'monthly' | 'annual';
  message: string;
}

export default function ShopNew() {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [showModal, setShowModal] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [form, setForm] = useState<RdvForm>({
    full_name: '',
    email: user?.email || '',
    phone: '',
    company_name: '',
    selected_plan: '',
    billing_period: 'annual',
    message: '',
  });

  const [enterpriseForm, setEnterpriseForm] = useState({
    full_name: '',
    email: user?.email || '',
    phone: '',
    company_name: '',
    expected_volume: '',
    message: '',
  });

  const handleSelectPlan = (plan: typeof PLANS[0]) => {
    setSelectedPlan(plan);
    setForm(prev => ({
      ...prev,
      selected_plan: plan.id,
      billing_period: billingPeriod,
      email: user?.email || prev.email,
    }));
    setSubmitted(false);
    setShowModal(true);
  };

  const handleSubmitRdv = async () => {
    if (!form.full_name || !form.email || !form.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('shop_quote_requests')
        .insert({
          user_id: user?.id || null,
          company_name: form.company_name || form.full_name,
          email: form.email,
          phone: form.phone,
          expected_volume: `Plan: ${selectedPlan?.name} | ${form.billing_period === 'annual' ? 'Annuel' : 'Mensuel'} | ${selectedPlan?.creditsPerMonth || 0} crédits/mois`,
          message: `Demande d'abonnement ${selectedPlan?.name?.toUpperCase()}\n` +
            `Facturation: ${form.billing_period === 'annual' ? 'Annuelle' : 'Mensuelle'}\n` +
            `Prix: ${form.billing_period === 'annual' ? selectedPlan?.annualPrice + '€/an' : selectedPlan?.monthlyPrice + '€/mois'}\n` +
            `Frais de mise en place: ${selectedPlan?.setupFee === 0 ? 'OFFERTS' : selectedPlan?.setupFee + '€'}\n` +
            `Crédits: ${selectedPlan?.creditsPerMonth || 'Accès plateforme uniquement'}/mois\n` +
            (form.message ? `\nMessage: ${form.message}` : ''),
          status: 'pending',
        });

      if (error) throw error;
      setSubmitted(true);
      toast.success('Demande envoyée avec succès ! Nous vous contacterons dans les 24h.');
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEnterprise = async () => {
    if (!enterpriseForm.full_name || !enterpriseForm.email || !enterpriseForm.phone) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('shop_quote_requests')
        .insert({
          user_id: user?.id || null,
          company_name: enterpriseForm.company_name || enterpriseForm.full_name,
          email: enterpriseForm.email,
          phone: enterpriseForm.phone,
          expected_volume: enterpriseForm.expected_volume,
          message: `DEMANDE SUR-MESURE ENTREPRISE\n` +
            `Volume estimé: ${enterpriseForm.expected_volume}\n` +
            (enterpriseForm.message ? `Message: ${enterpriseForm.message}` : ''),
          status: 'pending',
        });

      if (error) throw error;
      setSubmitted(true);
      toast.success('Demande sur-mesure envoyée ! Notre équipe vous contactera sous 24h.');
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
            <Gift className="w-4 h-4" />
            <span className="text-sm font-medium">Offre de bienvenue : 10 crédits offerts à l'inscription</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-4">
            Choisissez votre abonnement
          </h1>
          <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
            Des solutions adaptées à chaque professionnel du convoyage. 
            Sélectionnez votre plan et demandez votre mise en place.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16">

        {/* BILLING TOGGLE */}
        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-2xl shadow-lg p-1.5 inline-flex items-center gap-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                billingPeriod === 'annual'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Annuel
            </button>
          </div>
        </div>

        {/* PLANS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {PLANS.map((plan) => {
            const price = billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice;
            const PlanIcon = plan.icon;
            
            return (
              <div 
                key={plan.id}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 ${
                  plan.popular ? 'ring-2 ring-purple-500 ring-offset-4' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-center text-xs font-bold py-1.5 uppercase tracking-wider">
                    <Star className="w-3 h-3 inline mr-1" /> Le plus populaire
                  </div>
                )}

                <div className={`p-6 sm:p-8 ${plan.popular ? 'pt-10' : ''}`}>
                  {/* Plan header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                      <PlanIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      {plan.creditsPerMonth > 0 && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.colorLight}`}>
                          {plan.creditsPerMonth} crédits/mois
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black text-slate-900">
                        {billingPeriod === 'annual' ? plan.monthlyPrice : price}€
                      </span>
                      <span className="text-slate-500 text-sm mb-1">/mois</span>
                    </div>
                    {billingPeriod === 'annual' && (
                      <p className="text-sm text-slate-500 mt-1">
                        Soit <strong>{plan.annualPrice}€/an</strong> facturé annuellement
                      </p>
                    )}
                    <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${
                      plan.setupFee === 0 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <CreditCard className="w-3 h-3" />
                      {plan.setupFee === 0 
                        ? 'Frais de mise en place OFFERTS' 
                        : `${plan.setupFee}€ de mise en place (1ère fois)`}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          plan.popular ? 'text-purple-500' : 'text-green-500'
                        }`} />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    Demander cet abonnement
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ENTERPRISE SECTION */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-16">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 sm:p-10 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold">Offre Sur-Mesure</h3>
                </div>
                <p className="text-white/70 text-sm leading-relaxed max-w-xl">
                  Pour les entreprises avec un volume important de missions mensuelles. 
                  Tarification sur devis, crédits illimités, accompagnement personnalisé, 
                  formation équipes et intégration API.
                </p>
              </div>
              <button
                onClick={() => { setSubmitted(false); setShowEnterpriseModal(true); }}
                className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition flex items-center gap-2 whitespace-nowrap"
              >
                <Send className="w-5 h-5" />
                Demander un devis
              </button>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-10 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Comment ça fonctionne ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Rocket, title: 'Choisissez', desc: 'Sélectionnez le plan adapté à vos besoins', color: 'text-blue-500 bg-blue-50' },
              { icon: Calendar, title: 'Demandez', desc: 'Remplissez le formulaire avec vos coordonnées', color: 'text-purple-500 bg-purple-50' },
              { icon: Phone, title: 'On vous rappelle', desc: 'Notre équipe vous contacte sous 24h', color: 'text-amber-500 bg-amber-50' },
              { icon: CheckCircle, title: 'C\'est parti !', desc: 'Votre abonnement est activé par notre équipe', color: 'text-green-500 bg-green-50' },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-3`}>
                  <step.icon className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-slate-400 mb-1">ÉTAPE {i + 1}</div>
                <h4 className="font-bold text-slate-900 mb-1">{step.title}</h4>
                <p className="text-sm text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* WHAT CREDITS ARE FOR */}
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-10 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Tous les abonnements incluent l'accès complet</h2>
          <p className="text-slate-500 text-sm mb-6">Quel que soit votre plan, vous bénéficiez de toutes les fonctionnalités de la plateforme sans aucune restriction. La seule différence entre les plans est le nombre de crédits inclus chaque mois.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Inclus dans tous les plans
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  'Création et gestion de missions selon vos crédits',
                  'Inspections départ / arrivée complètes',
                  'Suivi GPS en temps réel',
                  'Rapports d\'inspection PDF',
                  'Facturation et devis',
                  'CRM & gestion des contacts / clients',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* WELCOME GIFT */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-8 sm:p-10 text-white mb-16">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Gift className="w-10 h-10" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Cadeau de bienvenue</h3>
              <p className="text-white/80 text-sm leading-relaxed max-w-xl">
                Pour tout nouvel inscrit avec un numéro de téléphone vérifié, bénéficiez d'un 
                <strong className="text-white"> abonnement Starter gratuit avec 10 crédits</strong> pour découvrir la plateforme. 
                Offre non renouvelable, valable 30 jours.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Questions fréquentes</h2>
          <div className="space-y-4">
            {[
              { q: 'Comment souscrire à un abonnement ?', a: 'Choisissez votre plan, remplissez le formulaire de demande avec vos coordonnées, et notre équipe vous contactera sous 24h pour finaliser la mise en place.' },
              { q: 'Qu\'est-ce que les frais de mise en place ?', a: 'Les frais de mise en place couvrent la configuration initiale de votre espace, la formation à la plateforme et l\'accompagnement personnalisé. Offerts pour le plan Business.' },
              { q: 'Les crédits sont-ils reportés d\'un mois à l\'autre ?', a: 'Non, les crédits sont réinitialisés chaque mois selon votre plan. Les crédits non utilisés ne sont pas reportés au mois suivant.' },
              { q: 'Puis-je changer de plan en cours d\'abonnement ?', a: 'Oui, contactez notre équipe pour un changement de plan. La différence sera calculée au prorata.' },
              { q: 'Que se passe-t-il à l\'expiration de mon abonnement ?', a: 'Vous conservez l\'accès en lecture à vos données, mais l\'accès à la plateforme sera désactivé jusqu\'au renouvellement. Contactez notre équipe pour renouveler.' },
            ].map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between p-4 cursor-pointer font-semibold text-slate-800 hover:bg-slate-50 rounded-xl">
                  {faq.q}
                  <ArrowRight className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL DEMANDE D'ABONNEMENT */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className={`bg-gradient-to-r ${selectedPlan.color} p-6 text-white rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Demande d'abonnement {selectedPlan.name}</h3>
                  <p className="text-white/80 text-sm mt-1">
                    {billingPeriod === 'annual' 
                      ? `${selectedPlan.annualPrice}€/an (${selectedPlan.monthlyPrice}€/mois)` 
                      : `${selectedPlan.monthlyPrice}€/mois`}
                    {selectedPlan.creditsPerMonth > 0 && ` • ${selectedPlan.creditsPerMonth} crédits/mois`}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Demande envoyée !</h4>
                  <p className="text-slate-600 text-sm">
                    Notre équipe vous contactera sous 24h pour finaliser l'activation de votre abonnement <strong>{selectedPlan.name}</strong>.
                  </p>
                  <button onClick={() => setShowModal(false)} className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold">
                    Fermer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500 mb-4">
                    Remplissez vos coordonnées et notre équipe vous rappellera pour activer votre abonnement.
                  </p>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      <User className="w-3.5 h-3.5 inline mr-1" /> Nom complet *
                    </label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={e => setForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Votre nom complet"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      <Mail className="w-3.5 h-3.5 inline mr-1" /> Email *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="votre@email.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      <Phone className="w-3.5 h-3.5 inline mr-1" /> Téléphone *
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="06 12 34 56 78"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      <Briefcase className="w-3.5 h-3.5 inline mr-1" /> Société
                    </label>
                    <input
                      type="text"
                      value={form.company_name}
                      onChange={e => setForm(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Nom de votre société (optionnel)"
                    />
                  </div>

                  {/* Billing period selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" /> Facturation
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, billing_period: 'monthly' }))}
                        className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.billing_period === 'monthly'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        Mensuel — {selectedPlan.monthlyPrice}€/mois
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, billing_period: 'annual' }))}
                        className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                          form.billing_period === 'annual'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        Annuel — {selectedPlan.annualPrice}€/an
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message (optionnel)</label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20 resize-none"
                      placeholder="Besoin particulier, question..."
                    />
                  </div>

                  <button
                    onClick={handleSubmitRdv}
                    disabled={submitting}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer ma demande
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENTREPRISE */}
      {showEnterpriseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEnterpriseModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Demande Sur-Mesure</h3>
                  <p className="text-white/70 text-sm mt-1">Offre personnalisée pour votre entreprise</p>
                </div>
                <button onClick={() => setShowEnterpriseModal(false)} className="p-2 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Demande envoyée !</h4>
                  <p className="text-slate-600 text-sm">Notre équipe commerciale vous contactera sous 24h.</p>
                  <button onClick={() => setShowEnterpriseModal(false)} className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold">
                    Fermer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom complet *</label>
                    <input
                      type="text"
                      value={enterpriseForm.full_name}
                      onChange={e => setEnterpriseForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={enterpriseForm.email}
                      onChange={e => setEnterpriseForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Téléphone *</label>
                    <input
                      type="tel"
                      value={enterpriseForm.phone}
                      onChange={e => setEnterpriseForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Société *</label>
                    <input
                      type="text"
                      value={enterpriseForm.company_name}
                      onChange={e => setEnterpriseForm(prev => ({ ...prev, company_name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Volume estimé de missions / mois</label>
                    <select
                      value={enterpriseForm.expected_volume}
                      onChange={e => setEnterpriseForm(prev => ({ ...prev, expected_volume: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Sélectionner</option>
                      <option value="50-100">50 à 100 missions/mois</option>
                      <option value="100-300">100 à 300 missions/mois</option>
                      <option value="300-500">300 à 500 missions/mois</option>
                      <option value="500+">Plus de 500 missions/mois</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message</label>
                    <textarea
                      value={enterpriseForm.message}
                      onChange={e => setEnterpriseForm(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-24 resize-none"
                      placeholder="Décrivez vos besoins..."
                    />
                  </div>
                  <button
                    onClick={handleSubmitEnterprise}
                    disabled={submitting}
                    className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Envoyer ma demande
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
