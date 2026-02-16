import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, UserCheck, Database, FileText } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/20 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-shadow">
              <span className="text-white font-black text-lg">XZ</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              CHECKSFLEET
            </h1>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-white hover:text-teal-400 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à l'accueil
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-24 max-w-4xl pt-32">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Politique de Confidentialité
          </h1>
        </div>

        <p className="text-slate-300 mb-8 text-lg">
          Chez CHECKSFLEET, la protection de vos données personnelles est notre priorité absolue. Cette politique explique comment nous collectons, utilisons et protégeons vos informations conformément au RGPD.
        </p>

        <div className="space-y-8 text-slate-300">
          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-teal-400" />
              <h2 className="text-2xl font-bold text-white">1. Données collectées</h2>
            </div>

            <h3 className="text-xl font-bold text-white mt-6 mb-3">Données d'inscription</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Mot de passe (chiffré)</li>
              <li>Numéro de téléphone (optionnel)</li>
              <li>Adresse postale (optionnel)</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-6 mb-3">Données d'utilisation</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Missions créées et gérées</li>
              <li>Données de localisation GPS (uniquement pendant les trajets actifs)</li>
              <li>Photos d'inspection de véhicules</li>
              <li>Signatures électroniques</li>
              <li>Historique des transactions</li>
              <li>Logs de connexion et d'utilisation</li>
            </ul>

            <h3 className="text-xl font-bold text-white mt-6 mb-3">Données techniques</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Adresse IP</li>
              <li>Type de navigateur et appareil</li>
              <li>Cookies et identifiants de session</li>
              <li>Pages visitées et durée des visites</li>
            </ul>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-teal-400" />
              <h2 className="text-2xl font-bold text-white">2. Utilisation des données</h2>
            </div>

            <p className="mb-4">Nous utilisons vos données personnelles uniquement pour :</p>

            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Fournir nos services :</strong> Gestion de vos missions, suivi GPS, facturation</li>
              <li><strong className="text-white">Authentification :</strong> Sécuriser votre compte et vérifier votre identité</li>
              <li><strong className="text-white">Communication :</strong> Vous envoyer des notifications importantes, des mises à jour de service</li>
              <li><strong className="text-white">Amélioration :</strong> Analyser l'utilisation pour améliorer nos fonctionnalités</li>
              <li><strong className="text-white">Support client :</strong> Répondre à vos questions et résoudre les problèmes</li>
              <li><strong className="text-white">Conformité légale :</strong> Respecter nos obligations légales et réglementaires</li>
            </ul>

            <div className="mt-6 p-4 bg-teal-500/10 border border-teal-500/30 rounded-lg">
              <p className="text-white font-semibold">
                Nous ne vendons JAMAIS vos données personnelles à des tiers.
              </p>
            </div>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-teal-400" />
              <h2 className="text-2xl font-bold text-white">3. Protection des données</h2>
            </div>

            <h3 className="text-xl font-bold text-white mb-3">Mesures techniques</h3>
            <ul className="list-disc pl-6 space-y-2 mb-6">
              <li><strong className="text-white">Chiffrement :</strong> Toutes les données sont chiffrées en transit (HTTPS/TLS) et au repos (AES-256)</li>
              <li><strong className="text-white">Mots de passe :</strong> Hashés avec bcrypt, jamais stockés en clair</li>
              <li><strong className="text-white">Row Level Security (RLS) :</strong> Isolation stricte des données entre utilisateurs</li>
              <li><strong className="text-white">Authentification :</strong> JWT avec expiration automatique</li>
              <li><strong className="text-white">Sauvegardes :</strong> Quotidiennes et chiffrées</li>
            </ul>

            <h3 className="text-xl font-bold text-white mb-3">Mesures organisationnelles</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Accès limité aux données uniquement au personnel autorisé</li>
              <li>Formation RGPD obligatoire pour tous les employés</li>
              <li>Audits de sécurité réguliers</li>
              <li>Plan de réponse aux incidents de sécurité</li>
              <li>Contrats de confidentialité avec tous les prestataires</li>
            </ul>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="w-6 h-6 text-teal-400" />
              <h2 className="text-2xl font-bold text-white">4. Vos droits RGPD</h2>
            </div>

            <p className="mb-4">Conformément au RGPD, vous disposez des droits suivants :</p>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-2">Droit d'accès</h3>
                <p>Obtenir une copie de toutes vos données personnelles</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-2">Droit de rectification</h3>
                <p>Corriger ou mettre à jour vos données inexactes</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-2">Droit à l'effacement (droit à l'oubli)</h3>
                <p>Supprimer toutes vos données personnelles</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-2">Droit à la limitation du traitement</h3>
                <p>Restreindre le traitement de vos données dans certaines situations</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-2">Droit à la portabilité</h3>
                <p>Récupérer vos données dans un format structuré et lisible (JSON, CSV)</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-2">Droit d'opposition</h3>
                <p>Vous opposer au traitement de vos données pour des raisons légitimes</p>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-2">Droit de retirer votre consentement</h3>
                <p>Retirer votre consentement à tout moment pour les traitements basés sur celui-ci</p>
              </div>
            </div>

            <div className="mt-6 p-6 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/30 rounded-lg">
              <h3 className="font-bold text-white mb-3">Pour exercer vos droits :</h3>
              <ul className="space-y-2">
                <li><strong className="text-white">Email :</strong> contact@checksfleet.com</li>
                <li><strong className="text-white">Courrier :</strong> ChecksFleet - DPO, 76 Résidence Mas de Pérols, 34470 Pérols</li>
                <li><strong className="text-white">Délai de réponse :</strong> Maximum 1 mois</li>
              </ul>
            </div>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-teal-400" />
              <h2 className="text-2xl font-bold text-white">5. Conservation des données</h2>
            </div>

            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Données de compte :</strong> Conservées tant que votre compte est actif</li>
              <li><strong className="text-white">Données de missions :</strong> Conservées 5 ans pour conformité comptable et fiscale</li>
              <li><strong className="text-white">Factures :</strong> Conservées 10 ans (obligation légale)</li>
              <li><strong className="text-white">Logs de connexion :</strong> Conservés 1 an pour sécurité</li>
              <li><strong className="text-white">Données GPS :</strong> Conservées pendant la durée de la mission + 30 jours</li>
            </ul>

            <p className="mt-4">
              Après suppression de votre compte, vos données personnelles sont effacées sous 30 jours, sauf obligation légale de conservation.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">6. Partage des données</h2>

            <p className="mb-4">Vos données peuvent être partagées avec :</p>

            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Prestataires techniques :</strong> Supabase (hébergement), Vercel (hébergement web), Mapbox (cartographie)</li>
              <li><strong className="text-white">Services de paiement :</strong> Pour traiter vos transactions (données bancaires jamais stockées)</li>
              <li><strong className="text-white">Autorités légales :</strong> Sur demande légale ou judiciaire uniquement</li>
            </ul>

            <p className="mt-4">
              Tous nos prestataires sont conformes RGPD et situés dans l'Union Européenne ou soumis à des clauses contractuelles types.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">7. Cookies</h2>

            <p className="mb-4">Nous utilisons les cookies suivants :</p>

            <div className="space-y-3">
              <div className="p-3 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-1">Cookies essentiels (obligatoires)</h3>
                <p className="text-sm">Authentification, sécurité, préférences de langue</p>
              </div>

              <div className="p-3 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-1">Cookies analytiques (avec consentement)</h3>
                <p className="text-sm">Statistiques d'utilisation, amélioration des performances</p>
              </div>

              <div className="p-3 bg-white/5 rounded-lg">
                <h3 className="font-bold text-white mb-1">Cookies fonctionnels (avec consentement)</h3>
                <p className="text-sm">Préférences utilisateur, paramètres de l'interface</p>
              </div>
            </div>

            <p className="mt-4">
              Vous pouvez gérer vos préférences de cookies à tout moment via les paramètres de votre navigateur.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">8. Transferts internationaux</h2>

            <p className="mb-4">
              Toutes vos données sont stockées et traitées dans l'Union Européenne. Nous n'effectuons aucun transfert de données hors UE sans garanties appropriées (clauses contractuelles types, certification Privacy Shield, etc.).
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">9. Mineurs</h2>

            <p>
              Nos services sont réservés aux personnes majeures (18 ans et plus). Nous ne collectons pas sciemment de données personnelles concernant des mineurs.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">10. Modifications de la politique</h2>

            <p className="mb-4">
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. Toute modification importante vous sera notifiée par email ou via une notification dans l'application.
            </p>
            <p>
              La date de dernière mise à jour est indiquée en bas de cette page.
            </p>
          </section>

          <section className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 backdrop-blur-xl border border-teal-500/30 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Réclamation auprès de la CNIL</h2>

            <p className="mb-4">
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
            </p>
            <ul className="space-y-2">
              <li><strong className="text-white">Site web :</strong> <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">www.cnil.fr</a></li>
              <li><strong className="text-white">Adresse :</strong> 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07</li>
              <li><strong className="text-white">Téléphone :</strong> 01 53 73 22 22</li>
            </ul>
          </section>

          <div className="text-center pt-8">
            <p className="text-slate-400 text-sm mb-4">
              Dernière mise à jour : 16 février 2026
            </p>
            <Link
              to="/"
              className="inline-block bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-3 rounded-lg text-white font-semibold hover:shadow-lg hover:shadow-teal-500/50 transition-all"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
