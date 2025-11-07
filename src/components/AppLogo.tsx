import React from 'react';
import { View, StyleSheet } from 'react-native';
import LogoSvg from '../../assets/images/logo.svg';

interface AppLogoProps {
  size?: number; // width/height in px
  rounded?: number; // border radius
}

export default function AppLogo({ size = 40, rounded = 12 }: AppLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: rounded }]}> 
      <LogoSvg width={size} height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
