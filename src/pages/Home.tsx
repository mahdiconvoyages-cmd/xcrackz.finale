import { Truck, Camera, FileText, Store, Users, TrendingUp, Star, Check, MapPin, Shield, Bell, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ImageCarousel from '../components/ImageCarousel';

import blablacarImg from '../assets/blablacar.png';
import gemini1Img from '../assets/Gemini_Generated_Image_1hbhq11hbhq11hbh (1).png';
import chatgptImg from '../assets/ChatGPT Image 10 oct. 2025, 00_07_41.png';
import geminiMImg from '../assets/Gemini_Generated_Image_m3h3srm3h3srm3h3.png';

const carouselImages = [blablacarImg, gemini1Img, chatgptImg, geminiMImg];

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solidNav, setSolidNav] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolidNav(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    document.documentElement.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors ${solidNav ? 'bg-slate-900/90' : 'bg-slate-900/60 md:bg-slate-900/20'} backdrop-blur-xl border-b border-white/10 shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform group">
            <img src="/logo.svg" alt="xCrackz Logo" className="w-10 h-10 rounded-xl shadow-lg group-hover:shadow-teal-500/30 transition-shadow" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              xCrackz
            </h1>
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/about"
              className="text-white hover:text-teal-400 transition"
            >
              Qui sommes-nous
            </Link>
            <a
              href="#invoice-demo"
              className="text-white hover:text-teal-400 transition"
            >
              Facture démo
            </a>
            <Link
              to="/login"
              className="text-white hover:text-teal-400 transition"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-2 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5"
            >
              Commencer
            </Link>
          </div>
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-white/10">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Menu mobile plein écran */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
              <img src="/logo.svg" alt="xCrackz Logo" className="w-9 h-9 rounded-xl" />
              <span className="text-xl font-bold">xCrackz</span>
            </Link>
            <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="px-6 pt-2 space-y-4 text-lg font-semibold">
            <Link to="/about" onClick={() => setMobileOpen(false)} className="block py-3 border-b border-white/10">Qui sommes-nous</Link>
            <a href="#invoice-demo" onClick={() => setMobileOpen(false)} className="block py-3 border-b border-white/10">Facture démo</a>
            <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-3 border-b border-white/10">Connexion</Link>
            <Link to="/register" onClick={() => setMobileOpen(false)} className="block py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-center rounded-xl mt-2">Commencer</Link>
          </div>
        </div>
      )}

      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <ImageCarousel images={carouselImages} interval={3500} />
          <div className="absolute inset-0 bg-slate-900/70 md:bg-gradient-to-br md:from-slate-900/50 md:via-slate-900/40 md:to-slate-900/50"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
              <span className="text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                Gérez vos missions de convoyage{' '}
              </span>
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                en toute simplicité
              </span>
            </h2>
            <p className="text-lg md:text-2xl text-white mb-8 sm:mb-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
              xCrackz est la plateforme SaaS complète pour organiser, suivre et facturer vos missions de convoyage automobile.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Link
                to="/register"
                className="bg-gradient-to-r from-teal-500 to-cyan-500 px-8 sm:px-10 py-4 sm:py-5 rounded-lg text-white font-bold text-lg sm:text-xl hover:shadow-2xl hover:shadow-teal-500/50 transition-all hover:-translate-y-1 hover:scale-105"
              >
                Commencer gratuitement
              </Link>
              <a
                href="#features"
                className="bg-white/10 backdrop-blur-md border-2 border-white/20 px-8 sm:px-10 py-4 sm:py-5 rounded-lg text-white font-bold text-lg sm:text-xl hover:bg-white/20 transition"
              >
                Voir les fonctionnalités
              </a>
            </div>
          </div>
        </div>
      </section>

  <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-4">Fonctionnalités principales</h3>
        <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
          Une solution complète pour gérer tous les aspects de votre activité de convoyage automobile
        </p>
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Truck className="w-6 h-6" />}
            title="Gestion des Missions"
            description="Créez, assignez et suivez vos missions de convoyage avec vue Kanban, liste et carte géographique. Assignez des chauffeurs, définissez les priorités et suivez l'avancement en temps réel."
          />
          <FeatureCard
            icon={<Camera className="w-6 h-6" />}
            title="Inspection Véhicule"
            description="Documentez l'état des véhicules au départ et à l'arrivée avec photos, kilométrage et signatures électroniques. Rapports d'inspection PDF automatiques."
          />
          <FeatureCard
            icon={<FileText className="w-6 h-6" />}
            title="Facturation Légale"
            description="Générez des factures et devis conformes aux normes françaises avec numérotation automatique, TVA et mentions légales. Export PDF professionnel."
          />
          <FeatureCard
            icon={<MapPin className="w-6 h-6" />}
            title="Suivi GPS en Temps Réel"
            description="Localisez vos véhicules en direct sur une carte interactive. Historique des trajets, alertes de géolocalisation et estimation d'arrivée."
          />
          <FeatureCard
            icon={<Store className="w-6 h-6" />}
            title="Marketplace"
            description="Publiez et trouvez des missions sur la plateforme communautaire. Système de crédits, notation des convoyeurs et messagerie intégrée."
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Covoiturage"
            description="Partagez vos trajets de retour avec d'autres convoyeurs pour optimiser vos coûts. Système de réservation et paiement intégré."
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Analytics & Rapports"
            description="Tableaux de bord détaillés avec statistiques de performances, revenus, coûts et rentabilité. Exports Excel et PDF."
          />
          <FeatureCard
            icon={<Bell className="w-6 h-6" />}
            title="Notifications Push"
            description="Alertes en temps réel pour les nouvelles missions, messages, changements de statut et rappels importants sur mobile et desktop."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Sécurité & Conformité"
            description="Authentification sécurisée, chiffrement des données, conformité RGPD et sauvegarde automatique de toutes vos informations."
          />
        </div>
      </section>

      <section className="bg-slate-800/30 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-12">Comment ça marche ?</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8 max-w-5xl mx-auto">
            <ProcessStep
              number="1"
              title="Créez votre compte"
              description="Inscription gratuite en 2 minutes"
            />
            <ProcessStep
              number="2"
              title="Configurez votre profil"
              description="Ajoutez vos informations et préférences"
            />
            <ProcessStep
              number="3"
              title="Créez vos missions"
              description="Définissez vos convoyages et assignez"
            />
            <ProcessStep
              number="4"
              title="Suivez et facturez"
              description="Tracking en temps réel et facturation auto"
            />
          </div>
        </div>
      </section>

  <section id="invoice-demo" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-4">Facturation professionnelle</h3>
        <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
          Générez automatiquement des factures conformes aux normes françaises
        </p>
        <div className="max-w-4xl mx-auto">
          <InvoicePreview />
        </div>
      </section>

  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-12">Ce que disent nos utilisateurs</h3>
  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 max-w-6xl mx-auto">
          <TestimonialCard
            text="xCrackz a transformé notre façon de gérer les convoyages. Tout est centralisé et simple à utiliser."
            author="Jean-Pierre D."
            role="Directeur de flotte"
          />
          <TestimonialCard
            text="La fonctionnalité de facturation nous fait gagner un temps précieux. Plus de saisie manuelle !"
            author="Marie L."
            role="Comptable"
          />
          <TestimonialCard
            text="Le suivi GPS en temps réel nous permet de rassurer nos clients et d'optimiser nos tournées."
            author="Thomas R."
            role="Convoyeur indépendant"
          />
        </div>
      </section>

  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-4">Tarifs simples et transparents</h3>
        <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
          Tous les plans incluent : Facturation & Devis illimités · Scan de documents · Support · Renouvellement tous les 30 jours
        </p>
  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 max-w-7xl mx-auto">
          <PricingCard
            title="Starter"
            price="9,99€"
            period="/mois"
            features={[
              '10 crédits/mois',
              '10 missions max/mois',
              'Facturation illimitée',
              'Scan illimité',
              'Support email'
            ]}
          />
          <PricingCard
            title="Basic"
            price="19,99€"
            period="/mois"
            features={[
              '25 crédits/mois',
              '25 missions max/mois',
              'Covoiturage inclus',
              'Facturation illimitée',
              'Support prioritaire'
            ]}
          />
          <PricingCard
            title="Pro"
            price="49,99€"
            period="/mois"
            popular
            features={[
              '100 crédits/mois',
              '100 missions max/mois',
              'Tracking GPS GRATUIT',
              'Covoiturage inclus',
              'Facturation illimitée',
              'Support 24/7'
            ]}
          />
          <PricingCard
            title="Business"
            price="79,99€"
            period="/mois"
            features={[
              '500 crédits/mois',
              '500 missions max/mois',
              'Tracking GPS GRATUIT',
              'Covoiturage illimité',
              'Support dédié 24/7'
            ]}
          />
          <PricingCard
            title="Enterprise"
            price="119,99€"
            period="/mois"
            features={[
              '1500 crédits/mois',
              '1500 missions max/mois',
              'Tracking GPS GRATUIT',
              'Covoiturage illimité',
              'Support prioritaire dédié'
            ]}
          />
        </div>
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6">
            <h4 className="text-xl font-bold mb-4 text-center">Coûts des fonctionnalités en crédits</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <span className="text-slate-300">Création de mission</span>
                <span className="font-bold text-teal-400">1 crédit</span>
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <span className="text-slate-300">Inspection véhicule</span>
                <span className="font-bold text-green-400">GRATUIT</span>
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <span className="text-slate-300">Tracking GPS (par position)</span>
                <span className="font-bold text-teal-400">1 crédit <span className="text-xs text-slate-400">(Gratuit Pro+)</span></span>
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <span className="text-slate-300">Publier trajet covoiturage</span>
                <span className="font-bold text-teal-400">2 crédits</span>
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <span className="text-slate-300">Réserver covoiturage</span>
                <span className="font-bold text-teal-400">2 crédits</span>
              </div>
              <div className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                <span className="text-slate-300">Facturation & Scan</span>
                <span className="font-bold text-green-400">GRATUIT</span>
              </div>
            </div>
            <p className="text-center text-slate-400 text-xs mt-4">
              💰 Économisez 20% avec l'abonnement annuel
            </p>
          </div>
        </div>
      </section>

  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-12 rounded-3xl max-w-3xl mx-auto shadow-2xl">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">Prêt à optimiser votre convoyage ?</h3>
          <p className="text-xl text-slate-300 mb-8">
            Rejoignez des centaines de professionnels qui utilisent xCrackz quotidiennement.
          </p>
          <Link
            to="/register"
            className="inline-block bg-gradient-to-r from-teal-500 to-cyan-500 px-12 py-4 rounded-lg text-white font-bold text-lg hover:shadow-xl hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5"
          >
            Créer mon compte gratuit
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900/60 md:bg-slate-900/50 backdrop-blur-xl border-t border-white/10 mt-12 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                xCrackz
              </h3>
              <p className="text-slate-400 text-sm mt-1">© 2025 xCrackz. Tous droits réservés.</p>
            </div>
            <div className="flex space-x-6">
              <Link to="/legal" className="text-slate-400 hover:text-teal-400 transition">Mentions légales</Link>
              <Link to="/privacy" className="text-slate-400 hover:text-teal-400 transition">Confidentialité</Link>
              <Link to="/about" className="text-slate-400 hover:text-teal-400 transition">Qui sommes-nous</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl hover:bg-white/10 hover:border-white/30 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 group">
      <div className="w-16 h-16 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border-2 border-teal-500 rounded-2xl flex items-center justify-center mb-4 text-teal-400 group-hover:scale-110 transition">
        {icon}
      </div>
      <h4 className="text-xl font-bold mb-3">{title}</h4>
      <p className="text-slate-300">{description}</p>
    </div>
  );
}

