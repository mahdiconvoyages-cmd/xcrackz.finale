import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  description: string;
  free_tracking: boolean;
}

export default function ShopScreen({ navigation }: any) {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCredits, setCurrentCredits] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [packagesData, creditsData] = await Promise.all([
        loadPackages(),
        loadCurrentCredits(),
      ]);
      setPackages(packagesData);
      setCurrentCredits(creditsData);
    } catch (error) {
      console.error('Error loading shop data:', error);
      Alert.alert('Erreur', 'Impossible de charger la boutique');
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async (): Promise<CreditPackage[]> => {
    const { data, error } = await supabase
      .from('credits_packages')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const loadCurrentCredits = async (): Promise<number> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();

    return data?.balance || 0;
  };

  const handlePurchase = async (pkg: CreditPackage) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erreur', 'Vous devez être connecté');
        return;
      }

      Alert.alert(
        'Confirmation',
        `Acheter ${pkg.credits} crédits pour ${pkg.price.toFixed(2)}€ ?\n\n${pkg.description}`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Acheter',
            onPress: async () => {
              setLoading(true);
              try {
                const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
                const paymentUrl = `${supabaseUrl}/functions/v1/create-payment`;

                const response = await fetch(paymentUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
                  },
                  body: JSON.stringify({
                    package_id: pkg.id,
                    user_id: user.id,
                  }),
                });

                const data = await response.json();

                if (data.checkout_url) {
                  const canOpen = await Linking.canOpenURL(data.checkout_url);
                  if (canOpen) {
                    await Linking.openURL(data.checkout_url);
                  }
                } else {
                  throw new Error('URL de paiement invalide');
                }
              } catch (error: any) {
                console.error('Payment error:', error);
                Alert.alert('Erreur', error.message || 'Erreur lors du paiement');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error purchasing package:', error);
      Alert.alert('Erreur', 'Impossible de finaliser l\'achat');
    }
  };

  const getPackageIcon = (name: string) => {
    if (name.includes('Starter')) return 'rocket';
    if (name.includes('Basic')) return 'shield';
    if (name.includes('Pro')) return 'star';
    if (name.includes('Business')) return 'briefcase';
    if (name.includes('Enterprise')) return 'crown';
    return 'gift';
  };

  const getPackageColor = (name: string): [string, string] => {
    if (name.includes('Starter')) return ['#3b82f6', '#2563eb'];
    if (name.includes('Basic')) return ['#10b981', '#059669'];
    if (name.includes('Pro')) return ['#8b5cf6', '#7c3aed'];
    if (name.includes('Business')) return ['#f59e0b', '#d97706'];
    if (name.includes('Enterprise')) return ['#ef4444', '#dc2626'];
    return ['#6366f1', '#4f46e5'];
  };

  const getPackageFeatures = (pkg: CreditPackage) => {
    const features = [
      `${pkg.credits} missions max/mois`,
      'Facturation & Devis illimités',
      'Scan de documents illimité',
    ];

    if (pkg.name.includes('Basic') || pkg.name.includes('Pro') || pkg.name.includes('Business') || pkg.name.includes('Enterprise')) {
      features.push('Covoiturage inclus');
    }

    if (pkg.free_tracking) {
      features.push('Tracking GPS illimité GRATUIT');
    }

    if (pkg.name.includes('Enterprise')) {
      features.push('Support prioritaire dédié');
    }

    return features;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boutique</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#14b8a6', '#0d9488'] as any}
          style={styles.creditsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.creditsCardContent}>
            <MaterialCommunityIcons name="wallet" size={40} color="white" />
            <View style={styles.creditsInfo}>
              <Text style={styles.creditsLabel}>Vos crédits</Text>
              <Text style={styles.creditsValue}>{currentCredits}</Text>
            </View>
          </View>
          <Text style={styles.creditsSubtext}>
            1 crédit = 1 mission • GPS & Inspections gratuits
          </Text>
        </LinearGradient>

        <View style={styles.packagesContainer}>
          <Text style={styles.sectionTitle}>Choisissez votre plan</Text>
          <Text style={styles.sectionSubtitle}>
            Tous les plans incluent : Facturation & Devis illimités · Scan de documents · Support · Renouvellement tous les 30 jours
          </Text>

          {packages.map((pkg, index) => {
            const [color1, color2] = getPackageColor(pkg.name);
            const isPopular = pkg.name.includes('Pro');

            return (
              <View key={pkg.id} style={styles.packageWrapper}>
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPULAIRE</Text>
                  </View>
                )}
                <LinearGradient
                  colors={[color1, color2] as any}
                  style={[styles.packageCard, isPopular && styles.popularCard]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.packageHeader}>
                    <MaterialCommunityIcons
                      name={getPackageIcon(pkg.name) as any}
                      size={32}
                      color="white"
                    />
                    <View style={styles.packageTitleContainer}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      <Text style={styles.packageDescription}>{pkg.description}</Text>
                    </View>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>{pkg.price.toFixed(2)}€</Text>
                    <Text style={styles.priceUnit}>/mois</Text>
                  </View>

                  <View style={styles.featuresContainer}>
                    <View style={styles.creditsFeature}>
                      <MaterialCommunityIcons name="wallet" size={20} color="white" />
                      <Text style={styles.creditsFeatureText}>
                        {pkg.credits} crédits/mois
                      </Text>
                    </View>
                    {getPackageFeatures(pkg).map((feature, idx) => (
                      <View key={idx} style={styles.feature}>
                        <Feather name="check-circle" size={16} color="white" />
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.purchaseButton}
                    onPress={() => handlePurchase(pkg)}
                  >
                    <Text style={styles.purchaseButtonText}>Souscrire</Text>
                    <Feather name="arrow-right" size={20} color="#1f2937" />
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" size={24} color="#14b8a6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Comment ça marche ?</Text>
            <Text style={styles.infoText}>
              • 1 crédit = 1 mission créée{'\n'}
              • GPS tracking & Inspections = GRATUIT{'\n'}
              • Facturation & Scan illimités{'\n'}
              • Renouvellement automatique tous les 30 jours{'\n'}
              • Annulation possible à tout moment
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: Platform.OS === 'android' ? 110 : 100,
  },
  creditsCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  creditsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creditsInfo: {
    marginLeft: 16,
  },
  creditsLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  creditsValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  creditsSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 8,
  },
  packagesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 24,
    lineHeight: 18,
  },
  packageWrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    color: '#1f2937',
    fontSize: 11,
    fontWeight: '800',
  },
  packageCard: {
    borderRadius: 20,
    padding: 20,
  },
  popularCard: {
    borderWidth: 3,
    borderColor: '#fbbf24',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  packageTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  packageName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
  },
  priceUnit: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: 20,
  },
  creditsFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  creditsFeatureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginLeft: 8,
  },
  purchaseButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  purchaseButtonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(20,184,166,0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.3)',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
});
