import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';

import { colors } from '@/theme/colors';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

function QRScannerModal({ visible, onClose, onScan }: QRScannerModalProps) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsActive(true);
      if (!hasPermission) {
        requestPermission();
      }
    } else {
      setIsActive(false);
    }
  }, [visible, hasPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].value) {
        setIsActive(false);
        onScan(codes[0].value);
        onClose();
      }
    },
  });

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const handleClose = () => {
    setIsActive(false);
    onClose();
  };

  if (!hasPermission) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Scan QR Code</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.permissionContainer}>
            <MaterialIcons name="camera-alt" size={80} color={colors.textSecondary} />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              This app needs camera access to scan QR codes. Please grant camera permission in your
              device settings.
            </Text>
            <TouchableOpacity style={styles.settingsButton} onPress={handleOpenSettings}>
              <Text style={styles.settingsButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <SafeAreaView style={styles.headerContainer} edges={['top']}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Scan QR Code</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Camera View */}
        <Camera
          style={StyleSheet.absoluteFill}
          device={Camera.getAvailableCameraDevices().find((d) => d.position === 'back')!}
          isActive={isActive}
          codeScanner={codeScanner}
        />

        {/* Overlay with scanning frame */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <Text style={styles.instructionText}>Position QR code within the frame</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 9999,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  settingsButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionText: {
    fontSize: 16,
    color: colors.white,
    marginTop: 40,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
});

export default QRScannerModal;
