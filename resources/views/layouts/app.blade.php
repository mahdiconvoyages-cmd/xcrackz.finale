<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'CHECKSFLEET - Gestion de Convoyage')</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --primary: #14b8a6;
            --primary-hover: #0d9488;
            --secondary: #06b6d4;
            --background: hsl(220, 18%, 12%);
            --surface: hsl(220, 15%, 14%);
        }

        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: var(--background);
            color: white;
        }

        .glass-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(20, 184, 166, 0.3);
        }

        .sidebar {
            width: 260px;
            background: var(--surface);
            border-right: 1px solid rgba(255, 255, 255, 0.1);
            height: 100vh;
            position: fixed;
            left: 0;
            top: 0;
            overflow-y: auto;
        }

        .main-content {
            margin-left: 260px;
            min-height: 100vh;
            padding: 2rem;
        }

        .sidebar-link {
            display: flex;
            align-items: center;
            padding: 0.75rem 1rem;
            color: rgba(255, 255, 255, 0.7);
            text-decoration: none;
            transition: all 0.2s;
            border-radius: 8px;
            margin: 0.25rem 0.75rem;
        }

        .sidebar-link:hover, .sidebar-link.active {
            background: rgba(20, 184, 166, 0.1);
            color: var(--primary);
        }

        .sidebar-link i {
            width: 24px;
            margin-right: 12px;
        }

        .stat-card {
            background: linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
            border: 1px solid rgba(20, 184, 166, 0.2);
            border-radius: 12px;
            padding: 1.5rem;
        }

        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
        }

        .badge-success { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .badge-warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
        .badge-error { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .badge-info { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }

        @media (max-width: 768px) {
            .sidebar { display: none; }
            .main-content { margin-left: 0; }
        }
    </style>
    @yield('styles')
</head>
<body>
    @auth
    <div class="sidebar">
        <div class="p-6">
            <h1 class="text-2xl font-bold" style="color: var(--primary);">CHECKSFLEET</h1>
            <p class="text-sm text-gray-400 mt-1">{{ session('profile')['full_name'] ?? 'Utilisateur' }}</p>
        </div>

        <nav class="mt-6">
            <a href="/dashboard" class="sidebar-link {{ request()->is('dashboard') ? 'active' : '' }}">
                <i class="fas fa-home"></i>
                <span>Dashboard</span>
            </a>
            <a href="/missions" class="sidebar-link {{ request()->is('missions*') ? 'active' : '' }}">
                <i class="fas fa-tasks"></i>
                <span>Missions</span>
            </a>
            <a href="/contacts" class="sidebar-link {{ request()->is('contacts*') ? 'active' : '' }}">
                <i class="fas fa-users"></i>
                <span>Contacts</span>
            </a>
            <a href="/reports" class="sidebar-link {{ request()->is('reports*') ? 'active' : '' }}">
                <i class="fas fa-file-alt"></i>
                <span>Rapports</span>
            </a>
            <a href="/billing" class="sidebar-link {{ request()->is('billing*') ? 'active' : '' }}">
                <i class="fas fa-file-invoice-dollar"></i>
                <span>Facturation</span>
            </a>
            <a href="/marketplace" class="sidebar-link {{ request()->is('marketplace*') ? 'active' : '' }}">
                <i class="fas fa-store"></i>
                <span>Marketplace</span>
            </a>
            <a href="/covoiturage" class="sidebar-link {{ request()->is('covoiturage*') ? 'active' : '' }}">
                <i class="fas fa-car"></i>
                <span>Covoiturage</span>
            </a>
            <a href="/settings" class="sidebar-link {{ request()->is('settings*') ? 'active' : '' }}">
                <i class="fas fa-cog"></i>
                <span>Paramètres</span>
            </a>
        </nav>

        <div class="p-6 mt-auto">
            <form action="/logout" method="POST">
                @csrf
                <button type="submit" class="sidebar-link w-full text-left" style="color: #ef4444;">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Déconnexion</span>
                </button>
            </form>
        </div>
    </div>
    @endauth

    <div class="{{ Auth::check() ? 'main-content' : '' }}">
        @if(session('success'))
        <div class="mb-4 p-4 bg-green-500 bg-opacity-20 border border-green-500 rounded-lg">
            <p class="text-green-400">{{ session('success') }}</p>
        </div>
        @endif

        @if($errors->any())
        <div class="mb-4 p-4 bg-red-500 bg-opacity-20 border border-red-500 rounded-lg">
            @foreach($errors->all() as $error)
                <p class="text-red-400">{{ $error }}</p>
            @endforeach
        </div>
        @endif

        @yield('content')
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    @yield('scripts')
</body>
</html>
