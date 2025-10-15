import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { showToast } from '../components/Toast';
// import Toast from 'react-native-toast-message'; // ❌ React Native only - remplacé par showToast custom
// import { Linking } from 'react-native'; // ❌ React Native only - utilise window.location pour le web

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExchanging, setIsExchanging] = useState(false);

  useEffect(() => {
    // Configuration du listener d'état d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Vérification de la session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle OAuth deep links (WEB VERSION)
  useEffect(() => {
    const handleUrl = async () => {
      try {
        // Pour le web, on vérifie les paramètres URL (hash fragment pour OAuth)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          if (isExchanging) return;
          setIsExchanging(true);
          
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.warn('[OAuth] Session exchange error:', error?.message);
            showToast('error', 'Erreur de connexion OAuth');
          }
          if (data?.session) {
            showToast('success', 'Connexion Google réussie');
            // Nettoyer l'URL après l'échange
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setIsExchanging(false);
        }
      } catch (e) {
        console.warn('[OAuth] Deep link handling error', e?.message || e);
        setIsExchanging(false);
      }
    };

    handleUrl();
  }, [isExchanging]);

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showToast('error', 'Erreur de connexion', error.message);
    } else {
      showToast('success', 'Connexion réussie', 'Bienvenue !');
    }

    return { error };
  };

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      showToast('error', "Erreur d'inscription", error.message);
    } else {
      showToast('success', 'Compte créé', 'Vérifiez votre email pour confirmer votre compte.');
    }

    return { error };
  };

  const signInWithGoogle = async () => {
    try {
      // Pour le web, on utilise l'URL de callback web (pas de deep link mobile)
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        showToast('error', 'Erreur Google', error.message);
        return { error };
      }
      if (data?.url) {
        // Sur le web, on redirige simplement vers l'URL OAuth
        window.location.href = data.url;
      } else {
        showToast('error', 'Erreur Google', "URL d'authentification introuvable");
        return { error: new Error('missing oauth url') };
      }
      return {};
    } catch (e) {
      showToast('error', 'Erreur Google', e?.message || 'Erreur inconnue');
      return { error: e };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      showToast('error', 'Erreur de déconnexion', error.message);
    } else {
      showToast('success', 'Déconnexion réussie', 'À bientôt !');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signIn, 
      signUp, 
      signInWithGoogle, 
      signOut, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
