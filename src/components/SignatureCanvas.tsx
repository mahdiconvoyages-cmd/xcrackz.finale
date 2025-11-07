import React, { useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { Feather } from '@expo/vector-icons';

interface SignatureCanvasProps {
  onSave: (signature: string) => void;
  onClear?: () => void;
  label?: string;
  signature?: string;
}

export default function SignatureCanvas({ onSave, onClear, label, signature }: SignatureCanvasProps) {
  const ref = useRef<any>(null);

  const handleSignature = (sig: string) => {
    onSave(sig);
  };

  const handleClear = () => {
    ref.current?.clearSignature();
    if (onClear) onClear();
  };

  const handleEnd = () => {
    ref.current?.readSignature();
  };

  const style = `.m-signature-pad--footer {display: none; margin: 0px;}`;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.signatureContainer}>
        <SignatureScreen
          ref={ref}
          onEnd={handleEnd}
          onOK={handleSignature}
          descriptionText=""
          clearText="Effacer"
          confirmText="Valider"
          webStyle={style}
        />
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Feather name="trash-2" size={16} color="#ef4444" />
          <Text style={styles.clearText}>Effacer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.confirmButton} onPress={() => ref.current?.readSignature()}>
          <Feather name="check" size={16} color="#10b981" />
          <Text style={styles.confirmText}>Valider</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  signatureContainer: {
    height: 200,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
  },
  clearText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0fdf4',
  },
  confirmText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
});
