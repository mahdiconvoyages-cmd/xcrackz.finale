import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail, FileText, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
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
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Politique de Confidentialité
              </h1>
              <p className="text-slate-600 text-lg">Dernière mise à jour : 19 février 2026</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="backdrop-blur-xl bg-white/80 border border-slate-200 rounded-2xl p-8 shadow-xl space-y-8">
          
          {/* Introduction */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">1. Introduction</h2>
            </div>
            <div className="text-slate-700 leading-relaxed space-y-3">
              <p>
                Bienvenue sur <strong>ChecksFleet</strong>, votre plateforme de gestion de transport de véhicules.
                La protection de vos données personnelles est une priorité absolue pour nous.
              </p>
              <p>
                Cette Politique de Confidentialité décrit comment nous collectons, utilisons, stockons et protégeons
                vos informations personnelles conformément au <strong>Règlement Général sur la Protection des Données (RGPD)</strong>
                et à la loi française <strong>Informatique et Libertés</strong>.
              </p>
              <p className="text-sm bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <strong>📍 Responsable du traitement :</strong><br />
                ChecksFleet — Entreprise Individuelle (Micro-entreprise)<br />
                SIRET : 848 224 349 00017<br />
                Adresse : 76 Résidence Mas de Pérols, 34470 Pérols, France<br />
                Email : contact@checksfleet.com<br />
                DPO (Délégué à la Protection des Données) : dpo@checksfleet.com<br />
                Téléphone : +33 7 64 40 15 99
              </p>
            </div>
          </section>

          {/* Données collectées */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">2. Données Collectées</h2>
            </div>
            <div className="space-y-4">
              <div className="border-l-4 border-cyan-500 pl-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2">📋 Données d'identification</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  <li>Nom et prénom</li>
                  <li>Adresse email</li>
                  <li>Numéro de téléphone</li>
                  <li>Adresse postale (professionnelle)</li>
                  <li>Identifiant unique (UUID)</li>
                </ul>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2">🚗 Données professionnelles</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  <li>Informations sur les véhicules transportés (marque, modèle, immatriculation, VIN)</li>
                  <li>Photos d'inspection des véhicules</li>
                  <li>Descriptions générées par IA (Gemini)</li>
                  <li>Rapports de dommages</li>
                  <li>Historique des missions</li>
                </ul>
              </div>

              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2">📍 Données de géolocalisation</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  <li>Position GPS lors des inspections</li>
                  <li>Adresses de départ et d'arrivée des missions</li>
                  <li>Itinéraires de transport</li>
                  <li>Historique de localisation (uniquement pendant les missions actives)</li>
                </ul>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-bold text-lg text-slate-900 mb-2">💻 Données techniques</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  <li>Adresse IP</li>
                  <li>Adresse IP d'inscription</li>
                  <li>Empreinte numérique de l'appareil (device fingerprint)</li>
                  <li>Type de navigateur et système d'exploitation</li>
                  <li>Cookies et identifiants de session</li>
                  <li>Logs de connexion</li>
                  <li>Données d'utilisation de l'application</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Utilisation des données */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">3. Utilisation des Données</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>Vos données personnelles sont utilisées pour :</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Gestion des comptes utilisateurs</strong> : Création, authentification, gestion du profil</li>
                <li><strong>Exécution des missions</strong> : Attribution, suivi, coordination des transports</li>
                <li><strong>Inspection des véhicules</strong> : Documentation photographique, analyse IA des dommages</li>
                <li><strong>Communication</strong> : Notifications, alertes, support client</li>
                <li><strong>Facturation</strong> : Génération des devis, factures, suivi des paiements</li>
                <li><strong>Amélioration du service</strong> : Analyses statistiques, optimisation des fonctionnalités</li>
                <li><strong>Sécurité</strong> : Détection de fraudes, prévention des abus</li>
                <li><strong>Conformité légale</strong> : Respect des obligations comptables et fiscales</li>
              </ul>
            </div>
          </section>

          {/* Base légale */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">4. Base Légale du Traitement (RGPD)</h2>
            </div>
            <div className="space-y-3 text-slate-700">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-semibold text-blue-900 mb-2">✅ Exécution d'un contrat (Art. 6.1.b RGPD)</p>
                <p className="text-sm">
                  Le traitement de vos données est nécessaire à l'exécution du contrat de service
                  (missions de transport, inspections, facturation).
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="font-semibold text-green-900 mb-2">✅ Consentement (Art. 6.1.a RGPD)</p>
                <p className="text-sm">
                  Vous consentez explicitement au traitement de certaines données (géolocalisation,
                  photos, analyses IA) lors de l'utilisation de l'application.
                </p>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="font-semibold text-purple-900 mb-2">✅ Obligation légale (Art. 6.1.c RGPD)</p>
                <p className="text-sm">
                  Conservation des données comptables et fiscales conformément aux obligations légales françaises.
                </p>
              </div>
              
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="font-semibold text-orange-900 mb-2">✅ Intérêt légitime (Art. 6.1.f RGPD)</p>
                <p className="text-sm">
                  Amélioration du service, détection de fraudes, sécurité de la plateforme.
                </p>
              </div>
            </div>
          </section>

          {/* Partage des données */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">5. Partage des Données</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>Vos données peuvent être partagées avec :</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Services cloud</strong> : Supabase (hébergement base de données - UE), Google Cloud (IA Gemini)</li>
                <li><strong>Outils de géolocalisation</strong> : OpenRouteService, Google Maps</li>
                <li><strong>Services de paiement</strong> : Stripe (conformité PCI-DSS)</li>
                <li><strong>Services de communication</strong> : Notifications push, emails transactionnels</li>
                <li><strong>Autorités compétentes</strong> : Sur demande légale (réquisition judiciaire)</li>
              </ul>
              <p className="bg-red-50 border-l-4 border-red-500 p-4 rounded text-sm">
                <strong>⚠️ Attention :</strong> Nous ne vendons JAMAIS vos données à des tiers. Nous ne partageons
                vos données qu'avec des prestataires conformes au RGPD.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-3">
                <p className="font-semibold text-yellow-900 mb-2">🌐 Transferts hors UE</p>
                <p className="text-sm">
                  Certaines données peuvent être transférées vers des prestataires situés en dehors
                  de l'Union Européenne (Google Cloud pour l'IA Gemini, Stripe pour les paiements).
                  Ces transferts sont encadrés par des <strong>Clauses Contractuelles Types (CCT)</strong> approuvées
                  par la Commission Européenne, garantissant un niveau de protection conforme au RGPD.
                </p>
              </div>
            </div>
          </section>

          {/* Durée de conservation */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">6. Durée de Conservation</h2>
            </div>
            <div className="space-y-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <span className="font-semibold text-slate-900">Données de compte actif</span>
                <span className="text-blue-600 font-bold">Durée de l'abonnement</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <span className="font-semibold text-slate-900">Données de compte inactif</span>
                <span className="text-blue-600 font-bold">3 ans</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <span className="font-semibold text-slate-900">Données comptables (factures)</span>
                <span className="text-blue-600 font-bold">10 ans (obligation légale)</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <span className="font-semibold text-slate-900">Photos d'inspection</span>
                <span className="text-blue-600 font-bold">5 ans</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <span className="font-semibold text-slate-900">Logs de connexion</span>
                <span className="text-blue-600 font-bold">1 an</span>
              </div>
            </div>
          </section>

          {/* Vos droits */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">7. Vos Droits RGPD</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p className="font-semibold">Conformément au RGPD, vous disposez des droits suivants :</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="font-bold text-blue-900">🔍 Droit d'accès</p>
                  <p className="text-sm">Obtenir une copie de vos données</p>
                </div>
                
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="font-bold text-green-900">✏️ Droit de rectification</p>
                  <p className="text-sm">Corriger vos données inexactes</p>
                </div>
                
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="font-bold text-red-900">🗑️ Droit à l'effacement</p>
                  <p className="text-sm">Supprimer vos données (droit à l'oubli)</p>
                </div>
                
                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                  <p className="font-bold text-purple-900">⛔ Droit de limitation</p>
                  <p className="text-sm">Limiter le traitement de vos données</p>
                </div>
                
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <p className="font-bold text-orange-900">📦 Droit à la portabilité</p>
                  <p className="text-sm">Récupérer vos données (format structuré)</p>
                </div>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                  <p className="font-bold text-yellow-900">🚫 Droit d'opposition</p>
                  <p className="text-sm">S'opposer au traitement de vos données</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl p-6 mt-6">
                <p className="font-bold text-lg mb-2">✉️ Pour exercer vos droits :</p>
                <p className="mb-2">Contactez-nous à : <strong>contact@checksfleet.com</strong></p>
                <p className="text-sm">Réponse garantie sous 30 jours (délai RGPD)</p>
              </div>

              <p className="text-sm bg-slate-100 border border-slate-300 rounded p-3">
                <strong>🛡️ Droit de réclamation :</strong> Vous pouvez déposer une réclamation auprès de la 
                <strong> CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) - 
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                  www.cnil.fr
                </a>
              </p>
            </div>
          </section>

          {/* Sécurité */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">8. Sécurité des Données</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données :</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li><strong>Chiffrement SSL/TLS</strong> : Toutes les communications sont chiffrées (HTTPS)</li>
                <li><strong>Authentification sécurisée</strong> : Mots de passe hashés (bcrypt), sessions sécurisées</li>
                <li><strong>Hébergement européen</strong> : Serveurs conformes RGPD (UE)</li>
                <li><strong>Sauvegardes régulières</strong> : Protection contre la perte de données</li>
                <li><strong>Contrôle d'accès</strong> : Accès restreint aux données (principe du moindre privilège)</li>
                <li><strong>Surveillance</strong> : Détection des intrusions, monitoring des accès</li>
                <li><strong>Audits</strong> : Revues régulières de sécurité</li>
              </ul>
            </div>
          </section>

          {/* Permissions de l'application mobile */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">9. Permissions de l'Application Mobile</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>Notre application mobile ChecksFleet demande les permissions suivantes sur votre appareil :</p>
              
              <div className="space-y-4">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="font-bold text-red-900 mb-2">📷 Caméra (android.permission.CAMERA)</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li><strong>Finalité :</strong> Prendre des photos lors des inspections de véhicules pour documenter l'état (dommages, rayures, etc.)</li>
                    <li><strong>Utilisation :</strong> Les photos prises sont utilisées uniquement pour les rapports d'inspection et la documentation des véhicules transportés</li>
                    <li><strong>Stockage :</strong> Les photos sont stockées de manière sécurisée sur nos serveurs (Supabase, hébergé dans l'UE)</li>
                    <li><strong>Partage :</strong> Les photos ne sont partagées qu'avec les parties autorisées (client, transporteur, administrateur)</li>
                    <li><strong>Consentement :</strong> L'accès à la caméra est demandé au moment de l'utilisation. Vous pouvez révoquer cette permission à tout moment dans les paramètres de votre appareil</li>
                  </ul>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="font-bold text-blue-900 mb-2">📍 Géolocalisation (ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION)</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li><strong>Finalité :</strong> Suivi GPS des missions de transport en cours, géolocalisation des inspections</li>
                    <li><strong>Utilisation :</strong> Uniquement pendant les missions actives pour le suivi en temps réel et les rapports d'inspection</li>
                    <li><strong>Consentement :</strong> Demandé explicitement. Vous pouvez désactiver la géolocalisation à tout moment</li>
                  </ul>
                </div>

                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="font-bold text-green-900 mb-2">📂 Stockage (READ/WRITE_EXTERNAL_STORAGE)</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li><strong>Finalité :</strong> Enregistrer les rapports d'inspection en PDF, sauvegarder les photos localement</li>
                    <li><strong>Utilisation :</strong> Accès limité aux fichiers créés par l'application</li>
                  </ul>
                </div>

                <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                  <p className="font-bold text-purple-900 mb-2">🔔 Notifications (POST_NOTIFICATIONS)</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li><strong>Finalité :</strong> Alertes de nouvelles missions, mises à jour de statut, messages du réseau covoiturage</li>
                    <li><strong>Consentement :</strong> Demandé explicitement. Vous pouvez les désactiver dans les paramètres</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                  <p className="font-bold text-yellow-900 mb-2">🌐 Internet (INTERNET / ACCESS_NETWORK_STATE)</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li><strong>Finalité :</strong> Synchronisation des données, envoi des rapports, communication temps réel</li>
                    <li><strong>Utilisation :</strong> Nécessaire au fonctionnement de l'application</li>
                  </ul>
                </div>
              </div>

              <p className="bg-green-50 border-l-4 border-green-500 p-4 rounded text-sm mt-4">
                <strong>✅ Important :</strong> Toutes les permissions sont demandées au moment de leur première utilisation.
                Vous pouvez révoquer n'importe quelle permission à tout moment depuis les <strong>Paramètres &gt; Applications &gt; ChecksFleet &gt; Autorisations</strong> de votre appareil.
                L'application continuera de fonctionner avec des fonctionnalités réduites si certaines permissions sont refusées.
              </p>
            </div>
          </section>

          {/* IA et données */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">10. Traitement des données par Intelligence Artificielle</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                Notre plateforme utilise l'intelligence artificielle (Google Gemini) pour générer des rapports d'inspection
                et analyser l'état des véhicules.
              </p>
              <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
                <p className="font-bold text-purple-900 mb-2">🤖 Traitement IA :</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li>Les photos d'inspection sont analysées par IA pour détecter et décrire les dommages</li>
                  <li>L'IA génère des descriptions à titre <strong>indicatif uniquement</strong> — elles doivent être vérifiées par l'utilisateur</li>
                  <li>Vos images sont envoyées à Google Gemini pour analyse, puis les résultats sont stockés sur nos serveurs</li>
                  <li>Google ne conserve pas vos images au-delà du traitement (API mode)</li>
                  <li>Vous pouvez saisir manuellement les descriptions si vous ne souhaitez pas utiliser l'IA</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
                <p className="font-semibold text-blue-900">✅ Consentement explicite requis</p>
                <p className="text-sm mt-1">
                  L'utilisation de l'IA fait l'objet d'un consentement explicite : une modale de choix est
                  affichée avant chaque utilisation. Vous pouvez refuser l'analyse IA et saisir les descriptions
                  manuellement sans impact sur le service.
                </p>
              </div>
              <p className="text-sm">
                Base légale : <strong>Consentement explicite</strong> (affichage d'une modale de choix avant utilisation)
              </p>
            </div>
          </section>

          {/* Modifications */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">11. Modifications de la Politique</h2>
            </div>
            <div className="text-slate-700 space-y-3">
              <p>
                Nous pouvons mettre à jour cette Politique de Confidentialité pour refléter les évolutions
                de nos pratiques ou les changements législatifs.
              </p>
              <p>
                Les modifications importantes vous seront notifiées par email ou via l'application.
                La date de dernière mise à jour est indiquée en haut de cette page.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl p-8">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-8 h-8" />
              <h2 className="text-3xl font-bold">Contact</h2>
            </div>
            <div className="space-y-2">
              <p className="text-lg">Pour toute question concernant cette politique :</p>
              <p className="font-bold text-xl">📧 contact@checksfleet.com</p>
              <p>📞 +33 7 64 40 15 99</p>
              <p>📍 76 Résidence Mas de Pérols, 34470 Pérols, France</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
