import { ArrowLeft, ShoppingCart, CreditCard, RefreshCw, AlertTriangle, Scale, Clock, Shield, CheckCircle, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CGV() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-slate-100">
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
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Conditions Générales de Vente
              </h1>
              <p className="text-slate-600 text-lg">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-8 shadow-xl space-y-8">
          
          {/* Article 1 - Objet */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 1 — Objet</h2>
            </div>
            <div className="text-slate-700 leading-relaxed space-y-3">
              <p>
                Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre :
              </p>
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
                <p className="font-semibold text-emerald-900">📍 Le Vendeur :</p>
                <p className="text-sm mt-2">
                  <strong>ChecksFleet</strong> — Entreprise Individuelle (Micro-entreprise)<br />
                  SIRET : 848 224 349 00017<br />
                  Siège social : 76 Résidence Mas de Pérols, 34470 Pérols, France<br />
                  Email : contact@checksfleet.com<br />
                  Téléphone : +33 7 64 40 15 99<br />
                  TVA non applicable — Art. 293 B du CGI
                </p>
              </div>
              <p>
                Et toute personne physique ou morale (ci-après « le Client ») souhaitant acquérir les services
                proposés par ChecksFleet, accessibles via le site <strong>www.checksfleet.com</strong> et l'application mobile ChecksFleet.
              </p>
              <p>
                Toute commande de services implique l'acceptation sans réserve des présentes CGV.
              </p>
            </div>
          </section>

          {/* Article 2 - Services */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 2 — Description des Services</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>ChecksFleet propose les services numériques suivants :</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Abonnement mensuel ou annuel</strong> : accès à la plateforme de gestion de transport de véhicules (création de missions, inspections, facturation, gestion d'équipe, suivi GPS)</li>
                <li><strong>Système de crédits</strong> : achat de crédits permettant l'utilisation de fonctionnalités avancées (rapports d'inspection IA, exports, etc.)</li>
                <li><strong>Services premium</strong> : fonctionnalités additionnelles disponibles selon le plan choisi</li>
              </ul>
              <p className="text-sm">
                Les caractéristiques détaillées de chaque service sont décrites sur la page Tarification de notre site web.
              </p>
            </div>
          </section>

          {/* Article 3 - Tarifs */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 3 — Tarifs et Paiement</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <h3 className="font-bold text-lg">3.1 Prix</h3>
              <p>
                Les prix des services sont indiqués en euros (€) TTC. Conformément à l'article 293 B du Code Général
                des Impôts, la TVA n'est pas applicable (Micro-entreprise).
              </p>
              <p>
                ChecksFleet se réserve le droit de modifier ses tarifs à tout moment.
                Les prix applicables sont ceux en vigueur au jour de la commande.
                Toute modification tarifaire sera notifiée avec un préavis de 30 jours pour les abonnements en cours.
              </p>

              <h3 className="font-bold text-lg mt-4">3.2 Modalités de paiement</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li>Paiement sécurisé par carte bancaire (Visa, Mastercard)</li>
                  <li>Paiement par virement bancaire sur demande</li>
                  <li>Prélèvement automatique pour les abonnements récurrents</li>
                  <li>Facturation mensuelle ou annuelle selon le plan choisi</li>
                </ul>
              </div>

              <h3 className="font-bold text-lg mt-4">3.3 Retard de paiement</h3>
              <p className="text-sm">
                En cas de retard de paiement, des pénalités de retard au taux légal en vigueur seront appliquées,
                ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement (Art. L.441-10 C. com.).
                L'accès au service pourra être suspendu après mise en demeure restée sans effet sous 15 jours.
              </p>

              <h3 className="font-bold text-lg mt-4">3.4 Crédits</h3>
              <p className="text-sm">
                Les crédits achetés sont valables pendant une durée de 12 mois à compter de leur date d'achat.
                Les crédits non utilisés à l'expiration de cette période seront perdus et ne donneront lieu à aucun remboursement.
                Les crédits ne sont ni transférables ni échangeables contre de l'argent.
              </p>
            </div>
          </section>

          {/* Article 4 - Droit de rétractation */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 4 — Droit de Rétractation</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <h3 className="font-bold text-lg">4.1 Principe</h3>
              <p>
                Conformément aux articles L.221-18 et suivants du Code de la consommation, le Client consommateur
                dispose d'un délai de <strong>14 jours calendaires</strong> à compter de la souscription pour exercer
                son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
              </p>

              <h3 className="font-bold text-lg mt-4">4.2 Exception pour contenu numérique</h3>
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                <p className="font-semibold text-orange-900">⚠️ Exception légale (Art. L.221-28, 13° C. conso.)</p>
                <p className="text-sm mt-2">
                  Le droit de rétractation ne peut pas être exercé pour les fournitures de <strong>contenu numérique
                  non fourni sur support matériel</strong> dont l'exécution a commencé avec votre accord exprès et après
                  renonciation expresse à votre droit de rétractation.
                </p>
                <p className="text-sm mt-2">
                  Ainsi, si vous avez commencé à utiliser les services ChecksFleet (création de missions, inspections,
                  utilisation de crédits) pendant le délai de rétractation et que vous avez expressément consenti au 
                  commencement de l'exécution avant l'expiration du délai, vous renoncez à votre droit de rétractation.
                </p>
              </div>

              <h3 className="font-bold text-lg mt-4">4.3 Exercice du droit de rétractation</h3>
              <p>
                Pour exercer votre droit de rétractation (si applicable), vous devez notifier votre décision par une
                déclaration dénuée d'ambiguïté :
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4 text-sm">
                <li>Par email : <strong>contact@checksfleet.com</strong></li>
                <li>Par courrier : ChecksFleet, 76 Résidence Mas de Pérols, 34470 Pérols, France</li>
              </ul>
              <p className="text-sm mt-2">
                Vous pouvez utiliser le formulaire type de rétractation prévu à l'annexe de l'article L.221-5 du Code de la consommation,
                mais ce n'est pas obligatoire.
              </p>

              <h3 className="font-bold text-lg mt-4">4.4 Remboursement</h3>
              <p className="text-sm">
                En cas de rétractation valide, le remboursement sera effectué dans un délai maximum de 14 jours
                à compter de la réception de votre demande, par le même moyen de paiement que celui utilisé
                pour la transaction initiale, sauf accord contraire.
              </p>
            </div>
          </section>

          {/* Article 5 - Durée et résiliation */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 5 — Durée et Résiliation</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <h3 className="font-bold text-lg">5.1 Durée de l'abonnement</h3>
              <p>
                L'abonnement est souscrit pour une durée mensuelle ou annuelle renouvelable tacitement,
                sauf résiliation par le Client avant la fin de la période en cours.
              </p>

              <h3 className="font-bold text-lg mt-4">5.2 Résiliation par le Client</h3>
              <p>
                Vous pouvez résilier votre abonnement à tout moment depuis votre espace personnel
                (rubrique « Paramètres &gt; Abonnement »). La résiliation prend effet à la fin de la période
                de facturation en cours. Aucun remboursement au prorata ne sera effectué pour la période
                restante, sauf exercice du droit de rétractation dans les conditions de l'Article 4.
              </p>

              <h3 className="font-bold text-lg mt-4">5.3 Résiliation par ChecksFleet</h3>
              <p>
                ChecksFleet peut résilier l'abonnement en cas de violation des CGU ou CGV, avec un préavis
                de 15 jours sauf faute grave. En cas de résiliation pour faute de ChecksFleet, un remboursement
                au prorata sera effectué.
              </p>
            </div>
          </section>

          {/* Article 6 - Responsabilité */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 6 — Responsabilité</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                ChecksFleet s'engage à fournir les services avec diligence et selon les règles de l'art.
                Il s'agit d'une <strong>obligation de moyens</strong>.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-4 text-sm">
                <li>ChecksFleet ne saurait être tenue responsable des interruptions temporaires pour maintenance</li>
                <li>ChecksFleet ne garantit pas l'exactitude absolue des descriptions générées (à titre indicatif)</li>
                <li>La responsabilité de ChecksFleet est limitée au montant des sommes versées par le Client au cours des 12 derniers mois</li>
                <li>ChecksFleet n'est pas responsable des dommages indirects (perte de chiffre d'affaires, données, etc.)</li>
              </ul>
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mt-3">
                <p className="font-semibold text-red-900">⚠️ Force majeure</p>
                <p className="text-sm mt-2">
                  ChecksFleet ne pourra être tenue responsable en cas de force majeure telle que définie
                  à l'article 1218 du Code civil (catastrophes naturelles, pannes d'infrastructure, cyberattaques
                  massives, décisions gouvernementales, etc.).
                </p>
              </div>
            </div>
          </section>

          {/* Article 7 - Garanties */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 7 — Garanties</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                Le Client bénéficie des garanties légales prévues par le Code de la consommation :
              </p>
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-900">Garantie de conformité (Art. L.217-3 et suivants)</p>
                  <p className="text-sm mt-1">
                    Le contenu numérique fourni doit être conforme au contrat et présenter les qualités
                    mentionnées dans la description du service. Le Client dispose d'un délai de 2 ans
                    pour agir en garantie de conformité.
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-semibold text-green-900">Garantie des vices cachés (Art. 1641 et suivants C. civ.)</p>
                  <p className="text-sm mt-1">
                    Le Client peut agir en garantie des vices cachés dans un délai de 2 ans à compter
                    de la découverte du vice.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Article 8 - Données personnelles */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 8 — Données Personnelles</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                Les données personnelles collectées dans le cadre de la vente sont traitées conformément
                à notre{' '}
                <Link to="/legal/privacy-policy" className="text-blue-600 hover:underline font-semibold">
                  Politique de Confidentialité
                </Link>
                {' '}et au RGPD.
              </p>
              <p className="text-sm">
                Le responsable du traitement est ChecksFleet. Vos données sont conservées pour la durée
                nécessaire à l'exécution du contrat et aux obligations légales (10 ans pour les données comptables).
              </p>
            </div>
          </section>

          {/* Article 9 - Médiation */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 9 — Médiation et Litiges</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <h3 className="font-bold text-lg">9.1 Réclamation préalable</h3>
              <p>
                En cas de réclamation, le Client est invité à contacter le service client à l'adresse
                <strong> contact@checksfleet.com</strong>. Nous nous engageons à répondre dans un délai de 30 jours.
              </p>

              <h3 className="font-bold text-lg mt-4">9.2 Médiation de la consommation</h3>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="font-semibold text-blue-900">📧 Médiateur désigné</p>
                <p className="text-sm mt-2">
                  Conformément aux articles L.611-1 et R.612-1 du Code de la consommation, le Client peut recourir
                  gratuitement au service de médiation suivant :
                </p>
                <p className="text-sm mt-2 font-semibold">
                  CM2C — Centre de Médiation de la Consommation de Conciliateurs de Justice
                </p>
                <ul className="text-sm mt-1 list-disc list-inside space-y-1">
                  <li>Site web : <a href="https://www.cm2c.net" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.cm2c.net</a></li>
                  <li>Adresse : 14 rue Saint-Jean, 75017 Paris</li>
                </ul>
              </div>

              <h3 className="font-bold text-lg mt-4">9.3 Plateforme européenne de règlement en ligne des litiges</h3>
              <p className="text-sm">
                Conformément à l'article 14 du Règlement (UE) n°524/2013, le Client peut accéder à la plateforme
                européenne de règlement en ligne des litiges (RLL) à l'adresse :{' '}
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  https://ec.europa.eu/consumers/odr
                </a>
              </p>

              <h3 className="font-bold text-lg mt-4">9.4 Juridiction compétente</h3>
              <p className="text-sm">
                À défaut de résolution amiable ou de médiation, les litiges relèveront de la compétence exclusive
                des tribunaux de <strong>Montpellier</strong>, conformément au droit français.
              </p>
            </div>
          </section>

          {/* Article 10 - Droit applicable */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Scale className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold text-slate-900">Article 10 — Droit Applicable</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                Les présentes CGV sont soumises au <strong>droit français</strong>.
              </p>
              <p className="text-sm">
                Si l'une des clauses des présentes CGV est déclarée nulle ou inapplicable par un tribunal compétent,
                les autres clauses demeurent en vigueur et de plein effet.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-8 h-8" />
              <h2 className="text-3xl font-bold">Contact</h2>
            </div>
            <div className="space-y-2">
              <p className="text-lg">Pour toute question concernant ces CGV :</p>
              <p className="font-bold text-xl">📧 contact@checksfleet.com</p>
              <p>📞 +33 7 64 40 15 99</p>
              <p>📍 76 Résidence Mas de Pérols, 34470 Pérols, France</p>
            </div>
          </section>

          {/* Acceptation */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-bold text-lg text-green-900 mb-2">
                  ✅ En souscrivant à un service ChecksFleet, vous reconnaissez avoir lu et accepté les présentes CGV
                </p>
                <p className="text-sm text-slate-700">
                  Ces CGV sont applicables à compter de leur publication.<br />
                  Version des CGV : 1.0
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
