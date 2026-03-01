import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * Auth Callback Page
 * Handles email confirmation redirects from Supabase
 * 
 * IMPORTANT: supabase client has detectSessionInUrl:true, so it may consume
 * the ?code= automatically before this component runs. We listen to
 * onAuthStateChange as the primary signal, with manual fallback.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Vérification de votre email en cours...');

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout>;

    const onSuccess = () => {
      setStatus('success');
      setMessage('Email confirmé ! 🎁 Vos 10 crédits de bienvenue ont été activés. Redirection...');
      redirectTimer = setTimeout(() => navigate('/dashboard', { replace: true }), 2000);
    };

    const onError = (msg?: string) => {
      setStatus('error');
      setMessage(msg || 'Lien invalide ou expiré. Veuillez vous reconnecter.');
      redirectTimer = setTimeout(() => navigate('/login', { replace: true }), 3000);
    };

    // Primary: listen for auth state change (works whether detectSessionInUrl
    // consumed the code automatically, or we handle it manually below)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session) {
          onSuccess();
        }
      }
    });

    // Fallback: manual handling in case onAuthStateChange fires before we subscribed,
    // or for implicit flow where tokens are in the hash
    const handleCallback = async () => {
      try {
        // Check if session already established (detectSessionInUrl may have handled it)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          onSuccess();
          return;
        }

        const url = new URL(window.location.href);
        const params = url.searchParams;
        const hashParams = new URLSearchParams(url.hash.substring(1));

        // PKCE flow — exchange code for session
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // Code may have been consumed by detectSessionInUrl — check session again
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) { onSuccess(); return; }
            throw error;
          }
          return; // onAuthStateChange will fire SIGNED_IN
        }

        // Email OTP — verify with token_hash
        const tokenHash = params.get('token_hash');
        const type = params.get('type') as any;
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
          return; // onAuthStateChange will fire
        }

        // Implicit flow — tokens in hash fragment
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          return; // onAuthStateChange will fire
        }

        // No tokens and no session — invalid link
        onError('Lien invalide ou expiré. Veuillez vous reconnecter.');
      } catch (err: any) {
        console.error('Auth callback error:', err);
        // One last session check before showing error
        const { data: { session } } = await supabase.auth.getSession();
        if (session) { onSuccess(); return; }
        onError(err.message || 'Erreur lors de la vérification. Veuillez réessayer.');
      }
    };

    handleCallback();

    return () => {
      subscription.unsubscribe();
      clearTimeout(redirectTimer);
    };
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
