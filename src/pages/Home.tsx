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
  MapPinned,
  Gauge,
  Lock,
  ChevronRight,
  Share2,
  Users,
  Moon,
  WifiOff,
  PenLine,
  Fuel,
  Eye,
  MessageCircle,
  Car,
  PhoneOff,
  Banknote,
  FolderOpen,
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

  const navLinks = [
    ['#problemes', 'Le problème'],
    ['#gps', 'Suivi GPS'],
    ['#inspection', 'État des lieux'],
    ['#entraide', 'Entraide'],
    ['#mobile', 'Mobile'],
  ];

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
          {navLinks.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-teal-500 transition">{label}</a>
          ))}
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

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-t border-slate-100 shadow-xl"
        >
          <div className="px-5 py-5 space-y-3">
            {navLinks.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="block py-2 text-slate-700 font-medium">{label}</a>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link to="/login" className="py-3 text-center font-medium text-slate-700 border border-slate-200 rounded-xl">Connexion</Link>
              <Link to="/register" className="py-3 text-center font-semibold text-white bg-slate-900 rounded-xl">Essai gratuit</Link>
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
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <motion.div style={{ y: yBg }} className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-cyan-400/8 blur-3xl" />
      </motion.div>

      <div className="relative max-w-6xl mx-auto px-5 pt-28 pb-20 w-full">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-sm font-medium mb-8 border border-teal-100"
          >
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            Conçu par des professionnels du convoyage
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold leading-[1.1] tracking-tight text-slate-900"
          >
            Vos clients vous font confiance.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500">
              Donnez-leur une raison.
            </span>
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed"
          >
            Suivi GPS en direct, état des lieux digital, réseau d'entraide entre convoyeurs — tout ce dont vous avez besoin pour travailler sereinement. Sur le web et sur mobile.
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="mt-10 flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link to="/register"
              className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-slate-900 text-white font-semibold rounded-full shadow-xl shadow-slate-900/15 hover:bg-slate-800 hover:scale-[1.02] transition-all duration-200"
            >
              Créer mon compte gratuitement
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="#problemes"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 font-semibold text-slate-700 bg-white rounded-full border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all"
            >
              Voir comment ça marche
              <ChevronDown className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Stat badges */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="mt-12 flex flex-wrap justify-center gap-6 text-sm"
          >
            {[
              { label: 'Zéro litige non documenté', icon: Shield },
              { label: 'GPS temps réel partageable', icon: MapPinned },
              { label: 'Fonctionne hors ligne', icon: WifiOff },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-500">
                <s.icon className="w-4 h-4 text-teal-500" />
                <span>{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Dashboard preview – mobile phone mockup */}
        <motion.div initial="hidden" animate="visible" variants={scaleIn} className="mt-16 flex justify-center">
          <div className="relative w-[280px] sm:w-[320px]">
            <div className="rounded-[2.8rem] bg-slate-900 p-3 shadow-2xl shadow-slate-900/40">
              <div className="rounded-[2.3rem] overflow-hidden bg-black">
                <img src="/dashboard-preview.png" alt="ChecksFleet Dashboard" className="w-full h-auto" />
              </div>
            </div>
            {/* Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-slate-900 rounded-b-2xl" />
            {/* Floating badge */}
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}
              className="absolute -top-3 -right-8 sm:-right-12 bg-white rounded-2xl p-3 shadow-lg border border-slate-100"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Gauge className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">Dashboard</div>
                  <div className="text-[10px] text-slate-400">Toutes vos missions</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

/* ─────────────── Pain Points ─────────────── */
const painPoints = [
  { icon: PhoneOff, text: 'Un client qui appelle toutes les 30 minutes pour savoir où est son véhicule' },
  { icon: Car, text: 'Un litige à l\'arrivée parce que "cette rayure n\'était pas là avant"' },
  { icon: Banknote, text: 'Un trajet retour à vide alors qu\'un collègue passait dans votre zone' },
  { icon: FolderOpen, text: 'Des papiers qui traînent, des photos floues, zéro preuve en cas de problème' },
];

const PainPointsSection: React.FC = () => (
  <section id="problemes" className="py-24 bg-white">
    <div className="max-w-6xl mx-auto px-5">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-16">
        <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-3">
          Le problème
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900">
          Est-ce que vous avez déjà vécu ça ?
        </motion.h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
        {painPoints.map((p, i) => (
          <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
            className="flex items-start gap-4 p-6 rounded-2xl bg-red-50/50 border border-red-100/60"
          >
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <p.icon className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-slate-700 leading-relaxed pt-1.5">{p.text}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={5}
        className="mt-12 text-center"
      >
        <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-teal-50 border border-teal-100">
          <Check className="w-5 h-5 text-teal-600 flex-shrink-0" />
          <p className="text-teal-800 font-medium text-lg">
            ChecksFleet a été conçu précisément pour résoudre tout ça.
          </p>
        </div>
      </motion.div>
    </div>
  </section>
);

/* ─────────────── GPS Tracking Feature ─────────────── */
const GPSSection: React.FC = () => (
  <section id="gps" className="py-24 bg-[#FAFBFC] overflow-hidden">
    <div className="max-w-6xl mx-auto px-5">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left – visual */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}
          className="relative flex justify-center"
        >
          <div className="relative w-[280px] sm:w-[300px]">
            {/* Phone frame with real GPS screenshot */}
            <div className="rounded-[2.8rem] bg-slate-900 p-3 shadow-2xl shadow-slate-900/30">
              <div className="rounded-[2.3rem] overflow-hidden bg-black">
                <img src="/gps-tracking-preview.png" alt="Suivi GPS en direct ChecksFleet" className="w-full h-auto" />
              </div>
            </div>
            {/* Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-slate-900 rounded-b-2xl" />

            {/* Floating link badge */}
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}
              className="absolute -top-3 -right-8 lg:-right-12 bg-white rounded-2xl p-3 shadow-lg border border-slate-100"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">Lien partagé</div>
                  <div className="text-[10px] text-slate-400">checksfleet.com/tracking/k7x...</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right – text */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">
            Suivi GPS en direct
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Vos clients suivent leur véhicule sans vous appeler
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-slate-500 mb-8 leading-relaxed">
            Quand vous partez en mission, l'application génère un <strong className="text-slate-700">lien unique et sécurisé</strong>. Vous l'envoyez au client. Il clique, et il voit son véhicule se déplacer sur une carte en temps réel. Position, vitesse, heure d'arrivée estimée — sans installer quoi que ce soit.
          </motion.p>

          <div className="space-y-4">
            {[
              { icon: Share2, text: 'Lien de suivi généré automatiquement pour chaque mission' },
              { icon: Eye, text: 'Position, vitesse et ETA en direct sur carte interactive' },
              { icon: Lock, text: 'Le lien expire automatiquement après la mission' },
              { icon: PhoneOff, text: 'Résultat : moins d\'appels, plus de confiance' },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp} custom={i + 3} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-[15px] text-slate-700">{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

/* ─────────────── Inspection Feature ─────────────── */
const InspectionSection: React.FC = () => (
  <section id="inspection" className="py-24 bg-white overflow-hidden">
    <div className="max-w-6xl mx-auto px-5">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left – text */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
            État des lieux digital
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Votre meilleure protection contre les litiges
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-slate-500 mb-8 leading-relaxed">
            Fini les disputes à l'arrivée. Fini les <em>"cette bosse était déjà là"</em> sans preuve. Avant de partir, vous faites le tour du véhicule avec votre téléphone. À la livraison, même processus. Le rapport complet est généré automatiquement en PDF.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mb-8">
            <p className="text-slate-700 font-medium mb-4">Avant le départ :</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Camera, text: 'Photos de tous les angles' },
                { icon: Gauge, text: 'Photo du compteur km' },
                { icon: Fuel, text: 'Photo jauge carburant' },
                { icon: PenLine, text: 'Marquage des dommages' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
                  <f.icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{f.text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} custom={4}>
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/60">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <PenLine className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 mb-1">Signature sur votre téléphone</p>
                  <p className="text-sm text-slate-500">Le client signe directement sur l'écran. Le document est horodaté, archivé, infalsifiable.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right – visual */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}
          className="relative flex justify-center"
        >
          <div className="relative w-full max-w-sm">
            {/* Inspection report card */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Rapport d'inspection</p>
                  <p className="text-xs text-slate-400">BMW X3 — AB-123-CD</p>
                </div>
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {['Avant G', 'Face', 'Avant D', 'Profil G', 'Arrière', 'Profil D'].map((label, i) => (
                  <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-4 h-4 text-slate-300 mx-auto mb-0.5" />
                      <span className="text-[9px] text-slate-400">{label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info rows */}
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Kilométrage', value: '42 350 km' },
                  { label: 'Carburant', value: '3/4' },
                  { label: 'Dommages signalés', value: '2 rayures' },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-sm text-slate-500">{row.label}</span>
                    <span className="text-sm font-medium text-slate-900">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Signature */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] text-slate-400 mb-2">Signature client</p>
                <svg className="w-full h-12" viewBox="0 0 300 50">
                  <path d="M20,35 C40,10 60,40 80,25 C100,10 120,35 140,20 C160,5 180,30 200,25 C220,20 240,35 260,30" stroke="#334155" strokeWidth="2" fill="none" strokeLinecap="round" />
                </svg>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">26/02/2026 — 09:41</span>
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Signé</span>
                </div>
              </div>
            </div>

            {/* Floating PDF badge */}
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 4, delay: 1 }}
              className="absolute -bottom-4 -left-4 lg:left-0 bg-white rounded-2xl p-3 shadow-lg border border-slate-100"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-900">PDF généré</div>
                  <div className="text-[10px] text-slate-400">rapport_inspection.pdf</div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

/* ─────────────── Entraide / Network ─────────────── */
const EntraideSection: React.FC = () => (
  <section id="entraide" className="py-24 bg-[#FAFBFC]">
    <div className="max-w-6xl mx-auto px-5">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-16">
        <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-purple-600 uppercase tracking-wider mb-3">
          Réseau d'entraide
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900">
          Fini les trajets retour à vide
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
          Publiez votre trajet, trouvez des collègues qui vont dans la même direction, partagez les frais. L'innovation qui n'existait pas dans le convoyage.
        </motion.p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Card 1 – Publish */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-500 flex items-center justify-center mb-4">
            <Route className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Publiez votre trajet</h3>
          <p className="text-slate-500 text-[15px] leading-relaxed">
            Avant de partir, indiquez votre route. Les convoyeurs de votre réseau voient immédiatement votre trajet sur la carte.
          </p>
        </motion.div>

        {/* Card 2 – Chat */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
          className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-500 flex items-center justify-center mb-4">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Organisez-vous par chat</h3>
          <p className="text-slate-500 text-[15px] leading-relaxed">
            Un collègue a besoin de rentrer ? Il vous contacte via le chat intégré. Vous vous mettez d'accord en quelques messages.
          </p>
        </motion.div>

        {/* Card 3 – Share costs */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
          className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-xl bg-teal-500 flex items-center justify-center mb-4">
            <Banknote className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Partagez les frais</h3>
          <p className="text-slate-500 text-[15px] leading-relaxed">
            Chacun indique sa participation aux frais. Essence, péage — tout est clair et convenu à l'avance. Un retour à 200€ peut devenir 80€.
          </p>
        </motion.div>
      </div>
    </div>
  </section>
);

/* ─────────────── Scanner + More Features ─────────────── */
const features = [
  {
    icon: ScanLine,
    title: 'Scanner de documents',
    desc: 'Numérisez cartes grises, lettre de voiture, CMR ou permis. Détection automatique des bords, mode Pro multi-pages, export PDF.',
    color: 'bg-cyan-500',
  },
  {
    icon: ClipboardCheck,
    title: 'Tableau de bord complet',
    desc: 'Toutes vos missions, historiques de véhicules, statistiques d\'activité et documents archivés — en un seul écran.',
    color: 'bg-teal-500',
  },
  {
    icon: Users,
    title: 'Gestion multi-convoyeurs',
    desc: 'Assignez des missions à vos convoyeurs, suivez leur avancement. Chaque document est rangé automatiquement au bon endroit.',
    color: 'bg-blue-500',
  },
  {
    icon: FileCheck,
    title: 'Rapports PDF automatiques',
    desc: 'Rapports d\'inspection complets générés en un clic : photos, dommages, signature, kilométrage. Prêts à envoyer.',
    color: 'bg-emerald-500',
  },
  {
    icon: Moon,
    title: 'Mode sombre',
    desc: 'Utilisez l\'application de nuit sans vous éblouir. Conçu pour les longues routes et les convoyages nocturnes.',
    color: 'bg-slate-700',
  },
  {
    icon: WifiOff,
    title: 'Fonctionne hors ligne',
    desc: 'Pas de réseau ? Pas grave. Tout se synchronise automatiquement dès que vous retrouvez la connexion.',
    color: 'bg-amber-500',
  },
];

const FeaturesSection: React.FC = () => (
  <section id="features" className="py-24 bg-white">
    <div className="max-w-6xl mx-auto px-5">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-16">
        <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">
          Et en plus
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900">
          Tout ce dont vous avez besoin sur le terrain
        </motion.h2>
        <motion.p variants={fadeUp} custom={2} className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
          Pas de fonctionnalités inutiles. Juste ce qui rend votre quotidien plus simple, plus sûr et plus rentable.
        </motion.p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f, i) => (
          <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp} custom={i}
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

/* ─────────────── Mobile ─────────────── */
const MobileSection: React.FC = () => (
  <section id="mobile" className="py-24 bg-[#FAFBFC] overflow-hidden">
    <div className="max-w-6xl mx-auto px-5">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left – visual */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scaleIn}
          className="relative flex justify-center"
        >
          <div className="relative w-[280px]">
            <div className="rounded-[2.5rem] bg-slate-900 p-3 shadow-2xl shadow-slate-900/30">
              <div className="rounded-[2rem] bg-gradient-to-b from-teal-500 to-cyan-600 overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-4 pb-2">
                  <span className="text-[11px] text-white/80 font-medium">9:41</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-2 rounded-sm bg-white/60" />
                    <div className="w-3 h-2 rounded-sm bg-white/40" />
                  </div>
                </div>

                <div className="px-5 pb-6 pt-2">
                  <p className="text-white/70 text-xs mb-1">Bonjour</p>
                  <p className="text-white text-lg font-bold mb-5">Mon tableau de bord</p>

                  <div className="space-y-3">
                    {[
                      { label: 'Mission en cours', value: 'Paris → Lyon', color: 'bg-white/20' },
                      { label: 'Inspection', value: 'BMW X3 — Départ', color: 'bg-white/15' },
                      { label: 'Entraide', value: '3 convoyeurs proches', color: 'bg-white/10' },
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
                      { icon: Users, text: 'Entraide' },
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
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-b-2xl" />
          </div>

          {/* Floating badges */}
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}
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

          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 4, delay: 1 }}
            className="absolute bottom-20 -left-4 lg:left-4 bg-white rounded-2xl p-3 shadow-lg border border-slate-100"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <ScanLine className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900">Document scanné</div>
                <div className="text-[10px] text-slate-400">Carte grise — PDF</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Right – text */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.p variants={fadeUp} custom={0} className="text-sm font-semibold text-teal-600 uppercase tracking-wider mb-3">
            Application mobile
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
            Vous ne travaillez pas dans un bureau. L'appli non plus.
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-slate-500 mb-8 leading-relaxed">
            ChecksFleet a été conçu pour le terrain. Inspections photo, scan de documents, suivi GPS — tout fonctionne même sans réseau et se synchronise automatiquement.
          </motion.p>

          <div className="space-y-4">
            {[
              { icon: Camera, text: 'Inspections photo avec marquage des dommages' },
              { icon: ScanLine, text: 'Scanner de documents avec détection automatique' },
              { icon: MapPinned, text: 'Suivi GPS en temps réel partageable' },
              { icon: WifiOff, text: 'Fonctionne sans connexion Internet' },
              { icon: Moon, text: 'Mode sombre pour les routes de nuit' },
              { icon: Smartphone, text: 'Compatible iPhone et Android' },
            ].map((f, i) => (
              <motion.div key={i} variants={fadeUp} custom={i + 3} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-[15px] text-slate-700">{f.text}</span>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} custom={9} className="mt-8">
            <Link to="/register"
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

/* ─────────────── Summary Table ─────────────── */
const SummarySection: React.FC = () => {
  const rows = [
    { gain: 'Des clients rassurés', how: 'Suivi GPS en direct avec lien partageable', icon: MapPinned, color: 'text-teal-500' },
    { gain: 'Une protection juridique', how: 'État des lieux photos + signature + PDF', icon: Shield, color: 'text-blue-500' },
    { gain: 'Des économies sur les retours', how: 'Réseau d\'entraide entre convoyeurs', icon: Users, color: 'text-purple-500' },
    { gain: 'Moins de paperasse', how: 'Scanner de documents intégré', icon: ScanLine, color: 'text-cyan-500' },
    { gain: 'Sérénité sur le terrain', how: 'Hors ligne, mode nuit, simple à utiliser', icon: Smartphone, color: 'text-amber-500' },
    { gain: 'Une image professionnelle', how: 'Rapports propres, données organisées', icon: FileCheck, color: 'text-emerald-500' },
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-12">
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold text-slate-900">
            En résumé
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="mt-3 text-lg text-slate-500">
            Ce que ChecksFleet change concrètement dans votre quotidien.
          </motion.p>
        </motion.div>

        <div className="space-y-3">
          {rows.map((r, i) => (
            <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-sm transition-all"
            >
              <r.icon className={`w-5 h-5 ${r.color} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-slate-900">{r.gain}</span>
                <span className="text-slate-400 mx-2">—</span>
                <span className="text-slate-500 text-sm">{r.how}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────── CTA ─────────────── */
const CTASection: React.FC = () => (
  <section className="py-24 bg-slate-900">
    <div className="max-w-3xl mx-auto px-5 text-center">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold text-white">
          Testez sur votre prochaine mission
        </motion.h2>
        <motion.p variants={fadeUp} custom={1} className="mt-4 text-lg text-slate-400">
          Créez votre compte en 2 minutes. Aucun engagement. Toutes les fonctionnalités disponibles immédiatement.
        </motion.p>
        <motion.div variants={fadeUp} custom={2} className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register"
            className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-teal-500 text-white font-semibold rounded-full hover:bg-teal-400 transition shadow-xl shadow-teal-500/25"
          >
            Créer mon compte gratuitement
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link to="/login"
            className="inline-flex items-center justify-center px-7 py-3.5 font-semibold text-white border border-white/20 rounded-full hover:bg-white/10 transition"
          >
            Se connecter
          </Link>
        </motion.div>
        <motion.p variants={fadeUp} custom={3} className="mt-6 text-sm text-slate-500">
          Pas de carte bancaire requise. Pas de surprise.
        </motion.p>
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
            Conçu pour les professionnels du convoyage. Suivi GPS, état des lieux digital, réseau d'entraide — tout ce qu'il faut pour travailler sereinement.
          </p>
        </div>

        <div>
          <h4 className="text-white text-sm font-semibold mb-4">Produit</h4>
          <ul className="space-y-2.5">
            {[
              ['#gps', 'Suivi GPS en direct'],
              ['#inspection', 'État des lieux'],
              ['#entraide', 'Réseau d\'entraide'],
              ['#features', 'Toutes les fonctionnalités'],
              ['#mobile', 'Application mobile'],
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
    <PainPointsSection />
    <GPSSection />
    <InspectionSection />
    <EntraideSection />
    <FeaturesSection />
    <MobileSection />
    <SummarySection />
    <CTASection />
    <Footer />
  </div>
);

export default Home;
