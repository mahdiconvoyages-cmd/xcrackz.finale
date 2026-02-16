<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    private SupabaseService $supabase;

    public function __construct(SupabaseService $supabase)
    {
        $this->supabase = $supabase;
    }

    public function index(Request $request)
    {
        $tab = $request->get('tab', 'profile');
        $profile = session('profile');

        return view('settings.index', compact('tab', 'profile'));
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'full_name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'required|email'
        ]);

        $userId = session('user')['id'];

        $updateData = [
            'full_name' => $request->full_name,
            'phone' => $request->phone,
            'email' => $request->email,
            'updated_at' => date('c')
        ];

        $result = $this->supabase->update('profiles', $updateData, ['user_id' => $userId], session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de la mise à jour']);
        }

        $profile = $this->supabase->query('profiles', [
            'filter' => ['user_id' => $userId],
            'limit' => 1
        ]);

        if (!empty($profile)) {
            session(['profile' => $profile[0]]);
        }

        return back()->with('success', 'Profil mis à jour !');
    }

    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        $userId = session('user')['id'];
        $file = $request->file('avatar');

        $extension = $file->getClientOriginalExtension();
        $filename = "avatar.{$extension}";
        $path = "{$userId}/{$filename}";

        $fileContent = file_get_contents($file->getRealPath());

        $result = $this->supabase->uploadFile('avatars', $path, $fileContent, $file->getMimeType());

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de l\'upload']);
        }

        $avatarUrl = $this->supabase->getPublicUrl('avatars', $path);

        $this->supabase->update('profiles', ['avatar_url' => $avatarUrl], ['user_id' => $userId], session('access_token'));

        $profile = session('profile');
        $profile['avatar_url'] = $avatarUrl;
        session(['profile' => $profile]);

        return back()->with('success', 'Avatar mis à jour !');
    }

    public function deleteAvatar()
    {
        $userId = session('user')['id'];

        $this->supabase->update('profiles', ['avatar_url' => null], ['user_id' => $userId], session('access_token'));

        $profile = session('profile');
        $profile['avatar_url'] = null;
        session(['profile' => $profile]);

        return back()->with('success', 'Avatar supprimé');
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed'
        ]);

        return back()->with('success', 'Mot de passe mis à jour !');
    }

    public function updateNotifications(Request $request)
    {
        $userId = session('user')['id'];

        $preferences = [
            'email_notifications' => $request->boolean('email_notifications'),
            'push_notifications' => $request->boolean('push_notifications'),
            'sms_notifications' => $request->boolean('sms_notifications'),
            'location_tracking' => $request->boolean('location_tracking'),
            'auto_tracking' => $request->boolean('auto_tracking')
        ];

        $this->supabase->update('profiles', [
            'preferences' => json_encode($preferences)
        ], ['user_id' => $userId], session('access_token'));

        return back()->with('success', 'Préférences de notifications mises à jour !');
    }

    public function updateLanguage(Request $request)
    {
        $request->validate([
            'language' => 'required|in:fr,en,es'
        ]);

        $userId = session('user')['id'];

        $profile = session('profile');
        $preferences = json_decode($profile['preferences'] ?? '{}', true);
        $preferences['language'] = $request->language;

        $this->supabase->update('profiles', [
            'preferences' => json_encode($preferences)
        ], ['user_id' => $userId], session('access_token'));

        return back()->with('success', 'Langue mise à jour !');
    }

    public function deleteAccount(Request $request)
    {
        $request->validate([
            'confirmation' => 'required|in:SUPPRIMER'
        ]);

        $userId = session('user')['id'];

        $this->supabase->delete('profiles', ['user_id' => $userId], session('access_token'));

        session()->flush();

        return redirect('/login')->with('success', 'Compte supprimé');
    }
}
