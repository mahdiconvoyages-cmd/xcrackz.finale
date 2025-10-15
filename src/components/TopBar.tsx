import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { shadows } from '../theme';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: {
    icon: keyof typeof Feather.glyphMap;
    onPress: () => void;
  };
}

export const TopBar: React.FC<TopBarProps> = ({ 
  title, 
  showBack, 
  onBack,
  rightAction,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [animatedValue] = React.useState(new Animated.Value(isDark ? 1 : 0));

  React.useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [isDark]);

  const sunScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const moonScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.surface, theme.surface],
  });

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.surface}
      />
      <Animated.View 
        style={[
          styles.container, 
          { backgroundColor },
          shadows.md,
        ]}
      >
        {/* Left Action */}
        <View style={styles.leftAction}>
          {showBack && onBack && (
            <TouchableOpacity 
              onPress={onBack}
              style={[styles.iconButton, { backgroundColor: theme.backgroundSecondary }]}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {/* Right Actions */}
        <View style={styles.rightActions}>
          {/* Theme Toggle Button */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.themeButton]}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? ['#3b82f6', '#8b5cf6'] : ['#f59e0b', '#ef4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.themeButtonGradient}
            >
              <Animated.View 
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: sunScale }], position: 'absolute' }
                ]}
              >
                <Feather name="sun" size={18} color="#ffffff" />
              </Animated.View>
              <Animated.View 
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: moonScale }], position: 'absolute' }
                ]}
              >
                <Feather name="moon" size={18} color="#ffffff" />
              </Animated.View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Custom Right Action */}
          {rightAction && (
            <TouchableOpacity
              onPress={rightAction.onPress}
              style={[styles.iconButton, { backgroundColor: theme.backgroundSecondary }]}
              activeOpacity={0.7}
            >
              <Feather name={rightAction.icon} size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  leftAction: {
    width: 40,
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  themeButtonGradient: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
