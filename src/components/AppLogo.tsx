import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

const LogoPng = require('../../assets/images/logo.png');

interface AppLogoProps {
  size?: number; // width/height in px
  rounded?: number; // border radius
}

export default function AppLogo({ size = 40, rounded = 12 }: AppLogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: rounded }]}> 
      <Image source={LogoPng} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
