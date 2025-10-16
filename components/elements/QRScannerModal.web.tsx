/**
 * QR Scanner Modal - Web Implementation
 * Uses react-qr-reader-es6 for browser-based QR code scanning
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QrReader from 'react-qr-reader-es6';

import { colors } from '@/theme/colors';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

function QRScannerModal({ visible, onClose, onScan }: QRScannerModalProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (data: string | null) => {
    if (data) {
      onScan(data);
      onClose();
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scanner error:', err);
    setError(err?.message || 'Failed to access camera');
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!visible) {
    return null;
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
        <View style={styles.headerContainer}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <Text style={styles.title}>Scan QR Code</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* QR Scanner */}
        {!error ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <QrReader
              delay={300}
              onError={handleError}
              onScan={handleScan}
              style={{ width: '100%', height: '100%' }}
              facingMode="environment"
            />

            {/* Overlay with scanning frame */}
            <View style={styles.overlay} pointerEvents="none">
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
              <Text style={styles.instructionText}>Position QR code within the frame</Text>
            </View>
          </div>
        ) : (
          /* Error state */
          <View style={styles.errorContainer}>
            <MaterialIcons name="camera-alt" size={80} color={colors.textSecondary} />
            <Text style={styles.errorTitle}>Camera Access Required</Text>
            <Text style={styles.errorText}>
              Please allow camera access in your browser to scan QR codes.
              {'\n\n'}
              {error}
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setError(null)}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 24,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
