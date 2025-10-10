<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inscription - FleetCheck</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 0;
        }

        .auth-card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .btn-primary {
            background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
            transition: all 0.3s;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(20, 184, 166, 0.3);
        }
    </style>
</head>
<body>
    <div class="auth-card p-8 w-full max-w-md mx-4">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-800">FleetCheck</h1>
            <p class="text-gray-600 mt-2">Créez votre compte gratuitement</p>
        </div>

        @if($errors->any())
        <div class="mb-4 p-4 bg-red-100 border border-red-400 rounded-lg">
            @foreach($errors->all() as $error)
                <p class="text-red-700 text-sm">{{ $error }}</p>
            @endforeach
        </div>
        @endif

        <form action="/register" method="POST">
            @csrf
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Nom complet</label>
                <input type="text" name="full_name" required value="{{ old('full_name') }}"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="Jean Dupont">
            </div>

            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input type="email" name="email" required value="{{ old('email') }}"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="jean.dupont@exemple.com">
            </div>

            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Téléphone</label>
                <input type="tel" name="phone" value="{{ old('phone') }}"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="+33 6 12 34 56 78">
            </div>

            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Rôle</label>
                <select name="app_role" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500">
                    <option value="convoyeur" {{ old('app_role') === 'convoyeur' ? 'selected' : '' }}>Convoyeur</option>
                    <option value="donneur_d_ordre" {{ old('app_role') === 'donneur_d_ordre' ? 'selected' : '' }}>Donneur d'ordre</option>
                </select>
            </div>

            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Mot de passe</label>
                <input type="password" name="password" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="••••••••">
                <p class="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
            </div>

            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2">Confirmer le mot de passe</label>
                <input type="password" name="password_confirmation" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="••••••••">
            </div>

            <div class="mb-6">
                <label class="flex items-start">
                    <input type="checkbox" required class="mt-1 mr-2">
                    <span class="text-xs text-gray-600">
                        J'accepte les <a href="#" class="text-teal-600 hover:text-teal-700">conditions d'utilisation</a>
                        et la <a href="#" class="text-teal-600 hover:text-teal-700">politique de confidentialité</a>
                    </span>
                </label>
            </div>

            <button type="submit" class="w-full btn-primary text-white font-bold py-3 rounded-lg">
                Créer mon compte
            </button>
        </form>

        <p class="text-center mt-6 text-gray-600 text-sm">
            Déjà un compte ?
            <a href="/login" class="text-teal-600 font-bold hover:text-teal-700">Se connecter</a>
        </p>
    </div>
</body>
</html>
