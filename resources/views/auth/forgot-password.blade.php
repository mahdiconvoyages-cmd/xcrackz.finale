<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mot de passe oublié - CHECKSFLEET</title>
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
        }
    </style>
</head>
<body>
    <div class="auth-card p-8 w-full max-w-md mx-4">
        <div class="text-center mb-8">
            <h1 class="text-3xl font-bold text-gray-800">Mot de passe oublié</h1>
            <p class="text-gray-600 mt-2">Entrez votre email pour réinitialiser votre mot de passe</p>
        </div>

        @if(session('success'))
        <div class="mb-4 p-4 bg-green-100 border border-green-400 rounded-lg">
            <p class="text-green-700 text-sm">{{ session('success') }}</p>
        </div>
        @endif

        <form action="/reset-password" method="POST">
            @csrf
            <div class="mb-6">
                <label class="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input type="email" name="email" required
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500"
                    placeholder="votre.email@exemple.com">
            </div>

            <button type="submit" class="w-full btn-primary text-white font-bold py-3 rounded-lg">
                Envoyer le lien de réinitialisation
            </button>
        </form>

        <p class="text-center mt-6 text-gray-600 text-sm">
            <a href="/login" class="text-teal-600 font-bold hover:text-teal-700">Retour à la connexion</a>
        </p>
    </div>
</body>
</html>
