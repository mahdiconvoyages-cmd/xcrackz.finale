import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { secureStorage } from '../services/secureStorage';
import { analytics } from '../services/analytics';
import { crashReporting } from '../services/crashReporting';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithBiometrics: () => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{ error: any }>;
  isBiometricAvailable: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  console.log('🔐 AuthProvider: Initializing...');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      try {
        console.log('🔍 AuthProvider: useEffect - Starting...');
        
        // Initialiser les services
        await crashReporting.init();
        
        // Vérifier disponibilité biométrie
        const biometricAvailable = await secureStorage.isBiometricAvailable();
        if (mounted) {
          setIsBiometricAvailable(biometricAvailable);
        }
        
        // Récupérer la session initiale
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ AuthProvider: getSession error:', sessionError);
          crashReporting.reportError(sessionError, { context: 'auth_init' });
          throw sessionError;
        }
        
        console.log('✅ AuthProvider: Session retrieved:', session ? 'Logged in' : 'No session');
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          
          // Configurer analytics et crash reporting avec user
          if (session?.user) {
            analytics.setUserId(session.user.id);
            crashReporting.setUser(session.user.id, {
              email: session.user.email,
            });
          }
        }
        
        // Écouter les changements d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          console.log('🔄 AuthProvider: Auth state changed:', _event);
          
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          }

          // Stocker les tokens de manière sécurisée
          try {
            if (session) {
              await secureStorage.saveAuthToken(session.access_token);
              await secureStorage.saveRefreshToken(session.refresh_token || '');
              
              // Configurer analytics
              analytics.setUserId(session.user.id);
              crashReporting.setUser(session.user.id, {
                email: session.user.email,
              });
            } else {
              await secureStorage.clearTokens();
              analytics.setUserId(null);
              crashReporting.setUser(null);
            }
          } catch (storeError) {
            console.error('⚠️ AuthProvider: SecureStore error:', storeError);
            crashReporting.reportError(storeError as Error, {
              context: 'auth_token_storage',
            });
          }
        });

        return () => {
          mounted = false;
          console.log('🧹 AuthProvider: Cleaning up subscription');
          subscription.unsubscribe();
        };
        
      } catch (error) {
        console.error('💥 AuthProvider: Init error:', error);
        if (mounted) {
          setError(error as Error);
          setLoading(false);
        }
      }
    };
    
    const cleanup = initAuth();
    
    return () => {
      mounted = false;
      cleanup?.then(fn => fn?.());
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error) {
        analytics.logLogin('email');
      } else {
        crashReporting.reportError(error, { context: 'sign_in' });
      }
      
      return { error };
    } catch (error) {
      crashReporting.reportError(error as Error, { context: 'sign_in' });
      return { error };
    }
  };

  const signInWithBiometrics = async () => {
    try {
      const token = await secureStorage.getItemWithBiometrics('auth_token');
      
      if (!token) {
        return { error: new Error('No saved token found') };
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: await secureStorage.getRefreshToken() || '',
      });

      if (!error) {
        analytics.logLogin('biometric');
      } else {
        crashReporting.reportError(error, { context: 'biometric_login' });
      }

      return { error };
    } catch (error) {
      crashReporting.reportError(error as Error, { context: 'biometric_login' });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      analytics.logLogout();
      await supabase.auth.signOut();
      await secureStorage.clearTokens();
    } catch (error) {
      crashReporting.reportError(error as Error, { context: 'sign_out' });
    }
  };

  const updateProfile = async (updates: any) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signInWithBiometrics,
        signUp,
        signOut,
        updateProfile,
        isBiometricAvailable,
      }}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Erreur d'initialisation</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <Text style={styles.errorHint}>Vérifiez votre connexion Internet</Text>
        </View>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0b1220',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: '700',
  },
  errorMessage: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
  errorHint: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
