import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * Auth Callback Page
 * Handles email confirmation redirects from Supabase
 * URL patterns:
 *   /auth/callback?code=xxx (PKCE flow)
 *   /auth/callback#access_token=xxx&refresh_token=xxx (implicit flow)
 *   /auth/callback?token_hash=xxx&type=signup (email OTP)
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Vérification de votre email en cours...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const hashParams = new URLSearchParams(url.hash.substring(1));

        // Case 1: PKCE flow — exchange code for session
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus('success');
          setMessage('Email confirmé ! 🎁 Vos 10 crédits de bienvenue ont été activés. Redirection...');
          setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
          return;
        }

        // Case 2: Email OTP — verify with token_hash
        const tokenHash = params.get('token_hash');
        const type = params.get('type') as any;
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
          setStatus('success');
          setMessage('Email confirmé ! 🎁 Vos 10 crédits de bienvenue ont été activés. Redirection...');
          setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
          return;
        }

        // Case 3: Implicit flow — tokens in hash fragment
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          setStatus('success');
          setMessage('Email confirmé ! Redirection vers le tableau de bord...');
          setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
          return;
        }

        // Case 4: Supabase auto-detected session (detectSessionInUrl: true may have handled it)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
          setMessage('Connexion réussie ! Redirection...');
          setTimeout(() => navigate('/dashboard', { replace: true }), 1000);
          return;
        }

        // No tokens found — redirect to login
        setStatus('error');
        setMessage('Lien invalide ou expiré. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage(err.message || 'Erreur lors de la vérification. Veuillez réessayer.');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center max-w-md w-full border border-white/20">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 text-teal-400 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Vérification en cours</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Email confirmé !</h2>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Erreur</h2>
          </>
        )}
        <p className="text-slate-300">{message}</p>
      </div>
    </div>
  );
}
