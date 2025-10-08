import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Clipboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ActionButton from '@/components/elements/ActionButton';
import QRCodeModal from '@/components/elements/QRCodeModal';
import Toast from '@/components/elements/Toast';
import { useAppSlice } from '@/slices';
import { colors } from '@/theme/colors';
import config from '@/utils/config';

function ReceiveScene() {
  const [amount, setAmount] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const { user } = useAppSlice();

  const isAmountValid = amount.trim().length > 0;

  const handleBack = () => {
    router.back();
  };

  const getPaymentLink = () => {
    return `https://${config.associatedDomain}/receive?recipient=${user.walletAddress}&chainId=${config.chainId}&amount=${encodeURIComponent(amount)}`;
  };

  const handleShowQR = () => {
    setShowQRModal(true);
  };

  const handleCopyLink = () => {
    if (!user?.walletAddress) {
      Alert.alert('שגיאה', 'כתובת ארנק לא נמצאה');
      return;
    }

    const paymentLink = getPaymentLink();

    // Copy to clipboard
    Clipboard.setString(paymentLink);

    // Show success toast
    setShowToast(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Toast Notification */}
      <Toast
        message="הועתק ללוח!"
        visible={showToast}
        onHide={() => setShowToast(false)}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        visible={showQRModal}
        onClose={() => setShowQRModal(false)}
        amount={amount}
        paymentLink={getPaymentLink()}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>קבלת COIL</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Centered Instruction Text */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>הזן סכום לקבלה</Text>
        </View>

        {/* Amount Input */}
        <View style={styles.inputContainer}>  
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Action Buttons */}
        <View style={styles.actions}>
          <ActionButton
            label="הצג קוד QR"
            onPress={handleShowQR}
            variant="primary"
            fullWidth
            shape="pill"
            disabled={!isAmountValid}
          />
          <View style={styles.buttonSpacer} />
          <ActionButton
            label="העתק קישור לתשלום"
            onPress={handleCopyLink}
            variant="secondary"
            fullWidth
            shape="pill"
            disabled={!isAmountValid}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 9999,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 120,
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionText: {
    fontSize: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
    alignItems: 'center'
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textTertiary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.cardBackgroundDark,
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    color: colors.white,
    width: '80%',
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  actions: {
    paddingBottom: 16,
  },
  buttonSpacer: {
    height: 16,
  },
});

export default ReceiveScene;