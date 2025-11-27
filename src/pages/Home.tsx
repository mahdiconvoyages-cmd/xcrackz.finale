import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  FileText,
  Car,
  CreditCard,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  Check,
  Star,
  Users,
  Globe,
  Smartphone,
  ChevronDown,
  Play,
  Sparkles,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Camera,
  FileCheck,
  Send,
  ClipboardCheck,
  Timer
} from 'lucide-react';

// Animation variants with proper typing
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

// Hero images carousel
const heroImages = [
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1449130468610-eac3c34ab9d6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80'
];

// Navbar Component
const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-lg shadow-teal-500/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className={`text-xl font-bold ${isScrolled ? 'text-slate-800' : 'text-slate-800'}`}>
              Auto<span className="text-teal-500">Wise</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className={`font-medium hover:text-teal-500 transition ${isScrolled ? 'text-slate-600' : 'text-slate-700'}`}>
              Fonctionnalités
            </a>
            <a href="#process" className={`font-medium hover:text-teal-500 transition ${isScrolled ? 'text-slate-600' : 'text-slate-700'}`}>
              Comment ça marche
            </a>
            <a href="#pricing" className={`font-medium hover:text-teal-500 transition ${isScrolled ? 'text-slate-600' : 'text-slate-700'}`}>
              Tarifs
            </a>
            <a href="#testimonials" className={`font-medium hover:text-teal-500 transition ${isScrolled ? 'text-slate-600' : 'text-slate-700'}`}>
              Témoignages
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 font-medium text-slate-700 hover:text-teal-600 transition"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105 transition-all duration-300"
            >
              Commencer
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-100"
          >
            <div className="px-4 py-6 space-y-4">
              <a href="#features" className="block py-2 text-slate-700 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Fonctionnalités
              </a>
              <a href="#process" className="block py-2 text-slate-700 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Comment ça marche
              </a>
              <a href="#pricing" className="block py-2 text-slate-700 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Tarifs
              </a>
              <a href="#testimonials" className="block py-2 text-slate-700 font-medium" onClick={() => setMobileMenuOpen(false)}>
                Témoignages
              </a>
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                <Link to="/login" className="w-full py-3 text-center font-medium text-slate-700 border border-slate-200 rounded-xl">
                  Connexion
                </Link>
                <Link to="/register" className="w-full py-3 text-center font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl">
                  Commencer gratuitement
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

