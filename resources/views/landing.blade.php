<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FleetCheck - Plateforme de Gestion de Convoyage Automobile</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: hsl(220, 18%, 12%);
            color: white;
        }

        .hero-gradient {
            background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
        }

        .glass-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-primary {
            background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
            transition: all 0.3s;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(20, 184, 166, 0.3);
        }

        .feature-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, rgba(20, 184, 166, 0.2), rgba(6, 182, 212, 0.2));
            border: 2px solid #14b8a6;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #14b8a6;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <nav class="p-6">
        <div class="container mx-auto flex justify-between items-center">
            <h1 class="text-2xl font-bold text-teal-400">FleetCheck</h1>
            <div class="space-x-4">
                <a href="/login" class="text-white hover:text-teal-400 transition">Connexion</a>
                <a href="/register" class="btn-primary px-6 py-2 rounded-lg text-white font-semibold">Commencer</a>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="container mx-auto px-6 py-20 text-center">
        <div class="max-w-4xl mx-auto">
            <h2 class="text-5xl font-bold mb-6">
                Gérez vos missions de convoyage
                <span class="text-teal-400">en toute simplicité</span>
            </h2>
            <p class="text-xl text-gray-300 mb-8">
                FleetCheck est la plateforme SaaS complète pour organiser, suivre et facturer vos missions de convoyage automobile.
            </p>
            <div class="flex justify-center space-x-4">
                <a href="/register" class="btn-primary px-8 py-4 rounded-lg text-white font-bold text-lg">
                    Commencer gratuitement
                </a>
                <a href="#features" class="glass-card px-8 py-4 rounded-lg text-white font-bold text-lg hover:bg-white hover:bg-opacity-10 transition">
                    Voir les fonctionnalités
                </a>
            </div>
        </div>
    </section>

    <!-- Key Features -->
    <section id="features" class="container mx-auto px-6 py-20">
        <h3 class="text-3xl font-bold text-center mb-12">Fonctionnalités principales</h3>
        <div class="grid md:grid-cols-3 gap-8">
            <div class="glass-card p-8 rounded-xl">
                <div class="feature-icon">
                    <i class="fas fa-tasks"></i>
                </div>
                <h4 class="text-xl font-bold mb-3">Gestion des Missions</h4>
                <p class="text-gray-300">
                    Créez, assignez et suivez vos missions de convoyage avec vue Kanban, liste et carte géographique.
                </p>
            </div>

            <div class="glass-card p-8 rounded-xl">
                <div class="feature-icon">
                    <i class="fas fa-camera"></i>
                </div>
                <h4 class="text-xl font-bold mb-3">Inspection Véhicule</h4>
                <p class="text-gray-300">
                    Documentez l'état des véhicules au départ et à l'arrivée avec photos, kilométrage et signatures.
                </p>
            </div>

            <div class="glass-card p-8 rounded-xl">
                <div class="feature-icon">
                    <i class="fas fa-file-invoice-dollar"></i>
                </div>
                <h4 class="text-xl font-bold mb-3">Facturation Légale</h4>
                <p class="text-gray-300">
                    Générez des factures et devis conformes aux normes françaises avec export PDF automatique.
                </p>
            </div>

            <div class="glass-card p-8 rounded-xl">
                <div class="feature-icon">
                    <i class="fas fa-store"></i>
                </div>
                <h4 class="text-xl font-bold mb-3">Marketplace</h4>
                <p class="text-gray-300">
                    Publiez et trouvez des missions sur la plateforme communautaire de convoyage.
                </p>
            </div>

            <div class="glass-card p-8 rounded-xl">
                <div class="feature-icon">
                    <i class="fas fa-car"></i>
                </div>
                <h4 class="text-xl font-bold mb-3">Covoiturage</h4>
                <p class="text-gray-300">
                    Partagez vos trajets de retour avec d'autres convoyeurs pour optimiser vos coûts.
                </p>
            </div>

            <div class="glass-card p-8 rounded-xl">
                <div class="feature-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <h4 class="text-xl font-bold mb-3">Analytics</h4>
                <p class="text-gray-300">
                    Visualisez vos performances avec des tableaux de bord et statistiques détaillées.
                </p>
            </div>
        </div>
    </section>

    <!-- Testimonials -->
    <section class="container mx-auto px-6 py-20">
        <h3 class="text-3xl font-bold text-center mb-12">Ce que disent nos utilisateurs</h3>
        <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div class="glass-card p-8 rounded-xl">
                <div class="flex items-center mb-4">
                    <div class="text-yellow-400">
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                    </div>
                </div>
                <p class="text-gray-300 mb-4">
                    "FleetCheck a transformé notre façon de gérer les convoyages. Tout est centralisé et simple à utiliser."
                </p>
                <p class="font-bold">Jean-Pierre D.</p>
                <p class="text-sm text-gray-400">Directeur de flotte</p>
            </div>

            <div class="glass-card p-8 rounded-xl">
                <div class="flex items-center mb-4">
                    <div class="text-yellow-400">
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                        <i class="fas fa-star"></i>
                    </div>
                </div>
                <p class="text-gray-300 mb-4">
                    "La fonctionnalité de facturation nous fait gagner un temps précieux. Plus de saisie manuelle !"
                </p>
                <p class="font-bold">Marie L.</p>
                <p class="text-sm text-gray-400">Comptable</p>
            </div>
        </div>
    </section>

    <!-- Pricing -->
    <section class="container mx-auto px-6 py-20">
        <h3 class="text-3xl font-bold text-center mb-12">Tarifs simples et transparents</h3>
        <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div class="glass-card p-8 rounded-xl text-center">
                <h4 class="text-xl font-bold mb-4">Gratuit</h4>
                <div class="text-4xl font-bold mb-6">0€<span class="text-lg text-gray-400">/mois</span></div>
                <ul class="text-left space-y-3 mb-8">
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> 10 missions/mois</li>
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> Gestion basique</li>
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> 1 utilisateur</li>
                </ul>
                <a href="/register" class="block w-full btn-primary py-3 rounded-lg text-center font-bold">Commencer</a>
            </div>

            <div class="glass-card p-8 rounded-xl text-center border-2 border-teal-400">
                <div class="bg-teal-400 text-black px-4 py-1 rounded-full inline-block mb-4 text-sm font-bold">POPULAIRE</div>
                <h4 class="text-xl font-bold mb-4">Pro</h4>
                <div class="text-4xl font-bold mb-6">29€<span class="text-lg text-gray-400">/mois</span></div>
                <ul class="text-left space-y-3 mb-8">
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> Missions illimitées</li>
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> Toutes les fonctionnalités</li>
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> 5 utilisateurs</li>
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> Support prioritaire</li>
                </ul>
                <a href="/register" class="block w-full btn-primary py-3 rounded-lg text-center font-bold">Commencer</a>
            </div>

            <div class="glass-card p-8 rounded-xl text-center">
                <h4 class="text-xl font-bold mb-4">Entreprise</h4>
                <div class="text-4xl font-bold mb-6">Sur devis</div>
                <ul class="text-left space-y-3 mb-8">
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> Utilisateurs illimités</li>
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> API personnalisée</li>
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> Formation équipe</li>
                    <li><i class="fas fa-check text-teal-400 mr-2"></i> Support dédié</li>
                </ul>
                <a href="/register" class="block w-full glass-card py-3 rounded-lg text-center font-bold hover:bg-white hover:bg-opacity-10 transition">Nous contacter</a>
            </div>
        </div>
    </section>

    <!-- Final CTA -->
    <section class="container mx-auto px-6 py-20 text-center">
        <div class="glass-card p-12 rounded-2xl max-w-3xl mx-auto">
            <h3 class="text-3xl font-bold mb-4">Prêt à optimiser votre convoyage ?</h3>
            <p class="text-xl text-gray-300 mb-8">
                Rejoignez des centaines de professionnels qui utilisent FleetCheck quotidiennement.
            </p>
            <a href="/register" class="btn-primary px-12 py-4 rounded-lg text-white font-bold text-lg inline-block">
                Créer mon compte gratuit
            </a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-gray-800 mt-20">
        <div class="container mx-auto px-6 py-8">
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-xl font-bold text-teal-400">FleetCheck</h3>
                    <p class="text-gray-400 text-sm mt-1">© 2025 FleetCheck. Tous droits réservés.</p>
                </div>
                <div class="flex space-x-6">
                    <a href="#" class="text-gray-400 hover:text-teal-400 transition">CGU</a>
                    <a href="#" class="text-gray-400 hover:text-teal-400 transition">Confidentialité</a>
                    <a href="#" class="text-gray-400 hover:text-teal-400 transition">Contact</a>
                </div>
            </div>
        </div>
    </footer>
</body>
</html>
