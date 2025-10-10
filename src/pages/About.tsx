import { Link } from 'react-router-dom';
import { ArrowLeft, Truck, Users, Target, Award, Heart, Zap } from 'lucide-react';

export default function About() {
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

      <div className="container mx-auto px-6 py-24 pt-32">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mb-6 text-center bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
            Qui sommes-nous ?
          </h1>
          <p className="text-xl text-center text-slate-300 mb-16">
            L'histoire d'une équipe passionnée qui révolutionne le convoyage automobile
          </p>

          <section className="mb-16 bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                <Truck className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold">Notre histoire</h2>
            </div>
            <div className="space-y-4 text-slate-300">
              <p>
                xCrackz est né en 2024 d'un constat simple : les professionnels du convoyage automobile manquaient cruellement d'outils modernes et adaptés à leur activité. Entre les feuilles de calcul Excel dispersées, les photos perdues dans les téléphones et la facturation manuelle chronophage, il était temps de proposer une solution complète et intuitive.
              </p>
              <p>
                Notre équipe fondatrice, composée d'experts en logistique automobile et de développeurs passionnés, a travaillé pendant plus d'un an pour créer la plateforme SaaS la plus complète du marché. Chaque fonctionnalité a été pensée et testée avec de vrais professionnels du terrain.
              </p>
              <p>
                Aujourd'hui, xCrackz accompagne des centaines de convoyeurs indépendants et d'entreprises de toute taille à travers la France et l'Europe. Notre mission ? Simplifier votre quotidien pour que vous puissiez vous concentrer sur l'essentiel : votre métier.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">Nos valeurs</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <ValueCard
                icon={<Target className="w-6 h-6" />}
                title="Excellence"
                description="Nous visons la perfection dans chaque ligne de code et chaque interaction utilisateur"
              />
              <ValueCard
                icon={<Users className="w-6 h-6" />}
                title="Proximité"
                description="À l'écoute de nos utilisateurs, nous améliorons constamment notre plateforme"
              />
              <ValueCard
                icon={<Zap className="w-6 h-6" />}
                title="Innovation"
                description="Toujours en quête des dernières technologies pour vous offrir le meilleur"
              />
              <ValueCard
                icon={<Heart className="w-6 h-6" />}
                title="Passion"
                description="Notre équipe est passionnée par votre métier et votre réussite"
              />
              <ValueCard
                icon={<Award className="w-6 h-6" />}
                title="Fiabilité"
                description="Une plateforme stable, sécurisée et disponible 24h/24, 7j/7"
              />
              <ValueCard
                icon={<Truck className="w-6 h-6" />}
                title="Expertise"
                description="Une connaissance approfondie du secteur du convoyage automobile"
              />
            </div>
          </section>

          <section className="mb-16 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 backdrop-blur-xl border border-teal-500/30 p-8 rounded-2xl">
            <h2 className="text-3xl font-bold mb-6 text-center">Notre vision</h2>
            <div className="space-y-4 text-slate-300">
              <p className="text-lg">
                Nous croyons fermement que la technologie doit être au service des professionnels, pas l'inverse. Notre vision est de créer un écosystème complet où chaque acteur du convoyage automobile peut trouver les outils dont il a besoin pour développer son activité.
              </p>
              <p className="text-lg">
                Au-delà d'une simple plateforme de gestion, xCrackz ambitionne de devenir le réseau social professionnel du convoyage, où convoyeurs, entreprises et clients peuvent se rencontrer, échanger et collaborer en toute confiance.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">L'équipe</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <TeamMember
                name="Jean Dupont"
                role="CEO & Co-fondateur"
                description="15 ans d'expérience dans la logistique automobile"
              />
              <TeamMember
                name="Marie Laurent"
                role="CTO & Co-fondatrice"
                description="Experte en développement SaaS et architecture cloud"
              />
              <TeamMember
                name="Thomas Richard"
                role="Head of Product"
                description="Ancien convoyeur professionnel devenu Product Manager"
              />
            </div>
          </section>

          <section className="mb-16 bg-white/5 backdrop-blur-xl border border-white/20 p-8 rounded-2xl">
            <h2 className="text-3xl font-bold mb-6 text-center">En chiffres</h2>
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">500+</div>
                <div className="text-slate-400">Utilisateurs actifs</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">10 000+</div>
                <div className="text-slate-400">Missions gérées</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">50 000+</div>
                <div className="text-slate-400">Km parcourus</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-teal-400 mb-2">99.9%</div>
                <div className="text-slate-400">Disponibilité</div>
              </div>
            </div>
          </section>

          <section className="text-center bg-gradient-to-r from-teal-500/20 to-cyan-500/20 backdrop-blur-xl border border-teal-500/30 p-12 rounded-3xl">
            <h2 className="text-3xl font-bold mb-4">Rejoignez l'aventure</h2>
            <p className="text-xl text-slate-300 mb-8">
              Faites partie de la communauté xCrackz et transformez votre activité de convoyage
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-gradient-to-r from-teal-500 to-cyan-500 px-10 py-4 rounded-lg text-white font-bold text-lg hover:shadow-xl hover:shadow-teal-500/50 transition-all hover:-translate-y-0.5"
              >
                Créer mon compte gratuit
              </Link>
              <a
                href="mailto:contact@xcrackz.fr"
                className="bg-white/5 backdrop-blur-md border-2 border-white/20 px-10 py-4 rounded-lg text-white font-bold text-lg hover:bg-white/10 transition"
              >
                Nous contacter
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-2xl hover:bg-white/10 hover:border-white/30 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
      <div className="w-14 h-14 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border-2 border-teal-500 rounded-xl flex items-center justify-center mb-4 text-teal-400">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

function TeamMember({ name, role, description }: { name: string; role: string; description: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/20 p-6 rounded-2xl text-center hover:bg-white/10 hover:border-white/30 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
      <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold">
        {name.split(' ').map(n => n[0]).join('')}
      </div>
      <h3 className="text-xl font-bold mb-1">{name}</h3>
      <p className="text-teal-400 mb-3 font-semibold">{role}</p>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}
