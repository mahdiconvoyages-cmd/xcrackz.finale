<?php

namespace App\Http\Controllers;

use App\Services\SupabaseService;
use App\Services\EmailService;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    private SupabaseService $supabase;
    private EmailService $email;

    public function __construct(SupabaseService $supabase, EmailService $email)
    {
        $this->supabase = $supabase;
        $this->email = $email;
    }

    public function index(Request $request)
    {
        $userId = session('user')['id'];
        $search = $request->get('search');

        $contacts = $this->supabase->query('contacts', [
            'order' => 'created_at.desc'
        ]);

        if (!isset($contacts['error'])) {
            $contacts = array_filter($contacts, fn($c) => 
                $c['user_id'] === $userId || $c['invited_user_id'] === $userId
            );

            if ($search) {
                $contacts = array_filter($contacts, fn($c) => 
                    stripos($c['invited_email'], $search) !== false
                );
            }
        }

        $stats = [
            'total' => count($contacts),
            'pending' => count(array_filter($contacts, fn($c) => $c['status'] === 'pending')),
            'accepted' => count(array_filter($contacts, fn($c) => $c['status'] === 'accepted')),
            'rejected' => count(array_filter($contacts, fn($c) => $c['status'] === 'rejected'))
        ];

        return view('contacts.index', compact('contacts', 'stats', 'search'));
    }

    public function invite(Request $request)
    {
        $request->validate([
            'email' => 'required|email'
        ]);

        $userId = session('user')['id'];
        $profile = session('profile');

        $existingContact = $this->supabase->query('contacts', [
            'filter' => [
                'user_id' => $userId,
                'invited_email' => $request->email
            ],
            'limit' => 1
        ]);

        if (!empty($existingContact) && !isset($existingContact['error'])) {
            return back()->withErrors(['email' => 'Cette personne a déjà été invitée']);
        }

        $invitedProfile = $this->supabase->query('profiles', [
            'filter' => ['email' => $request->email],
            'limit' => 1
        ]);

        $contactData = [
            'user_id' => $userId,
            'invited_email' => $request->email,
            'invited_user_id' => !empty($invitedProfile) ? $invitedProfile[0]['user_id'] : null,
            'status' => 'pending'
        ];

        $result = $this->supabase->insert('contacts', $contactData, session('access_token'));

        if (isset($result['error'])) {
            return back()->withErrors(['error' => 'Erreur lors de l\'invitation']);
        }

        $inviteLink = url('/contacts/accept/' . ($result[0]['id'] ?? 'xxx'));
        $this->email->sendInvitation($request->email, $profile['full_name'], $inviteLink);

        return back()->with('success', 'Invitation envoyée !');
    }

    public function accept($contactId)
    {
        $userId = session('user')['id'];

        $contact = $this->supabase->query('contacts', [
            'filter' => ['id' => $contactId],
            'limit' => 1
        ]);

        if (empty($contact) || isset($contact['error'])) {
            return redirect('/contacts')->withErrors(['error' => 'Invitation introuvable']);
        }

        $contact = $contact[0];

        if ($contact['invited_user_id'] !== $userId) {
            return redirect('/contacts')->withErrors(['error' => 'Cette invitation ne vous concerne pas']);
        }

        $this->supabase->update('contacts', ['status' => 'accepted'], ['id' => $contactId], session('access_token'));

        return redirect('/contacts')->with('success', 'Contact accepté !');
    }

    public function reject($contactId)
    {
        $this->supabase->update('contacts', ['status' => 'rejected'], ['id' => $contactId], session('access_token'));
        return redirect('/contacts')->with('success', 'Invitation refusée');
    }

    public function destroy($id)
    {
        $this->supabase->delete('contacts', ['id' => $id], session('access_token'));
        return redirect('/contacts')->with('success', 'Contact supprimé');
    }
}
