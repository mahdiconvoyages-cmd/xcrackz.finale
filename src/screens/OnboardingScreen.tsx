// Écran d'onboarding avec swiper
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { onboarding, ONBOARDING_STEPS, OnboardingStep } from '../../services/onboarding';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    onboarding.startOnboarding();
  }, []);

  const handleNext = () => {
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
      onboarding.saveOnboardingStep(nextIndex);
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    await onboarding.skipOnboarding();
    onComplete();
  };

  const handleComplete = async () => {
    await onboarding.completeOnboarding();
    onComplete();
  };

  const renderStep = ({ item, index }: { item: OnboardingStep; index: number }) => {
    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.slideContent}>
          {/* Icône grande */}
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={item.icon as any} size={80} color={colors.primary} />
          </View>

          {/* Titre */}
          <Text style={[styles.title, { color: colors.text }]}>
            {item.title}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {ONBOARDING_STEPS.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip button */}
      {currentIndex < ONBOARDING_STEPS.length - 1 && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Passer
          </Text>
        </TouchableOpacity>
      )}

      {/* Swiper */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_STEPS}
        renderItem={renderStep}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
          onboarding.saveOnboardingStep(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Footer avec dots et bouton */}
      <View style={styles.footer}>
        {renderDots()}

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + 'DD']}
            style={styles.nextGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextText}>
              {currentIndex === ONBOARDING_STEPS.length - 1 ? 'Commencer' : 'Suivant'}
            </Text>
            <Ionicons
              name={currentIndex === ONBOARDING_STEPS.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={20}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 32,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: {
    paddingBottom: 50,
    paddingHorizontal: 20,
    gap: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  nextGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  nextText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
});
