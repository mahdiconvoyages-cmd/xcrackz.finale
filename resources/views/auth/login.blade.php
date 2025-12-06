<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion - CHECKSFLEET</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', system-ui, sans-serif;
            background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
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
            <h1 class="text-3xl font-bold text-gray-800">CHECKSFLEET</h1>
            <p class="text-gray-600 mt-2">Connectez-vous à votre compte</p>
        </div>

        @if($errors->any())
        <div class="mb-4 p-4 bg-red-100 border border-red-400 rounded-lg">
            @foreach($errors->all() as $error)
                <p class="text-red-700 text-sm">{{ $error }}</p>
            @endforeach
        </div>
        @endif

        @if(session('success'))
        <div class="mb-4 p-4 bg-green-100 border border-green-400 rounded-lg">
            <p class="text-green-700 text-sm">{{ session('success') }}</p>
        </div>
        @endif

        <form action="/login" method="POST">
            @csrf
            <div class="mb-4">
                <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input type="email" name="email" required value="{{ old('email') }}"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="votre.email@exemple.com">
            </div>

            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2">Mot de passe</label>
                <input type="password" name="password" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="••••••••">
            </div>

            <div class="flex items-center justify-between mb-6">
                <label class="flex items-center">
                    <input type="checkbox" class="mr-2">
                    <span class="text-sm text-gray-600">Se souvenir de moi</span>
                </label>
                <a href="/forgot-password" class="text-sm text-teal-600 hover:text-teal-700">Mot de passe oublié ?</a>
            </div>

            <button type="submit" class="w-full btn-primary text-white font-bold py-3 rounded-lg">
                Se connecter
            </button>
        </form>

        <p class="text-center mt-6 text-gray-600 text-sm">
            Pas encore de compte ?
            <a href="/register" class="text-teal-600 font-bold hover:text-teal-700">Créer un compte</a>
        </p>
    </div>
</body>
</html>
