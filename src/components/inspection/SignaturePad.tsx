import React, { useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignatureCanvas from 'react-native-signature-canvas';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  value?: string;
  title?: string;
  placeholder?: string;
  onBegin?: () => void;
  onEnd?: () => void;
}

export default function SignaturePad({ 
  onSave, 
  value, 
  title = "Signature", 
  placeholder = "Nom complet",
  onBegin,
  onEnd 
}: SignaturePadProps) {
  const signatureRef = useRef<any>(null);

  // Notification au parent que la signature commence
  const handleBegin = () => {
    console.log('🖊️ Début de signature - Scroll désactivé');
    onBegin?.();
  };

  // Validation automatique + notification au parent
  const handleEndSignature = () => {
    console.log('✅ Fin de signature - Scroll réactivé');
    if (signatureRef.current) {
      signatureRef.current.readSignature();
    }
    onEnd?.();
  };

  const handleOK = (signature: string) => {
    console.log('✅ Signature capturée automatiquement');
    onSave(signature);
  };

  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: 2px dashed #e5e7eb;
      border-radius: 8px;
      background-color: #fff;
      touch-action: none;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    .m-signature-pad--body {
      border: none;
      touch-action: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body,html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      touch-action: none;
    }
    canvas {
      touch-action: none;
    }
  `;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="create-outline" size={20} color="#0f172a" />
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <View style={styles.signatureContainer}>
        <SignatureCanvas
          ref={signatureRef}
          onOK={handleOK}
          onBegin={handleBegin}
          onEnd={handleEndSignature}
          onEmpty={() => console.log('Signature vide')}
          descriptionText=""
          webStyle={webStyle}
          autoClear={false}
          imageType="image/png"
          backgroundColor="rgba(255,255,255,0)"
          penColor="#0f172a"
          minWidth={0.5}
          maxWidth={2.5}
          minDistance={1}
          throttle={8}
          velocityFilterWeight={0.7}
          canvasProps={{
            style: {
              width: '100%',
              height: '100%',
              touchAction: 'none'
            }
          }}
        />
      </View>

      <Text style={styles.instruction}>
        ✍️ Maintenez votre doigt sur la zone pour signer
      </Text>

      {value && (
        <View style={styles.preview}>
          <Ionicons name="checkmark-circle" size={16} color="#10b981" />
          <Text style={styles.previewText}>Signature enregistrée</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  signatureContainer: {
    height: 200,
    width: '100%',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  instruction: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
  },
  previewText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
  },
});
