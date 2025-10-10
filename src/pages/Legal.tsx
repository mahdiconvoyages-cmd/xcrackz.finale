import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Legal() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/20 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 hover:scale-105 transition-transform group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/50 transition-shadow">
              <span className="text-white font-black text-lg">XZ</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
              xCrackz
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
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
          Mentions Légales
        </h1>

        <div className="space-y-8 text-slate-300">
          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">1. Éditeur du site</h2>
            <p className="mb-2">
              Le site xCrackz est édité par :
            </p>
            <div className="pl-4 space-y-1">
              <p><strong className="text-white">Raison sociale :</strong> xCrackz SAS</p>
              <p><strong className="text-white">Forme juridique :</strong> Société par Actions Simplifiée</p>
              <p><strong className="text-white">Capital social :</strong> 10 000 €</p>
              <p><strong className="text-white">Siège social :</strong> 123 Rue du Convoyage, 75001 Paris, France</p>
              <p><strong className="text-white">SIRET :</strong> 123 456 789 00010</p>
              <p><strong className="text-white">RCS :</strong> Paris B 123 456 789</p>
              <p><strong className="text-white">N° TVA intracommunautaire :</strong> FR 12 123456789</p>
              <p><strong className="text-white">Email :</strong> contact@xcrackz.fr</p>
              <p><strong className="text-white">Téléphone :</strong> +33 1 23 45 67 89</p>
            </div>
            <p className="mt-4">
              <strong className="text-white">Directeur de publication :</strong> Jean Dupont, Président de xCrackz SAS
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">2. Hébergement</h2>
            <p className="mb-2">
              Le site xCrackz est hébergé par :
            </p>
            <div className="pl-4 space-y-1">
              <p><strong className="text-white">Hébergeur :</strong> Vercel Inc.</p>
              <p><strong className="text-white">Adresse :</strong> 340 S Lemon Ave, Walnut, CA 91789, USA</p>
              <p><strong className="text-white">Site web :</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">vercel.com</a></p>
            </div>
            <p className="mt-4 mb-2">
              Base de données hébergée par :
            </p>
            <div className="pl-4 space-y-1">
              <p><strong className="text-white">Hébergeur :</strong> Supabase Inc.</p>
              <p><strong className="text-white">Adresse :</strong> 970 Toa Payoh North, Singapore</p>
              <p><strong className="text-white">Site web :</strong> <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">supabase.com</a></p>
            </div>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">3. Propriété intellectuelle</h2>
            <p className="mb-4">
              L'ensemble du contenu de ce site (textes, images, vidéos, logos, icônes, sons, logiciels, etc.) est la propriété exclusive de xCrackz SAS ou de ses partenaires, sauf mention contraire.
            </p>
            <p className="mb-4">
              Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de xCrackz SAS.
            </p>
            <p>
              La marque xCrackz, ainsi que tous les signes distinctifs reproduits sur le site, sont la propriété exclusive de xCrackz SAS. Toute reproduction totale ou partielle de ces marques sans autorisation est interdite.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">4. Protection des données personnelles</h2>
            <p className="mb-4">
              Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données personnelles vous concernant.
            </p>
            <p className="mb-4">
              Pour exercer ces droits, vous pouvez nous contacter :
            </p>
            <div className="pl-4 space-y-1">
              <p><strong className="text-white">Par email :</strong> dpo@xcrackz.fr</p>
              <p><strong className="text-white">Par courrier :</strong> xCrackz SAS - DPO, 123 Rue du Convoyage, 75001 Paris, France</p>
            </div>
            <p className="mt-4">
              Les données collectées sur ce site sont traitées de manière confidentielle et sécurisée. Elles ne sont jamais vendues ou partagées avec des tiers sans votre consentement explicite, sauf obligation légale.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">5. Cookies</h2>
            <p className="mb-4">
              Le site xCrackz utilise des cookies pour améliorer l'expérience utilisateur et analyser le trafic. Les cookies sont de petits fichiers textes stockés sur votre appareil.
            </p>
            <p className="mb-4">
              <strong className="text-white">Types de cookies utilisés :</strong>
            </p>
            <ul className="list-disc pl-8 space-y-2">
              <li><strong className="text-white">Cookies essentiels :</strong> Nécessaires au fonctionnement du site (authentification, sécurité)</li>
              <li><strong className="text-white">Cookies analytiques :</strong> Pour mesurer l'audience et améliorer nos services</li>
              <li><strong className="text-white">Cookies fonctionnels :</strong> Pour mémoriser vos préférences</li>
            </ul>
            <p className="mt-4">
              Vous pouvez paramétrer votre navigateur pour refuser les cookies. Cependant, certaines fonctionnalités du site pourraient ne plus être accessibles.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">6. Responsabilité</h2>
            <p className="mb-4">
              xCrackz SAS s'efforce de fournir des informations exactes et à jour sur son site. Toutefois, nous ne pouvons garantir l'exactitude, la précision ou l'exhaustivité des informations mises à disposition.
            </p>
            <p className="mb-4">
              xCrackz SAS ne pourra être tenu responsable des dommages directs ou indirects résultant de l'utilisation du site ou de l'impossibilité d'y accéder.
            </p>
            <p>
              Le site peut contenir des liens vers des sites externes. xCrackz SAS n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">7. Loi applicable et juridiction</h2>
            <p className="mb-4">
              Les présentes mentions légales sont régies par le droit français.
            </p>
            <p>
              En cas de litige, et à défaut d'accord amiable, les tribunaux de Paris seront seuls compétents.
            </p>
          </section>

          <section className="bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">8. Contact</h2>
            <p className="mb-2">
              Pour toute question concernant les mentions légales ou le site xCrackz, vous pouvez nous contacter :
            </p>
            <div className="pl-4 space-y-1">
              <p><strong className="text-white">Email :</strong> contact@xcrackz.fr</p>
              <p><strong className="text-white">Téléphone :</strong> +33 1 23 45 67 89</p>
              <p><strong className="text-white">Adresse :</strong> 123 Rue du Convoyage, 75001 Paris, France</p>
            </div>
          </section>

          <div className="text-center pt-8">
            <p className="text-slate-400 text-sm">
              Dernière mise à jour : 10 octobre 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
