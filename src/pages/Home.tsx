import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import {
  FileText,
  Shield,
  ArrowRight,
  Check,
  Smartphone,
  ChevronDown,
  Menu,
  X,
  Mail,
  MapPin,
  Camera,
  FileCheck,
  ClipboardCheck,
  Route,
  ScanLine,
  Receipt,
  MapPinned,
  Gauge,
  Lock,
  Cloud,
  ChevronRight,
} from 'lucide-react';

/* ─────────────── Animations ─────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

/* ─────────────── Navbar ─────────────── */
const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-16 lg:h-[72px]">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png?v=5" alt="ChecksFleet" className="w-9 h-9 rounded-xl" />
          <span className="text-lg font-bold text-slate-900 tracking-tight">
            Checks<span className="text-teal-500">Fleet</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7 text-[15px] font-medium text-slate-600">
          <a href="#features" className="hover:text-teal-500 transition">Fonctionnalités</a>
          <a href="#how" className="hover:text-teal-500 transition">Comment ça marche</a>
          <a href="#mobile" className="hover:text-teal-500 transition">Mobile</a>
          <a href="#security" className="hover:text-teal-500 transition">Sécurité</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-teal-600 transition">
            Connexion
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition shadow-lg shadow-slate-900/10"
          >
            Essai gratuit
          </Link>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-slate-700">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-t border-slate-100 shadow-xl"
        >
          <div className="px-5 py-5 space-y-3">
            {[
              ['#features', 'Fonctionnalités'],
              ['#how', 'Comment ça marche'],
              ['#mobile', 'Mobile'],
              ['#security', 'Sécurité'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="block py-2 text-slate-700 font-medium"
              >
                {label}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link to="/login" className="py-3 text-center font-medium text-slate-700 border border-slate-200 rounded-xl">
                Connexion
              </Link>
              <Link to="/register" className="py-3 text-center font-semibold text-white bg-slate-900 rounded-xl">
                Essai gratuit
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

/* ─────────────── Hero ─────────────── */
const Hero: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  return (
    <section ref={ref} className="relative min-h-[100svh] flex items-center overflow-hidden bg-[#FAFBFC]">
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      {/* Gradient orbs */}
      <motion.div style={{ y: yBg }} className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-400/8 blur-3xl" />
      </motion.div>

      <div className="relative max-w-6xl mx-auto px-5 pt-28 pb-20 w-full">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-medium mb-8 border border-teal-100"
          >
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            Plateforme professionnelle de convoyage
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={1}
            className="text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[1.1] tracking-tight text-slate-900"
          >
            Gérez vos missions de
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500">
              convoyage automobile
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="mt-6 text-lg sm:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed"
          >
            Inspections, tracking GPS, rapports, facturation — tout en une seule plateforme. Sur le web et sur mobile.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-slate-900 text-white font-semibold rounded-full shadow-xl shadow-slate-900/15 hover:bg-slate-800 hover:scale-[1.02] transition-all duration-200"
            >
              Démarrer gratuitement
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 font-semibold text-slate-700 bg-white rounded-full border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all"
            >
              Découvrir
              <ChevronDown className="w-4 h-4" />
            </a>
          </motion.div>
        </div>

        {/* Dashboard preview — real screenshot */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={scaleIn}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl bg-white border border-slate-200/80 shadow-2xl shadow-slate-900/8 overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-3">
                <div className="max-w-xs mx-auto h-7 bg-white rounded-lg border border-slate-200 flex items-center px-3">
                  <Lock className="w-3 h-3 text-green-600 mr-1.5" />
                  <span className="text-xs text-slate-400">checksfleet.com/dashboard</span>
                </div>
              </div>
            </div>

            <img
              src="/dashboard-preview.png"
              alt="ChecksFleet Dashboard"
              className="w-full h-auto"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────── Features ─────────────── */
const features = [
  {
    icon: Route,
    title: 'Gestion de missions',
    desc: 'Créez et suivez vos missions de convoyage de A à Z avec affectation des conducteurs.',
    color: 'bg-teal-500',
  },
  {
    icon: ClipboardCheck,
    title: 'Inspections complètes',
    desc: 'États des lieux départ et arrivée avec photos, dommages et signatures numériques.',
    color: 'bg-blue-500',
  },
  {
    icon: MapPinned,
    title: 'Tracking GPS',
    desc: 'Suivez vos véhicules en temps réel et partagez un lien de suivi avec vos clients.',
    color: 'bg-indigo-500',
  },
  {
    icon: Receipt,
    title: 'Facturation intégrée',
    desc: 'Générez vos factures et devis professionnels directement depuis la plateforme.',
    color: 'bg-purple-500',
  },
  {
    icon: ScanLine,
    title: 'Scanner de documents',
    desc: 'Numérisez cartes grises, permis et contrats avec OCR et export PDF.',
    color: 'bg-cyan-500',
  },
  {
    icon: FileCheck,
    title: 'Rapports automatiques',
    desc: "Rapports d'inspection détaillés générés en un clic, partageables par lien sécurisé.",
    color: 'bg-emerald-500',
  },
];

const FeaturesSection: React.FC = () => (
  <section id="features" className="py-24 bg-white">
    <div className="max-w-6xl mx-auto px-5">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="text-center mb-16"
      >
        <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">
          Fonctionnalités
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900">
          Tout ce qu'il faut pour vos convoyages
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
          Une plateforme complète pour gérer vos missions, inspections et documents.
        </motion.p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={fadeUp}
            custom={i}
            className="group p-6 rounded-2xl bg-slate-50/60 border border-slate-100 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5 hover:border-slate-200 transition-all duration-300"
          >
            <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
              <f.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{f.title}</h3>
            <p className="text-slate-500 text-[15px] leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ─────────────── How It Works ─────────────── */
const steps = [
  { num: '01', title: 'Créez une mission', desc: 'Renseignez le véhicule, les adresses et le conducteur.', icon: FileText },
  { num: '02', title: 'Inspection départ', desc: 'Photos, état des lieux et signature du client.', icon: Camera },
  { num: '03', title: 'Suivi en temps réel', desc: 'Tracking GPS partageable par lien avec le client.', icon: MapPinned },
  { num: '04', title: 'Livraison & rapport', desc: 'Inspection arrivée, rapport généré, facture créée.', icon: Check },
];

const HowSection: React.FC = () => (
  <section id="how" className="py-24 bg-[#FAFBFC]">
    <div className="max-w-6xl mx-auto px-5">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        className="text-center mb-16"
      >
        <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">
          Comment ça marche
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900">
          Quatre étapes, zéro complexité
        </motion.h2>
      </motion.div>

      <div className="relative grid md:grid-cols-4 gap-8">
        {/* Connecting line */}
        <div className="hidden md:block absolute top-14 left-[12%] right-[12%] h-px bg-gradient-to-r from-teal-200 via-cyan-200 to-blue-200" />

        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            className="relative text-center"
          >
            <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white border-2 border-slate-100 shadow-sm mb-5">
              <s.icon className="w-6 h-6 text-teal-500" />
              <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
                {s.num}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{s.title}</h3>
            <p className="text-slate-500 text-sm">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ─────────────── Mobile ─────────────── */
const MobileSection: React.FC = () => (
  <section id="mobile" className="py-24 bg-white overflow-hidden">
    <div className="max-w-6xl mx-auto px-5">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left – visual */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={scaleIn}
          className="relative flex justify-center"
        >
          {/* Phone mockup */}
          <div className="relative w-[280px]">
            <div className="rounded-[2.5rem] bg-slate-900 p-3 shadow-2xl shadow-slate-900/30">
              <div className="rounded-[2rem] bg-gradient-to-b from-teal-500 to-cyan-600 overflow-hidden">
                {/* Status bar */}
                <div className="flex items-center justify-between px-6 pt-4 pb-2">
                  <span className="text-[11px] text-white/80 font-medium">9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-2 rounded-sm bg-white/60" />
                    <div className="w-3 h-2 rounded-sm bg-white/40" />
                  </div>
                </div>

                {/* App content */}
                <div className="px-5 pb-6 pt-2">
                  <p className="text-white/70 text-xs mb-1">Bonjour</p>
                  <p className="text-white text-lg font-bold mb-5">Mon tableau de bord</p>

                  <div className="space-y-3">
                    {[
                      { label: 'Mission en cours', value: 'Paris → Lyon', color: 'bg-white/20' },
                      { label: 'Inspection', value: 'BMW X3 — Départ', color: 'bg-white/15' },
                      { label: 'Prochaine livraison', value: 'Aujourd\'hui, 14h', color: 'bg-white/10' },
                    ].map((c, i) => (
                      <div key={i} className={`${c.color} backdrop-blur rounded-xl p-3.5`}>
                        <div className="text-[11px] text-white/60 mb-0.5">{c.label}</div>
                        <div className="text-white text-sm font-semibold">{c.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {[
                      { icon: Camera, text: 'Scanner' },
                      { icon: Route, text: 'Missions' },
                      { icon: Receipt, text: 'Factures' },
                    ].map((a, i) => (
                      <div key={i} className="bg-white/10 backdrop-blur rounded-xl py-3 flex flex-col items-center gap-1.5">
                        <a.icon className="w-5 h-5 text-white" />
                        <span className="text-[10px] text-white/80 font-medium">{a.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-b-2xl" />
          </div>

          {/* Floating badges */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute top-12 -right-4 lg:right-4 bg-white rounded-2xl p-3 shadow-lg border border-slate-100"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">Livraison confirmée</div>
                <div className="text-[10px] text-slate-400">Il y a 2 min</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 4, delay: 1 }}
            className="absolute bottom-20 -left-4 lg:left-4 bg-white rounded-2xl p-3 shadow-lg border border-slate-100"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <ScanLine className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">Document scanné</div>
                <div className="text-[10px] text-slate-400">Carte grise — OCR</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right – text */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">
            Application mobile
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Toute la puissance dans votre poche
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-slate-500 mb-8 leading-relaxed">
            L'application ChecksFleet vous accompagne sur le terrain. Inspections photo, scan de documents, suivi GPS — tout fonctionne hors ligne et se synchronise automatiquement.
          </motion.p>

          <div className="space-y-4">
            {[
              { icon: Camera, text: 'Inspections photo avec annotation des dommages' },
              { icon: ScanLine, text: 'Scanner de documents avec OCR intégré' },
              { icon: MapPinned, text: 'Navigation GPS et tracking en temps réel' },
              { icon: Cloud, text: 'Synchronisation automatique avec le cloud' },
              { icon: Smartphone, text: 'Fonctionne hors connexion' },
            ].map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i + 3}
                className="flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-[15px] text-slate-700">{f.text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} custom={8} className="mt-8">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition group"
            >
              Télécharger l'application
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  </section>
);

/* ─────────────── Security / Trust ─────────────── */
const SecuritySection: React.FC = () => (
  <section id="security" className="py-24 bg-[#FAFBFC]">
    <div className="max-w-6xl mx-auto px-5">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left text */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">
            Sécurité & fiabilité
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Vos données sont entre de bonnes mains
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-slate-500 mb-8 leading-relaxed">
            ChecksFleet utilise les standards les plus élevés en matière de sécurité pour protéger vos informations et celles de vos clients.
          </motion.p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, title: 'Chiffrement SSL', desc: 'Toutes les communications sont sécurisées' },
              { icon: Lock, title: 'Données cryptées', desc: 'Stockage chiffré bout en bout' },
              { icon: Cloud, title: 'Sauvegardes auto', desc: 'Backups quotidiens redondants' },
              { icon: Gauge, title: 'Uptime 99.9%', desc: 'Infrastructure haute disponibilité' },
            ].map((t, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                custom={i + 3}
                className="p-4 rounded-xl bg-white border border-slate-100"
              >
                <t.icon className="w-5 h-5 text-teal-500 mb-2" />
                <div className="text-sm font-semibold text-slate-900">{t.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right visual */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={scaleIn}
          className="flex justify-center"
        >
          <div className="relative">
            <div className="w-64 h-64 rounded-full bg-gradient-to-br from-teal-100 to-cyan-50 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-teal-50 to-white flex items-center justify-center border border-teal-100 shadow-inner">
                <Shield className="w-20 h-20 text-teal-500" />
              </div>
            </div>

            {/* Orbiting dots */}
            {[0, 72, 144, 216, 288].map((deg) => (
              <div
                key={deg}
                className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-teal-400 shadow-lg shadow-teal-400/40"
                style={{
                  transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(140px)`,
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

/* ─────────────── CTA ─────────────── */
const CTASection: React.FC = () => (
  <section className="py-24 bg-slate-900">
    <div className="max-w-3xl mx-auto px-5 text-center">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold text-white">
          Prêt à simplifier vos convoyages ?
        </motion.h2>
        <motion.p variants={fadeUp} custom={1} className="mt-4 text-lg text-slate-400">
          Créez votre compte en quelques secondes et commencez à gérer vos missions dès aujourd'hui.
        </motion.p>
        <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/register"
            className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-teal-500 text-white font-semibold rounded-full hover:bg-teal-400 transition shadow-xl shadow-teal-500/25"
          >
            Commencer gratuitement
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-white border border-white/20 rounded-full hover:bg-white/10 transition"
          >
            Se connecter
          </Link>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

/* ─────────────── Footer ─────────────── */
const Footer: React.FC = () => (
  <footer className="bg-slate-950 pt-14 pb-8">
    <div className="max-w-6xl mx-auto px-5">
      <div className="grid md:grid-cols-4 gap-10 pb-10 border-b border-slate-800">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5 mb-4">
            <img src="/logo.png?v=5" alt="ChecksFleet" className="w-9 h-9 rounded-xl" />
            <span className="text-lg font-bold text-white tracking-tight">
              Checks<span className="text-teal-400">Fleet</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            La plateforme tout-en-un pour les professionnels du convoyage automobile. Missions, inspections, tracking et facturation.
          </p>
        </div>

        <div>
          <h4 className="text-white text-sm font-semibold mb-4">Produit</h4>
          <ul className="space-y-2.5">
            {[
              ['#features', 'Fonctionnalités'],
              ['#how', 'Comment ça marche'],
              ['#mobile', 'Application mobile'],
              ['#security', 'Sécurité'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-slate-400 text-sm hover:text-teal-400 transition">{label}</a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white text-sm font-semibold mb-4">Contact</h4>
          <ul className="space-y-3">
            <li className="flex items-center gap-2.5 text-slate-400 text-sm">
              <Mail className="w-4 h-4 text-teal-500" />
              contact@checksfleet.com
            </li>
            <li className="flex items-center gap-2.5 text-slate-400 text-sm">
              <MapPin className="w-4 h-4 text-teal-500" />
              76 Résidence Mas de Pérols, 34470 Pérols
            </li>
            <li className="flex items-center gap-2.5 text-slate-400 text-xs mt-1">
              SIRET : 848 224 349 00017
            </li>
          </ul>
        </div>
      </div>

      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-slate-500 text-xs">
          © {new Date().getFullYear()} ChecksFleet. Tous droits réservés.
        </p>
        <div className="flex gap-5 text-xs text-slate-500">
          <Link to="/legal" className="hover:text-slate-300 transition">Mentions légales</Link>
          <Link to="/legal/privacy-policy" className="hover:text-slate-300 transition">Confidentialité</Link>
        </div>
      </div>
    </div>
  </footer>
);

/* ─────────────── Page ─────────────── */
const Home: React.FC = () => (
  <div className="min-h-screen overflow-x-hidden bg-white">
    <Navbar />
    <Hero />
    <FeaturesSection />
    <HowSection />
    <MobileSection />
    <SecuritySection />
    <CTASection />
    <Footer />
  </div>
);

export default Home;