function TestimonialCard({ text, author, role }: { text: string; author: string; role: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all">
      <div className="flex gap-1 mb-4 text-yellow-400">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-5 h-5 fill-current" />
        ))}
      </div>
      <p className="text-slate-300 mb-4">{text}</p>
      <p className="font-bold">{author}</p>
      <p className="text-sm text-slate-400">{role}</p>
    </div>
  );
}

function PricingCard({ title, price, period, features, popular }: {
  title: string;
  price: string;
  period?: string;
  features: string[];
  popular?: boolean;
}) {
  return (
    <div className={`bg-white/5 backdrop-blur-xl border ${popular ? 'border-teal-400 border-2 shadow-teal-500/20' : 'border-white/20'} p-8 rounded-2xl text-center relative shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-teal-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold">
          POPULAIRE
        </div>
      )}
      <h4 className="text-xl font-bold mb-4">{title}</h4>
      <div className="text-4xl font-bold mb-6">
        {price}
        {period && <span className="text-lg text-slate-400">{period}</span>}
      </div>
      <ul className="text-left space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2">
            <Check className="w-5 h-5 text-teal-400 flex-shrink-0" />
            <span className="text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/register"
        className={`block w-full py-3 rounded-lg font-bold transition ${
          popular
            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:shadow-lg hover:shadow-teal-500/50 hover:-translate-y-0.5'
            : 'bg-white/5 border border-white/10 hover:bg-white/10'
        }`}
      >
        {title === 'Entreprise' ? 'Nous contacter' : 'Commencer'}
      </Link>
    </div>
  );
}

function ProcessStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg shadow-teal-500/30">
        {number}
      </div>
      <h4 className="text-xl font-bold mb-2">{title}</h4>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

function InvoicePreview() {
  return (
    <div className="bg-white text-slate-900 rounded-2xl p-8 shadow-2xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <img src="/logo.svg" alt="xCrackz Logo" className="w-12 h-12 rounded-xl shadow-lg" />
            <h3 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              xCrackz
            </h3>
          </div>
          <p className="text-sm text-slate-600">123 Rue du Convoyage</p>
          <p className="text-sm text-slate-600">75001 Paris, France</p>
          <p className="text-sm text-slate-600">SIRET: 123 456 789 00010</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-teal-600 mb-2">FACTURE</h2>
          <p className="text-sm text-slate-600">N° FA-2025-0042</p>
          <p className="text-sm text-slate-600">Date: 10/10/2025</p>
        </div>
      </div>

      <div className="mb-8 p-4 bg-slate-50 rounded-lg">
        <h4 className="font-bold mb-2 text-slate-700">Client</h4>
        <p className="text-slate-600">Entreprise Auto Transport</p>
        <p className="text-sm text-slate-600">456 Avenue des Véhicules</p>
        <p className="text-sm text-slate-600">69000 Lyon, France</p>
      </div>

      <table className="w-full mb-8">
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th className="text-left py-3 text-slate-700">Description</th>
            <th className="text-right py-3 text-slate-700">Quantité</th>
            <th className="text-right py-3 text-slate-700">Prix unitaire</th>
            <th className="text-right py-3 text-slate-700">Total HT</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="py-3 text-slate-600">
              <p className="font-semibold">Convoyage Paris - Lyon</p>
              <p className="text-sm">Véhicule: Renault Clio - AB-123-CD</p>
            </td>
            <td className="text-right py-3 text-slate-600">1</td>
            <td className="text-right py-3 text-slate-600">450,00 €</td>
            <td className="text-right py-3 font-semibold text-slate-700">450,00 €</td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="py-3 text-slate-600">
              <p className="font-semibold">Rapport d'inspection détaillé</p>
              <p className="text-sm">Photos + signature électronique</p>
            </td>
            <td className="text-right py-3 text-slate-600">1</td>
            <td className="text-right py-3 text-slate-600">25,00 €</td>
            <td className="text-right py-3 font-semibold text-slate-700">25,00 €</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="text-slate-600">Total HT</span>
            <span className="font-semibold text-slate-700">475,00 €</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="text-slate-600">TVA (20%)</span>
            <span className="font-semibold text-slate-700">95,00 €</span>
          </div>
          <div className="flex justify-between py-3 border-t-2 border-teal-600">
            <span className="text-lg font-bold text-slate-800">Total TTC</span>
            <span className="text-2xl font-bold text-teal-600">570,00 €</span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          TVA non applicable, art. 293 B du CGI - En cas de retard de paiement, indemnité forfaitaire de 40€ pour frais de recouvrement (Art. L441-6 du Code de commerce)
        </p>
      </div>
    </div>
  );
}
