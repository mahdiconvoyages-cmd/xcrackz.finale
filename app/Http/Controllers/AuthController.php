<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    private SupabaseService $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    public function showLogin()
    {
        if (session('access_token')) {
            return redirect('/dashboard');
        }
        return view('auth.login');
    }

    public function showRegister()
    {
        if (session('access_token')) {
            return redirect('/dashboard');
        }
        return view('auth.register');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|min:6'
        ]);

        $result = $this->supabase->signIn($request->email, $request->password);

        if (isset($result['error'])) {
            return back()->withErrors(['email' => 'Identifiants invalides'])->withInput();
        }

        session([
            'access_token' => $result['access_token'],
            'user' => $result['user']
        ]);

        $profile = $this->supabase->query('profiles', [
            'filter' => ['user_id' => $result['user']['id']],
            'limit' => 1
        ]);

        if (!empty($profile) && !isset($profile['error'])) {
            session(['profile' => $profile[0]]);
        }

        return redirect('/dashboard')->with('success', 'Connexion réussie !');
    }

    public function register(Request $request)
    {
        $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email',
            'password' => 'required|min:6|confirmed',
            'phone' => 'nullable|string|max:20',
            'app_role' => 'required|in:convoyeur,donneur_d_ordre'
        ]);

        $result = $this->supabase->signUp($request->email, $request->password, [
            'full_name' => $request->full_name,
            'phone' => $request->phone
        ]);

        if (isset($result['error'])) {
            return back()->withErrors(['email' => 'Erreur lors de l\'inscription: ' . $result['error']])->withInput();
        }

        $profileData = [
            'user_id' => $result['user']['id'],
            'email' => $request->email,
            'full_name' => $request->full_name,
            'phone' => $request->phone,
            'app_role' => $request->app_role,
            'is_verified' => false,
            'credits' => 0
        ];

        $this->supabase->insert('profiles', $profileData);

        session([
            'access_token' => $result['access_token'] ?? $result['session']['access_token'],
            'user' => $result['user'],
            'profile' => $profileData
        ]);

        return redirect('/dashboard')->with('success', 'Inscription réussie ! Bienvenue sur CheckFlow.');
    }

    public function logout()
    {
        $accessToken = session('access_token');
        if ($accessToken) {
            $this->supabase->signOut($accessToken);
        }

        session()->flush();
        return redirect('/login')->with('success', 'Déconnexion réussie');
    }

    public function forgotPassword()
    {
        return view('auth.forgot-password');
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        return back()->with('success', 'Si cet email existe, vous recevrez un lien de réinitialisation.');
    }
}