// Hero Section
const HeroSection: React.FC = () => {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-teal-50/50 to-cyan-50/30">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 right-20 w-96 h-96 bg-teal-400 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-cyan-400 rounded-full blur-3xl opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-teal-300 to-cyan-300 rounded-full blur-3xl opacity-10" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center lg:text-left"
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-medium mb-6"
            >
              <Sparkles className="w-4 h-4" />
              Solution n°1 pour concessionnaires
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight"
            >
              Gérez vos{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">
                véhicules
              </span>{' '}
              et{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-500">
                inspections
              </span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-6 text-lg sm:text-xl text-slate-600 max-w-xl mx-auto lg:mx-0"
            >
              Automatisez vos inspections véhicules, générez des rapports professionnels et factures en quelques clics. 
              Gagnez du temps et augmentez votre efficacité.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-2xl shadow-xl shadow-teal-500/30 hover:shadow-2xl hover:shadow-teal-500/40 hover:scale-105 transition-all duration-300"
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold rounded-2xl shadow-lg hover:shadow-xl border border-slate-200 hover:border-teal-300 transition-all duration-300">
                <Play className="w-5 h-5 text-teal-500" />
                Voir la démo
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeInUp}
              className="mt-12 grid grid-cols-3 gap-6 max-w-md mx-auto lg:mx-0"
            >
              <div>
                <div className="text-3xl font-bold text-slate-900">5000+</div>
                <div className="text-sm text-slate-500">Inspections</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900">500+</div>
                <div className="text-sm text-slate-500">Entreprises</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-slate-900">99%</div>
                <div className="text-sm text-slate-500">Satisfaction</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right - Image Carousel */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage}
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7 }}
                  src={heroImages[currentImage]}
                  alt="Vehicle inspection"
                  className="w-full h-[400px] lg:h-[500px] object-cover"
                />
              </AnimatePresence>

              {/* Floating Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                    <FileCheck className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900">Inspection terminée</div>
                    <div className="text-xs text-slate-500">BMW Série 3 - Rapport généré</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-teal-500">98%</div>
                    <div className="text-xs text-slate-500">Score</div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Image Indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentImage
                      ? 'w-8 bg-teal-500'
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <ChevronDown className="w-6 h-6 text-teal-500" />
      </motion.div>
    </section>
  );
};

// Features Section
const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Camera,
      title: 'Inspections Photo',
      description: 'Capturez chaque détail avec notre système de photos guidé et intuitif',
      color: 'from-teal-500 to-cyan-500'
    },
    {
      icon: FileText,
      title: 'Rapports Automatiques',
      description: 'Génération instantanée de rapports professionnels personnalisables',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: CreditCard,
      title: 'Facturation Intégrée',
      description: 'Créez et envoyez vos factures directement depuis la plateforme',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avancés',
      description: 'Suivez vos performances avec des tableaux de bord détaillés',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: Smartphone,
      title: 'Application Mobile',
      description: 'Travaillez sur le terrain avec notre app iOS et Android',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Shield,
      title: 'Sécurité Maximale',
      description: 'Vos données sont chiffrées et sécurisées en permanence',
      color: 'from-pink-500 to-rose-500'
    }
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-medium mb-4"
          >
            <Zap className="w-4 h-4" />
            Fonctionnalités puissantes
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
            Tout ce dont vous avez{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">besoin</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Une suite complète d'outils pour gérer vos véhicules, inspections et facturation en toute simplicité
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group p-6 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg mb-5`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Process Section
const ProcessSection: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Créez votre compte',
      description: 'Inscription gratuite en moins de 2 minutes',
      icon: Users
    },
    {
      number: '02',
      title: 'Ajoutez vos véhicules',
      description: 'Importez ou saisissez vos véhicules facilement',
      icon: Car
    },
    {
      number: '03',
      title: 'Lancez une inspection',
      description: 'Suivez le processus guidé étape par étape',
      icon: ClipboardCheck
    },
    {
      number: '04',
      title: 'Générez vos rapports',
      description: 'Obtenez des documents professionnels instantanément',
      icon: Send
    }
  ];

  return (
    <section id="process" className="py-24 bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 text-teal-700 rounded-full text-sm font-medium mb-4"
          >
            <Timer className="w-4 h-4" />
            Simple & Rapide
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
            Comment{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">ça marche</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            En 4 étapes simples, passez de l'inscription à la génération de vos premiers rapports
          </motion.p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-teal-300 to-cyan-300" />
              )}
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute -top-4 -left-2 text-6xl font-black text-teal-100">{step.number}</div>
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg mb-4">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Testimonials Section
const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      name: 'Jean-Pierre Dubois',
      role: 'Directeur Commercial, AutoPlus',
      image: 'https://randomuser.me/api/portraits/men/1.jpg',
      content: 'AutoWise a transformé notre façon de gérer les inspections. Nous avons gagné 40% de temps sur chaque véhicule.',
      rating: 5
    },
    {
      name: 'Marie Laurent',
      role: 'Gérante, Garage du Centre',
      image: 'https://randomuser.me/api/portraits/women/2.jpg',
      content: 'Interface intuitive, rapports professionnels, et support réactif. Je recommande à tous les professionnels auto.',
      rating: 5
    },
    {
      name: 'Thomas Martin',
      role: 'Expert automobile indépendant',
      image: 'https://randomuser.me/api/portraits/men/3.jpg',
      content: 'L\'application mobile est parfaite pour mes déplacements. Je peux tout faire depuis mon téléphone.',
      rating: 5
    }
  ];

  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4"
          >
            <Star className="w-4 h-4 fill-current" />
            Témoignages clients
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
            Ce qu'en disent{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-500">nos clients</span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="bg-gradient-to-br from-slate-50 to-white p-8 rounded-2xl border border-slate-100 hover:border-teal-200 hover:shadow-xl transition-all"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 italic">"{testimonial.content}"</p>
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-teal-500/20"
                />
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Pricing Section
const PricingSection: React.FC = () => {
  const plans = [
    {
      name: 'Starter',
      price: '9,99',
      credits: 10,
      features: ['10 crédits', 'Rapports basiques', 'Support email', '1 utilisateur'],
      popular: false
    },
    {
      name: 'Basic',
      price: '19,99',
      credits: 25,
      features: ['25 crédits', 'Rapports avancés', 'Support prioritaire', '3 utilisateurs'],
      popular: false
    },
    {
      name: 'Pro',
      price: '49,99',
      credits: 75,
      features: ['75 crédits', 'Rapports personnalisés', 'Support 24/7', '10 utilisateurs', 'API Access'],
      popular: true
    },
    {
      name: 'Business',
      price: '79,99',
      credits: 150,
      features: ['150 crédits', 'Marque blanche', 'Support dédié', 'Utilisateurs illimités', 'API Access', 'Analytics avancés'],
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/20 text-teal-400 rounded-full text-sm font-medium mb-4"
          >
            <CreditCard className="w-4 h-4" />
            Tarifs transparents
          </motion.div>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Choisissez votre{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">formule</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Des tarifs adaptés à tous les besoins, de l'indépendant à l'entreprise
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.02 }}
              className={`relative p-6 rounded-2xl ${
                plan.popular
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white'
                  : 'bg-white/10 backdrop-blur border border-white/10 text-white'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                  POPULAIRE
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}€</span>
                <span className="text-sm opacity-75">/mois</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className={`w-5 h-5 ${plan.popular ? 'text-white' : 'text-teal-400'}`} />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`block w-full py-3 text-center font-semibold rounded-xl transition-all ${
                  plan.popular
                    ? 'bg-white text-teal-600 hover:bg-slate-100'
                    : 'bg-white/10 hover:bg-white/20 border border-white/20'
                }`}
              >
                Commencer
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Credits Cost Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8"
        >
          <h3 className="text-xl font-bold text-white mb-6 text-center">Coût en crédits par action</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { action: 'Inspection basique', credits: 1 },
              { action: 'Inspection avancée', credits: 2 },
              { action: 'Rapport PDF', credits: 1 },
              { action: 'Envoi par email', credits: 0.5 }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                <span className="text-slate-300">{item.action}</span>
                <span className="text-teal-400 font-bold">{item.credits} crédit{item.credits > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// CTA Section
const CTASection: React.FC = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white"
          >
            Prêt à transformer votre activité ?
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mt-6 text-xl text-white/90"
          >
            Rejoignez des centaines de professionnels qui font confiance à AutoWise
          </motion.p>
          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/register"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-teal-600 font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/20 text-white font-semibold rounded-2xl border-2 border-white/30 hover:bg-white/30 transition-all"
            >
              Contacter l'équipe
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Footer
const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 pb-12 border-b border-slate-800">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Auto<span className="text-teal-400">Wise</span>
              </span>
            </div>
            <p className="text-slate-400 mb-6">
              La solution complète pour gérer vos véhicules et inspections professionnelles.
            </p>
            <div className="flex gap-4">
              {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                <a
                  key={social}
                  href={`#${social}`}
                  className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-teal-500 hover:text-white transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-6">Liens rapides</h4>
            <ul className="space-y-3">
              {['Fonctionnalités', 'Tarifs', 'Témoignages', 'FAQ', 'Blog'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-slate-400 hover:text-teal-400 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white font-semibold mb-6">Légal</h4>
            <ul className="space-y-3">
              {['Conditions d\'utilisation', 'Politique de confidentialité', 'Mentions légales', 'RGPD'].map((link) => (
                <li key={link}>
                  <a href="#" className="text-slate-400 hover:text-teal-400 transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-6">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-slate-400">
                <Mail className="w-5 h-5 text-teal-500" />
                contact@autowise.fr
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <Phone className="w-5 h-5 text-teal-500" />
                01 23 45 67 89
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <MapPin className="w-5 h-5 text-teal-500" />
                Paris, France
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} AutoWise. Tous droits réservés.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">Fait avec</span>
            <span className="text-red-500">❤️</span>
            <span className="text-slate-500 text-sm">en France</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main Home Component
const Home: React.FC = () => {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <ProcessSection />
      <TestimonialsSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Home;
