import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ActionButton from '@/components/elements/ActionButton';
import Toast from '@/components/elements/Toast';
import { smartWalletService } from '@/services';
import { useAppSlice } from '@/slices';
import { colors } from '@/theme/colors';
import type { Hex } from 'viem';

function SendScene() {
  // Get params from URL (scanned QR code)
  const params = useLocalSearchParams<{
    recipient?: string;
    amount?: string;
    chainId?: string;
  }>();

  const { user } = useAppSlice();
  const [recipient, setRecipient] = useState(params.recipient || '');
  const [amount, setAmount] = useState(params.amount || '');
  const [isSending, setIsSending] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const isFormValid = recipient.trim().length > 0 && amount.trim().length > 0;

  const handleBack = () => {
    router.back();
  };

  const handleSend = async () => {
    if (!isFormValid) return;

    if (!user?.passkeyRawId || !user?.walletAddress) {
      Alert.alert('Error', 'Please log in');
      return;
    }

    setIsSending(true);
    try {
      console.log('💸 Sending transaction:', {
        from: user.walletAddress,
        to: recipient,
        amount: `${amount} ETH`,
        chainId: params.chainId,
      });

      // Send tokens via UserOperation
      const userOpHash = await smartWalletService.sendTokens(
        recipient as Hex,
        amount,
        user.passkeyRawId,
        user.walletAddress as Hex
      );

      console.log('✅ Transaction sent:', userOpHash);

      // Show success toast
      setShowSuccessToast(true);

      // Wait for toast to show, then navigate back
      setTimeout(() => {
        router.replace('/wallet-home');
      }, 1500);
    } catch (error) {
      console.error('❌ Error sending:', error);
      Alert.alert('Error', `Failed to send: ${error instanceof Error ? error.message : String(error)}`);
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Success Toast */}
      <Toast
        message="Successfully sent!"
        visible={showSuccessToast}
        onHide={() => setShowSuccessToast(false)}
        duration={1500}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Send COIL</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Recipient Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Recipient Address</Text>
          <TextInput
            style={styles.input}
            placeholder="0x..."
            placeholderTextColor={colors.textSecondary}
            value={recipient}
            onChangeText={setRecipient}
            autoCapitalize="none"
            editable={!params.recipient} // Lock if from QR code
          />
        </View>

        {/* Amount Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!params.amount} // Lock if from QR code
          />
        </View>

        {/* Chain ID Display (if from QR) */}
        {params.chainId && (
          <View style={styles.infoContainer}>
            <MaterialIcons name="info" size={16} color={colors.textSecondary} />
            <Text style={styles.infoText}>Chain ID: {params.chainId}</Text>
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Send Button */}
        <View style={styles.actions}>
          <ActionButton
            label={isSending ? 'Sending...' : 'Send'}
            onPress={handleSend}
            variant="primary"
            fullWidth
            shape="pill"
            disabled={!isFormValid || isSending}
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
    paddingTop: 40,
  },
  inputContainer: {
    marginBottom: 24,
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
    fontSize: 16,
    color: colors.white,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    paddingBottom: 16,
  },
});

export default SendScene;
