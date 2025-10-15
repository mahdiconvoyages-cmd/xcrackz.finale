import { ArrowLeft, FileText, AlertTriangle, CheckCircle, XCircle, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </Link>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Conditions Générales d'Utilisation
              </h1>
              <p className="text-slate-600 text-lg">Dernière mise à jour : 15 octobre 2025</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-8 shadow-xl space-y-8">
          
          {/* Article 1 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 1 - Objet</h2>
            </div>
            <div className="text-slate-700 leading-relaxed space-y-3">
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme
                <strong> Finality</strong>, service de gestion et de coordination de transport de véhicules.
              </p>
              <p>
                En utilisant Finality, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions,
                veuillez ne pas utiliser notre service.
              </p>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                <p className="font-semibold text-purple-900">📍 Éditeur du service :</p>
                <p className="text-sm mt-2">
                  <strong>Finality SAS</strong><br />
                  Capital social : [À compléter]<br />
                  SIRET : [À compléter]<br />
                  Siège social : [À compléter]<br />
                  Email : contact@finality.fr<br />
                  Directeur de la publication : [À compléter]
                </p>
              </div>
            </div>
          </section>

          {/* Article 2 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 2 - Définitions</h2>
            </div>
            <div className="space-y-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p><strong>« Plateforme »</strong> : Site web et application mobile Finality</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p><strong>« Utilisateur »</strong> : Toute personne utilisant la Plateforme</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p><strong>« Chauffeur »</strong> : Utilisateur effectuant le transport de véhicules</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p><strong>« Dispatcher »</strong> : Utilisateur gérant l'attribution des missions</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p><strong>« Mission »</strong> : Transport d'un véhicule d'un point A à un point B</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p><strong>« Inspection »</strong> : Documentation photographique de l'état d'un véhicule</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p><strong>« Clara »</strong> : Assistant IA (Intelligence Artificielle) basé sur Google Gemini</p>
              </div>
            </div>
          </section>

          {/* Article 3 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 3 - Accès au Service</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <h3 className="font-bold text-lg">3.1 Inscription</h3>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>L'accès à Finality nécessite la création d'un compte</li>
                <li>Vous devez fournir des informations exactes, complètes et à jour</li>
                <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
                <li>Vous devez avoir au moins 18 ans pour créer un compte</li>
                <li>Un compte par utilisateur (interdiction de comptes multiples)</li>
              </ul>

              <h3 className="font-bold text-lg mt-4">3.2 Conditions d'accès</h3>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Connexion internet stable</li>
                <li>Navigateur compatible (Chrome, Firefox, Safari, Edge - versions récentes)</li>
                <li>Pour mobile : iOS 13+ ou Android 8.0+</li>
                <li>Autorisation de géolocalisation (pour missions et inspections)</li>
                <li>Autorisation d'accès à la caméra (pour inspections)</li>
              </ul>

              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded mt-4">
                <p className="font-semibold text-orange-900">⚠️ Suspension de compte</p>
                <p className="text-sm mt-2">
                  Nous nous réservons le droit de suspendre ou résilier votre compte en cas de :
                  violation des CGU, activité frauduleuse, non-paiement, inactivité prolongée (&gt;12 mois).
                </p>
              </div>
            </div>
          </section>

          {/* Article 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 4 - Services Proposés</h2>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2">🚗 Gestion des Missions</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                  <li>Création et attribution de missions de transport</li>
                  <li>Suivi en temps réel de la position des véhicules</li>
                  <li>Historique complet des transports</li>
                  <li>Notifications et alertes</li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2">📸 Inspection des Véhicules</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                  <li>Documentation photographique géolocalisée</li>
                  <li>Génération automatique de descriptions par IA (Clara/Gemini)</li>
                  <li>Détection et analyse des dommages</li>
                  <li>Rapports PDF téléchargeables</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2">🤖 Assistant IA Clara</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                  <li>Assistance conversationnelle 24/7</li>
                  <li>Conseils personnalisés basés sur votre historique</li>
                  <li>Analyse prédictive et recommandations</li>
                  <li>Désactivable à tout moment</li>
                </ul>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2">💰 Facturation</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                  <li>Génération automatique de devis et factures</li>
                  <li>Suivi des paiements</li>
                  <li>Historique comptable</li>
                  <li>Export des données (Excel, PDF)</li>
                </ul>
              </div>

              <div className="border-l-4 border-cyan-500 pl-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2">👥 Gestion d'Équipe</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1 text-sm">
                  <li>Gestion multi-utilisateurs (chauffeurs, dispatchers)</li>
                  <li>Système de disponibilité</li>
                  <li>Attribution automatique de missions</li>
                  <li>Statistiques de performance</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Article 5 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 5 - Obligations de l'Utilisateur</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p className="font-semibold">Vous vous engagez à :</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>Utiliser le service de manière légale et conforme aux présentes CGU</li>
                <li>Ne pas usurper l'identité d'autrui</li>
                <li>Ne pas diffuser de contenu illégal, diffamatoire ou offensant</li>
                <li>Ne pas tenter de contourner les mesures de sécurité</li>
                <li>Ne pas utiliser de robots, scripts ou outils automatisés</li>
                <li>Respecter les droits de propriété intellectuelle</li>
                <li>Signaler toute anomalie ou dysfonctionnement</li>
                <li>Maintenir la confidentialité de vos identifiants</li>
                <li>Effectuer les inspections de véhicules de manière honnête et complète</li>
                <li>Respecter les délais de transport convenus</li>
              </ul>

              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mt-4">
                <p className="font-semibold text-red-900">🚫 Usages interdits</p>
                <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>Revente ou redistribution du service</li>
                  <li>Extraction massive de données (scraping)</li>
                  <li>Usage à des fins illégales ou frauduleuses</li>
                  <li>Transmission de virus ou codes malveillants</li>
                  <li>Interférence avec le fonctionnement de la Plateforme</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Article 6 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 6 - Responsabilités</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <h3 className="font-bold text-lg">6.1 Responsabilité de Finality</h3>
              <p>Finality s'engage à :</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Fournir un service accessible et fonctionnel</li>
                <li>Protéger vos données personnelles (voir Politique de Confidentialité)</li>
                <li>Effectuer des sauvegardes régulières</li>
                <li>Maintenir la sécurité de la Plateforme</li>
              </ul>

              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mt-3">
                <p className="font-semibold text-yellow-900 mb-2">⚠️ Limitations de responsabilité</p>
                <p className="text-sm">
                  Finality ne saurait être tenue responsable de :
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 mt-2">
                  <li>Interruptions temporaires du service (maintenance, incidents techniques)</li>
                  <li>Pertes de données résultant d'un usage inapproprié</li>
                  <li>Dommages causés par des tiers (hackers, virus)</li>
                  <li>Litiges entre utilisateurs</li>
                  <li>Erreurs de l'IA Clara (les descriptions générées sont indicatives)</li>
                  <li>Problèmes liés à votre connexion internet ou équipement</li>
                </ul>
              </div>

              <h3 className="font-bold text-lg mt-4">6.2 Responsabilité de l'Utilisateur</h3>
              <p>Vous êtes responsable de :</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>L'exactitude des informations fournies</li>
                <li>La qualité des inspections effectuées</li>
                <li>La sécurité de vos identifiants de connexion</li>
                <li>Toute activité effectuée depuis votre compte</li>
                <li>Le respect du Code de la route lors des transports</li>
              </ul>
            </div>
          </section>

          {/* Article 7 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 7 - Tarification et Paiement</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                L'utilisation de Finality est soumise à un abonnement mensuel ou annuel.
                Les tarifs en vigueur sont disponibles sur notre site web.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-2">💳 Modalités de paiement</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li>Paiement sécurisé via Stripe</li>
                  <li>Prélèvement automatique (carte bancaire)</li>
                  <li>Facturation mensuelle ou annuelle</li>
                  <li>TVA applicable : 20% (France)</li>
                </ul>
              </div>

              <p className="text-sm">
                <strong>Période d'essai :</strong> Un essai gratuit de 14 jours est proposé aux nouveaux utilisateurs.
                Aucun paiement ne sera effectué pendant cette période. L'abonnement démarre automatiquement
                à l'issue de la période d'essai sauf annulation.
              </p>

              <p className="text-sm">
                <strong>Résiliation :</strong> Vous pouvez résilier votre abonnement à tout moment depuis votre espace
                personnel. La résiliation prendra effet à la fin de la période de facturation en cours.
                Aucun remboursement au prorata ne sera effectué.
              </p>
            </div>
          </section>

          {/* Article 8 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 8 - Propriété Intellectuelle</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                L'ensemble des éléments de la Plateforme (logiciels, textes, images, design, marques, logos)
                est protégé par le droit de la propriété intellectuelle.
              </p>
              <p>
                Toute reproduction, représentation, modification ou exploitation non autorisée constitue
                une contrefaçon sanctionnée par le Code de la Propriété Intellectuelle.
              </p>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                <p className="font-semibold text-purple-900">© Finality SAS - Tous droits réservés</p>
                <p className="text-sm mt-2">
                  Vous disposez d'une licence d'utilisation personnelle et non transférable du service.
                </p>
              </div>
            </div>
          </section>

          {/* Article 9 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 9 - Données Personnelles</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                Le traitement de vos données personnelles est soumis à notre
                <Link to="/legal/privacy-policy" className="text-blue-600 hover:underline font-semibold ml-1">
                  Politique de Confidentialité
                </Link>, conforme au RGPD.
              </p>
              <p className="text-sm">
                Vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données.
                Contact : privacy@finality.fr
              </p>
            </div>
          </section>

          {/* Article 10 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 10 - Modification des CGU</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                Finality se réserve le droit de modifier les présentes CGU à tout moment.
                Les modifications prendront effet dès leur publication sur la Plateforme.
              </p>
              <p>
                En cas de modification substantielle, vous serez notifié par email ou via l'application.
                L'utilisation continue du service vaut acceptation des nouvelles CGU.
              </p>
            </div>
          </section>

          {/* Article 11 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 11 - Droit Applicable et Juridiction</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                Les présentes CGU sont régies par le <strong>droit français</strong>.
              </p>
              <p>
                En cas de litige, les parties s'efforceront de trouver une solution amiable.
                À défaut, compétence exclusive est attribuée aux tribunaux de <strong>[Ville du siège social]</strong>,
                nonobstant pluralité de défendeurs ou appel en garantie.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900">📧 Médiation</p>
                <p className="text-sm mt-2">
                  Conformément à l'article L.612-1 du Code de la consommation, vous pouvez recourir gratuitement
                  à un médiateur de la consommation en cas de litige.
                </p>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-8">
            <h2 className="text-3xl font-bold mb-4">Contact</h2>
            <div className="space-y-2">
              <p className="text-lg">Pour toute question concernant ces CGU :</p>
              <p className="font-bold text-xl">📧 legal@finality.fr</p>
              <p>📞 [Numéro de téléphone]</p>
              <p>📍 [Adresse postale complète]</p>
            </div>
          </section>

          {/* Acceptation */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-bold text-lg text-green-900 mb-2">
                  ✅ En utilisant Finality, vous reconnaissez avoir lu et accepté ces CGU
                </p>
                <p className="text-sm text-slate-700">
                  Date de première acceptation : [Date de création de votre compte]<br />
                  Version des CGU : 1.0 (15 octobre 2025)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
