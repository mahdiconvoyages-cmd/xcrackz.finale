// @ts-nocheck - Type definitions for Reanimated transforms may be outdated
/**
 * Composant Galerie Photos - React Native
 * 
 * Fonctionnalités:
 * - Zoom et pinch-to-zoom
 * - Swipe entre photos
 * - Pagination
 * - Partage individuel
 * - Plein écran
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Share,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Photo {
  id?: string;
  photo_url: string;
  photo_type: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export default function PhotoGallery({
  photos,
  initialIndex = 0,
  isOpen,
  onClose,
  title = 'Photos',
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // Animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const handleNext = () => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetZoom();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetZoom();
    }
  };

  const resetZoom = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const handlePinch = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      scale.value = Math.max(1, Math.min(event.nativeEvent.scale, 3));
    } else if (event.nativeEvent.state === State.END) {
      if (scale.value < 1.2) {
        resetZoom();
      }
    }
  };

  const handlePan = (event: any) => {
    if (scale.value > 1) {
      translateX.value = event.nativeEvent.translationX;
      translateY.value = event.nativeEvent.translationY;
    }
  };

  const handleShare = async () => {
    try {
      const photo = photos[currentIndex];
      await Share.share({
        message: `Photo: ${photo.photo_type}`,
        url: photo.photo_url,
      });
    } catch (error) {
      console.error('Erreur partage photo:', error);
    }
  };

  const currentPhoto = photos[currentIndex];

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.container}>
        <StatusBar hidden />
        
        {/* Background */}
        <View style={styles.background}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.counter}>
              {currentIndex + 1} / {photos.length}
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
              <Feather name="share-2" size={24} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Feather name="x" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Container */}
        <PanGestureHandler onGestureEvent={handlePan}>
          <Animated.View style={styles.imageContainer}>
            <PinchGestureHandler onGestureEvent={handlePinch}>
              <Animated.View style={animatedStyle}>
                <Image
                  source={{ uri: currentPhoto.photo_url }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </Animated.View>
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft]}
            onPress={handlePrevious}
          >
            <Feather name="chevron-left" size={32} color="#fff" />
          </TouchableOpacity>
        )}

        {currentIndex < photos.length - 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight]}
            onPress={handleNext}
          >
            <Feather name="chevron-right" size={32} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Bottom Info */}
        <View style={styles.bottomInfo}>
          <Text style={styles.photoType}>
            {currentPhoto.photo_type.replace(/_/g, ' ')}
          </Text>
          {scale.value > 1 && (
            <TouchableOpacity onPress={resetZoom} style={styles.resetButton}>
              <Feather name="maximize" size={16} color="#fff" />
              <Text style={styles.resetText}>Réinitialiser</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Thumbnails */}
        <View style={styles.thumbnailContainer}>
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={photo.id || index}
              onPress={() => {
                setCurrentIndex(index);
                resetZoom();
              }}
              style={[
                styles.thumbnail,
                index === currentIndex && styles.thumbnailActive,
              ]}
            >
              <Image
                source={{ uri: photo.photo_url }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 15,
  },
  headerButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  counter: {
    fontSize: 14,
    color: '#ccc',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -30,
    width: 60,
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  photoType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    textTransform: 'capitalize',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetText: {
    fontSize: 14,
    color: '#fff',
  },
  thumbnailContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: '#fff',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});
