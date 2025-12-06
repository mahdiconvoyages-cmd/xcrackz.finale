import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, AlertCircle } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-teal-400 hover:text-teal-300 transition font-semibold"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à l'accueil
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-6">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-4">
            Conditions Générales d'Utilisation
          </h1>
          <p className="text-slate-400 text-lg">
            Version 1.0 - Mise à jour : 11 octobre 2025
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 space-y-8">
          {/* Notice */}
          <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-black text-teal-900 mb-2">Information importante</h3>
              <p className="text-teal-800 text-sm leading-relaxed">
                En utilisant CHECKFLOW, vous acceptez l'ensemble des conditions ci-dessous. 
                Veuillez les lire attentivement avant de créer un compte.
              </p>
            </div>
          </div>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                1
              </span>
              Objet
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed mb-4">
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation 
                de la plateforme <strong>CHECKFLOW</strong>, une solution SaaS de gestion de convoyage automobile 
                et de suivi GPS en temps réel.
              </p>
              <p className="text-slate-700 leading-relaxed">
                La plateforme est éditée par <strong>CHECKFLOW</strong>, société dont le siège social est situé en France.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                2
              </span>
              Définitions
            </h2>
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-1">Utilisateur</h3>
                <p className="text-slate-700 text-sm">
                  Toute personne physique ou morale utilisant la plateforme CHECKFLOW.
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-1">Donneur d'ordre</h3>
                <p className="text-slate-700 text-sm">
                  Utilisateur qui crée et gère des missions de convoyage automobile.
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-1">Convoyeur</h3>
                <p className="text-slate-700 text-sm">
                  Utilisateur qui effectue des missions de convoyage pour le compte des donneurs d'ordre.
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-900 mb-1">Crédit</h3>
                <p className="text-slate-700 text-sm">
                  Unité de paiement permettant de créer une mission. 1 mission = 1 crédit.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                3
              </span>
              Inscription et Compte Utilisateur
            </h2>
            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-bold text-slate-900 mb-2">3.1 Création de compte</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-4">
                <li>L'inscription est gratuite et obligatoire pour accéder aux services.</li>
                <li>Vous devez fournir des informations exactes, complètes et à jour.</li>
                <li>Un seul compte par utilisateur est autorisé.</li>
                <li>Vous devez avoir au moins 18 ans pour créer un compte.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 mb-2">3.2 Sécurité du compte</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-4">
                <li>Vous êtes responsable de la confidentialité de votre mot de passe.</li>
                <li>Vous devez informer CHECKFLOW immédiatement de toute utilisation non autorisée.</li>
                <li>CHECKFLOW se réserve le droit de suspendre ou supprimer un compte en cas d'activité suspecte.</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 mb-2">3.3 Protection contre les comptes multiples</h3>
              <p className="text-slate-700 leading-relaxed">
                La création de comptes multiples avec la même adresse email ou le même numéro de téléphone 
                est strictement interdite. Toute tentative sera automatiquement détectée et bloquée.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                4
              </span>
              Services Proposés
            </h2>
            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-bold text-slate-900 mb-2">4.1 Fonctionnalités principales</h3>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <h4 className="font-bold text-teal-900 mb-2">✅ Gratuit</h4>
                  <ul className="text-sm text-teal-800 space-y-1">
                    <li>• Suivi GPS en temps réel</li>
                    <li>• Inspections (départ/arrivée)</li>
                    <li>• Photos illimitées</li>
                    <li>• États des lieux</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2">💳 Payant (Crédits)</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Création de missions (1 crédit/mission)</li>
                    <li>• Gestion de contacts</li>
                    <li>• Rapports PDF</li>
                    <li>• Support prioritaire</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">4.2 Système de crédits</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>1 mission = 1 crédit</li>
                <li>Les crédits sont achetés via la page Boutique</li>
                <li>Les crédits n'expirent jamais</li>
                <li>Les crédits ne sont ni remboursables ni transférables</li>
                <li>Prix indicatif : 5€ pour 10 crédits, 20€ pour 50 crédits</li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                5
              </span>
              Obligations de l'Utilisateur
            </h2>
            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Vous vous engagez à :</h3>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Respecter les lois et règlements en vigueur</li>
                <li>Ne pas utiliser la plateforme à des fins illégales ou frauduleuses</li>
                <li>Ne pas tenter de contourner les mesures de sécurité</li>
                <li>Ne pas créer de faux comptes ou usurper l'identité d'autrui</li>
                <li>Ne pas diffuser de contenus offensants, diffamatoires ou illicites</li>
                <li>Maintenir vos informations à jour</li>
                <li>Utiliser la plateforme conformément à sa destination</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                6
              </span>
              Propriété Intellectuelle
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed mb-4">
                Tous les éléments de la plateforme CHECKFLOW (logiciel, graphismes, textes, logos, icônes, etc.) 
                sont protégés par le droit d'auteur et appartiennent à CHECKFLOW ou à ses partenaires.
              </p>
              <p className="text-slate-700 leading-relaxed">
                Toute reproduction, représentation, modification, publication, adaptation de tout ou partie 
                des éléments de la plateforme, quel que soit le moyen ou le procédé utilisé, est interdite 
                sans autorisation écrite préalable.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                7
              </span>
              Données Personnelles
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed mb-4">
                CHECKFLOW s'engage à protéger vos données personnelles conformément au Règlement Général 
                sur la Protection des Données (RGPD).
              </p>
              <p className="text-slate-700 leading-relaxed">
                Pour plus d'informations sur la collecte, l'utilisation et la protection de vos données, 
                veuillez consulter notre{' '}
                <Link to="/privacy" className="text-teal-600 font-bold hover:underline">
                  Politique de Confidentialité
                </Link>.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                8
              </span>
              Responsabilité et Garanties
            </h2>
            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-bold text-slate-900 mb-2">8.1 Disponibilité du service</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                CHECKFLOW s'efforce de maintenir la plateforme accessible 24h/24, 7j/7, mais ne garantit pas 
                une disponibilité ininterrompue. Des maintenances programmées ou imprévues peuvent survenir.
              </p>

              <h3 className="text-lg font-bold text-slate-900 mb-2">8.2 Limitation de responsabilité</h3>
              <p className="text-slate-700 leading-relaxed">
                CHECKFLOW ne pourra être tenu responsable des dommages directs ou indirects résultant de :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-4">
                <li>L'utilisation ou l'impossibilité d'utiliser la plateforme</li>
                <li>La perte de données</li>
                <li>Les interruptions de service</li>
                <li>Les virus ou autres éléments nuisibles</li>
                <li>Les actes de tiers (piratage, fraude, etc.)</li>
              </ul>

              <h3 className="text-lg font-bold text-slate-900 mb-2">8.3 Relations entre utilisateurs</h3>
              <p className="text-slate-700 leading-relaxed">
                CHECKFLOW est un simple intermédiaire technique. Les relations contractuelles entre 
                donneurs d'ordre et convoyeurs relèvent de leur seule responsabilité.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                9
              </span>
              Résiliation
            </h2>
            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-bold text-slate-900 mb-2">9.1 Par l'utilisateur</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Vous pouvez supprimer votre compte à tout moment depuis les Paramètres. 
                Les crédits non utilisés seront perdus sans remboursement.
              </p>

              <h3 className="text-lg font-bold text-slate-900 mb-2">9.2 Par CHECKFLOW</h3>
              <p className="text-slate-700 leading-relaxed">
                CHECKFLOW se réserve le droit de suspendre ou supprimer un compte en cas de :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-700">
                <li>Non-respect des présentes CGU</li>
                <li>Activité frauduleuse ou illégale</li>
                <li>Inactivité prolongée (plus de 12 mois)</li>
                <li>Demande de l'utilisateur</li>
              </ul>
            </div>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                10
              </span>
              Modifications des CGU
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed">
                CHECKFLOW se réserve le droit de modifier les présentes CGU à tout moment. 
                Les utilisateurs seront informés par email des modifications importantes. 
                La poursuite de l'utilisation de la plateforme après modification vaudra acceptation des nouvelles CGU.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                11
              </span>
              Droit Applicable et Juridiction
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 leading-relaxed mb-4">
                Les présentes CGU sont régies par le droit français.
              </p>
              <p className="text-slate-700 leading-relaxed">
                En cas de litige, une solution amiable sera recherchée en priorité. 
                À défaut, les tribunaux français seront seuls compétents.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-teal-100 text-teal-600 rounded-lg font-black text-sm">
                12
              </span>
              Contact
            </h2>
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl p-6">
              <p className="text-slate-700 leading-relaxed mb-4">
                Pour toute question concernant ces conditions d'utilisation :
              </p>
              <div className="space-y-2">
                <p className="text-slate-900 font-semibold">
                  📧 Email : <a href="mailto:contact@checksfleet.com" className="text-teal-600 hover:underline">contact@checksfleet.com</a>
                </p>
                <p className="text-slate-900 font-semibold">
                  💬 Support : <Link to="/support" className="text-teal-600 hover:underline">Page Support</Link>
                </p>
                <p className="text-slate-900 font-semibold">
                  🏢 Société : CHECKFLOW - France
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 border-t-2 border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                Dernière mise à jour : <strong>11 octobre 2025</strong>
              </p>
              <div className="flex gap-4">
                <Link
                  to="/privacy"
                  className="text-sm font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  Politique de Confidentialité
                </Link>
                <Link
                  to="/register-modern"
                  className="text-sm font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  Créer un compte
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
