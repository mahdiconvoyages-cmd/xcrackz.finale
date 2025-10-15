import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  navigation: any;
}

export default function CovoiturageScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Covoiturage</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Hero Section */}
        <View style={styles.imageContainer}>
          <LinearGradient
            colors={['#14b8a6', '#0d9488', '#0891b2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Decorative elements */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />
            
            {/* Car icon */}
            <View style={styles.carIconContainer}>
              <Feather name="truck" size={80} color="#fff" style={{ opacity: 0.9 }} />
            </View>
            
            {/* People icons */}
            <View style={styles.peopleContainer}>
              <View style={styles.personIcon}>
                <Feather name="user" size={20} color="#fff" />
              </View>
              <View style={[styles.personIcon, { opacity: 0.8 }]}>
                <Feather name="user" size={20} color="#fff" />
              </View>
              <View style={[styles.personIcon, { opacity: 0.6 }]}>
                <Feather name="user" size={20} color="#fff" />
              </View>
            </View>
            
            {/* Overlay badge */}
            <View style={styles.imageOverlay}>
              <View style={styles.overlayBadge}>
                <Feather name="users" size={20} color="#fff" />
                <Text style={styles.overlayBadgeText}>Covoiturage</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Titre */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Voyagez Ensemble,{'\n'}Économisez Plus</Text>
          <Text style={styles.subtitle}>
            Partagez vos trajets quotidiens avec Finality et réduisez vos coûts de transport
          </Text>
        </View>

        {/* Fonctionnalités */}
        <View style={styles.featuresSection}>
          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Feather name="dollar-sign" size={28} color="#10b981" />
            </View>
            <Text style={styles.featureTitle}>Économisez jusqu'à 70%</Text>
            <Text style={styles.featureText}>
              Partagez les frais d'essence et de péage avec d'autres passagers
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Feather name="clock" size={28} color="#14b8a6" />
            </View>
            <Text style={styles.featureTitle}>Trajets flexibles</Text>
            <Text style={styles.featureText}>
              Choisissez vos horaires de départ et d'arrivée selon vos besoins
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Feather name="shield" size={28} color="#3b82f6" />
            </View>
            <Text style={styles.featureTitle}>Sécurisé et vérifié</Text>
            <Text style={styles.featureText}>
              Tous les conducteurs sont vérifiés avec assurance et permis valides
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Feather name="message-circle" size={28} color="#8b5cf6" />
            </View>
            <Text style={styles.featureTitle}>Chat intégré</Text>
            <Text style={styles.featureText}>
              Communiquez facilement avec votre conducteur et co-passagers
            </Text>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaButton}>
            <LinearGradient
              colors={['#14b8a6', '#0d9488']}
              style={styles.ctaButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="search" size={20} color="#fff" />
              <Text style={styles.ctaButtonText}>Rechercher un trajet</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton}>
            <Feather name="plus-circle" size={20} color="#14b8a6" />
            <Text style={styles.secondaryButtonText}>Proposer un trajet</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>15K+</Text>
            <Text style={styles.statLabel}>Trajets partagés</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>4.8</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>€45K</Text>
            <Text style={styles.statLabel}>Économisé</Text>
          </View>
        </View>

        {/* Comment ça marche */}
        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>Comment ça marche ?</Text>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Recherchez votre trajet</Text>
              <Text style={styles.stepText}>
                Entrez votre point de départ et destination
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Réservez votre place</Text>
              <Text style={styles.stepText}>
                Choisissez l'offre qui vous convient et réservez en un clic
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Voyagez ensemble</Text>
              <Text style={styles.stepText}>
                Rendez-vous au point de départ et profitez du trajet !
              </Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  imageContainer: {
    position: 'relative',
    height: 280,
    width: '100%',
    overflow: 'hidden',
  },
  heroGradient: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: 40,
    left: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: 60,
    right: 40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 120,
    right: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  carIconContainer: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    marginLeft: -40,
    opacity: 0.9,
  },
  peopleContainer: {
    position: 'absolute',
    bottom: 80,
    left: '50%',
    marginLeft: -90,
    flexDirection: 'row',
    gap: 20,
  },
  personIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    padding: 20,
  },
  overlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  overlayBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  titleSection: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    lineHeight: 24,
  },
  featuresSection: {
    padding: 24,
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
  ctaSection: {
    padding: 24,
    gap: 12,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#14b8a6',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14b8a6',
  },
  statsSection: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  howItWorksSection: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  step: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  stepText: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 20,
  },
});
