/**
 * 🚀 Screen Wrapper avec Quick Access Bar
 * 
 * Wrapper pour intégrer la barre de raccourcis sur tous les écrans
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import QuickAccessBar from './QuickAccessBar';

interface Props {
  children: React.ReactNode;
  showQuickAccess?: boolean;
}

export default function ScreenWithQuickAccess({ children, showQuickAccess = true }: Props) {
  return (
    <View style={styles.container}>
      {showQuickAccess && <QuickAccessBar />}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
