import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import AppLogo from '../../components/AppLogo';
import { analytics } from '../../services/analytics';
import { crashReporting } from '../../services/crashReporting';
import { createAccessibilityProps } from '../../hooks/useAccessibility';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const { signIn, signInWithBiometrics, isBiometricAvailable } = useAuth();

  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const particleAnimations = useRef(
    Array.from({ length: 5 }, () => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0.3),
    }))
  ).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Form entrance animation
    Animated.parallel([
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating particles animation
    particleAnimations.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim.translateY, {
            toValue: -50,
            duration: 3000 + index * 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: 0,
            duration: 3000 + index * 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signIn(email, password);
    } catch (error: any) {
      if (error.message?.includes('Invalid login credentials')) {
        setError('Email ou mot de passe incorrect');
      } else if (error.message?.includes('Email not confirmed')) {
        setError('Veuillez confirmer votre email');
      } else {
        setError(error.message || 'Une erreur est survenue');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0a0a1a', '#1a1a2e', '#0f4c5c']}
        style={styles.gradient}
      >
        {/* Animated Floating Particles */}
        {particleAnimations.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${(index + 1) * 20}%`,
                top: `${10 + index * 15}%`,
                opacity: anim.opacity,
                transform: [{ translateY: anim.translateY }],
              },
            ]}
          />
        ))}

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Animated Header with Logo */}
          <Animated.View 
            style={[
              styles.header,
              { transform: [{ scale: logoScale }] }
            ]}
          >
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#14b8a6', '#22d3ee', '#06b6d4']}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <AppLogo size={56} rounded={16} />
              </LinearGradient>
              <View style={styles.logoPulse} />
            </View>
            
            <LinearGradient
              colors={['#ffffff', '#e0f2fe']}
              style={styles.brandNameGradient}
            >
              <Text style={styles.brandName}>CHECKSFLEET</Text>
            </LinearGradient>
            
            <Text style={styles.subtitle}>Votre solution de gestion professionnelle</Text>
            
            <View style={styles.statsRow}>
              {[
                { icon: 'speedometer', label: 'Rapide', color: ['#f59e0b', '#f97316'] },
                { icon: 'shield-checkmark', label: 'Sécurisé', color: ['#14b8a6', '#22d3ee'] },
                { icon: 'star', label: 'Premium', color: ['#8b5cf6', '#a855f7'] },
              ].map((stat, i) => (
                <View key={i} style={styles.statBadge}>
                  <LinearGradient
                    colors={stat.color as [string, string]}
                    style={styles.statIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={stat.icon as any} size={16} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Animated Login Form */}
          <Animated.View
            style={[
              styles.formWrapper,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <View style={styles.formContainer}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Bienvenue ! 👋</Text>
                <Text style={styles.formSubtitle}>Connectez-vous pour continuer votre aventure</Text>
              </View>

              {error ? (
                <Animated.View style={styles.errorContainer}>
                  <LinearGradient
                    colors={['#fee2e2', '#fecaca']}
                    style={styles.errorGradient}
                  >
                    <Ionicons name="warning" size={20} color="#dc2626" />
                    <Text style={styles.errorText}>{error}</Text>
                  </LinearGradient>
                </Animated.View>
              ) : null}

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="mail" size={14} color="#64748b" /> Adresse email
                </Text>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'email' && styles.inputWrapperFocused
                ]}>
                  <LinearGradient
                    colors={focusedInput === 'email' ? ['#14b8a6', '#22d3ee'] : ['#f1f5f9', '#f1f5f9']}
                    style={styles.inputGradientBorder}
                  >
                    <View style={styles.inputInner}>
                      <View style={styles.inputIconContainer}>
                        <Ionicons 
                          name="mail-outline" 
                          size={20} 
                          color={focusedInput === 'email' ? '#14b8a6' : '#94a3b8'} 
                        />
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="votre@email.com"
                        placeholderTextColor="#94a3b8"
                        value={email}
                        onChangeText={(text) => {
                          setEmail(text);
                          setError('');
                        }}
                        onFocus={() => setFocusedInput('email')}
                        onBlur={() => setFocusedInput(null)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="email"
                      />
                    </View>
                  </LinearGradient>
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="lock-closed" size={14} color="#64748b" /> Mot de passe
                </Text>
                <View style={[
                  styles.inputWrapper,
                  focusedInput === 'password' && styles.inputWrapperFocused
                ]}>
                  <LinearGradient
                    colors={focusedInput === 'password' ? ['#14b8a6', '#22d3ee'] : ['#f1f5f9', '#f1f5f9']}
                    style={styles.inputGradientBorder}
                  >
                    <View style={styles.inputInner}>
                      <View style={styles.inputIconContainer}>
                        <Ionicons 
                          name="lock-closed-outline" 
                          size={20} 
                          color={focusedInput === 'password' ? '#14b8a6' : '#94a3b8'} 
                        />
                      </View>
                      <TextInput
                        style={[styles.input, { paddingRight: 50 }]}
                        placeholder="••••••••"
                        placeholderTextColor="#94a3b8"
                        value={password}
                        onChangeText={(text) => {
                          setPassword(text);
                          setError('');
                        }}
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoComplete="password"
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={20}
                          color={focusedInput === 'password' ? '#14b8a6' : '#94a3b8'}
                        />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={styles.loginButtonContainer}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={loading ? ['#94a3b8', '#cbd5e1'] : ['#14b8a6', '#06b6d4', '#0891b2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginButton}
                >
                  {loading ? (
                    <Animated.View style={styles.loadingContainer}>
                      <Ionicons name="refresh" size={22} color="#fff" />
                      <Text style={styles.loginButtonText}>Connexion...</Text>
                    </Animated.View>
                  ) : (
                    <>
                      <Ionicons name="rocket" size={22} color="#fff" />
                      <Text style={styles.loginButtonText}>Se connecter</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Additional Features */}
              <View style={styles.featuresGrid}>
                {[
                  { icon: 'flash', text: 'Connexion instantanée', color: '#f59e0b' },
                  { icon: 'shield-checkmark', text: 'Données chiffrées', color: '#14b8a6' },
                  { icon: 'fingerprint', text: 'Authentification sécurisée', color: '#8b5cf6' },
                ].map((feature, i) => (
                  <View key={i} style={styles.featureItem}>
                    <Ionicons name={feature.icon as any} size={16} color={feature.color} />
                    <Text style={styles.featureItemText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>CHECKSFLEET © 2025</Text>
              <View style={styles.dividerLine} />
            </View>
            <Text style={styles.footerText}>
              🔒 Vos données sont protégées et chiffrées
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  particle: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGradient: {
    padding: 16,
    borderRadius: 24,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoPulse: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  brandNameGradient: {
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 4,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  statBadge: {
    alignItems: 'center',
    gap: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formWrapper: {
    marginBottom: 32,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 12,
  },
  formHeader: {
    marginBottom: 28,
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0a0a1a',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 22,
  },
  errorContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  errorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  inputWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    transform: [{ scale: 1.01 }],
  },
  inputGradientBorder: {
    padding: 2,
    borderRadius: 16,
  },
  inputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  inputIconContainer: {
    width: 50,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 54,
    fontSize: 16,
    fontWeight: '600',
    color: '#0a0a1a',
    paddingRight: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  loginButtonContainer: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  featuresGrid: {
    marginTop: 24,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  featureItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
