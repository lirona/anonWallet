import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ActionButton from '@/components/elements/ActionButton';
import Toast from '@/components/elements/Toast';
import { smartWalletService, tokenService } from '@/services';
import { useAppSlice, useTokenSlice } from '@/slices';
import { colors } from '@/theme/colors';
import { formatEther, hexToBigInt, parseEther, type Hex } from 'viem';

function SendScene() {
  // Get params from URL (scanned QR code)
  const params = useLocalSearchParams<{
    recipient?: string;
    amount?: string;
    chainId?: string;
  }>();

  const { user } = useAppSlice();
  const tokenSlice = useTokenSlice();
  const [recipient, setRecipient] = useState(params.recipient || '');
  const [amount, setAmount] = useState(params.amount || '');
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const isFormValid = recipient.trim().length > 0 && amount.trim().length > 0;

  // Available balance from Redux (raw hex -> bigint)
  const available = useMemo(() => {
    try {
      return tokenSlice.balanceRaw ? hexToBigInt(tokenSlice.balanceRaw) : 0n;
    } catch {
      return 0n;
    }
  }, [tokenSlice.balanceRaw]);

  // Parse amount to wei (18 decimals) safely; default to 0n if invalid
  const desiredAmountWei = useMemo(() => {
    const trimmed = amount.trim();
    if (!trimmed) return 0n;
    try {
      return parseEther(trimmed);
    } catch {
      return 0n;
    }
  }, [amount]);

  const isAmountTooHigh = desiredAmountWei > available;

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
        amount: `${amount} COIL`,
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

      // Show confirming state
      setIsSending(false);
      setIsConfirming(true);

      // Calculate expected new balance (current balance - amount sent)
      const expectedNewBalance = available - desiredAmountWei;
      console.log(`💰 Expected new balance: ${formatEther(expectedNewBalance)} COIL`);

      // Poll until the transaction is indexed and balance is updated
      let attempts = 0;
      const maxAttempts = 20; // Poll for up to 20 seconds
      const pollInterval = 1000; // Check every 1 second

      const waitForConfirmation = async (): Promise<boolean> => {
        attempts++;
        console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`);

        try {
          const [balance, balanceRaw] = await Promise.all([
            tokenService.getBalance(user.walletAddress as Hex),
            tokenService.getBalanceRaw(user.walletAddress as Hex),
          ]);

          const currentBalance = hexToBigInt(balanceRaw);
          console.log(`📊 Current balance: ${balance} COIL`);

          // Check if balance has decreased to expected amount
          const balanceUpdated = currentBalance <= expectedNewBalance;

          if (balanceUpdated) {
            console.log('✅ Balance updated! Fetching fresh transactions...');
            
            // Fetch fresh transactions now that balance has changed
            const transfers = await tokenService.getTransfers(user.walletAddress as Hex, { limit: 10 });
            
            // Update Redux with new balance and transactions
            tokenSlice.dispatch(tokenSlice.setBalance({ balance, balanceRaw }));
            tokenSlice.dispatch(tokenSlice.prependTransactions(transfers));
            
            console.log('✅ Transaction confirmed! Balance and transactions updated in Redux.');
            return true;
          }

          return false;
        } catch (error) {
          console.error('Error polling for confirmation:', error);
          return false;
        }
      };

      // Start polling
      const poll = async () => {
        while (attempts < maxAttempts) {
          const confirmed = await waitForConfirmation();
          if (confirmed) {
            // Hide confirming state and show success toast
            setIsConfirming(false);
            setShowSuccessToast(true);
            // Navigate back after toast (using back() to preserve component state)
            setTimeout(() => {
              router.back();
            }, 1500);
            return;
          }
          // Wait before next poll
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }

        // Timeout - update anyway and navigate
        console.warn('⚠️ Polling timeout - updating data and navigating anyway');
        try {
          const [balance, balanceRaw, transfers] = await Promise.all([
            tokenService.getBalance(user.walletAddress as Hex),
            tokenService.getBalanceRaw(user.walletAddress as Hex),
            tokenService.getTransfers(user.walletAddress as Hex, { limit: 10 }),
          ]);
          tokenSlice.dispatch(tokenSlice.setBalance({ balance, balanceRaw }));
          tokenSlice.dispatch(tokenSlice.prependTransactions(transfers));
        } catch (error) {
          console.error('Error in timeout update:', error);
        }
        setIsConfirming(false);
        setShowSuccessToast(true);
        setTimeout(() => {
          router.back();
        }, 1500);
      };

      poll();
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
        message="נשלח בהצלחה!"
        visible={showSuccessToast}
        onHide={() => setShowSuccessToast(false)}
        duration={1500}
      />

      {/* Confirming Overlay */}
      {isConfirming && (
        <View style={styles.confirmingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.confirmingText}>שולח...</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} disabled={isConfirming}>
          <MaterialIcons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>שליחת COIL</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Recipient Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Recipient Address</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor={colors.textSecondary}
            value={recipient}
            onChangeText={setRecipient}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
        </View>

        {/* Amount Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Amount (COIL)</Text>
          <TextInput
            style={[styles.input, isAmountTooHigh && styles.inputError]}
            placeholder=""
            placeholderTextColor={colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            autoCorrect={false}
            spellCheck={false}
          />
          <View style={styles.inlineInfoRow}>
            <View style={{ flex: 1 }} />
            <Text style={styles.availableText}>Available balance: {formatEther(available)}</Text>
          </View>
          {isAmountTooHigh && (
            <Text style={styles.errorText}>Amount exceeds available balance</Text>
          )}
        </View>

        {/* Removed Chain ID section per requirement */}

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
            disabled={!isFormValid || isSending || isAmountTooHigh}
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
  inputError: {
    borderWidth: 1,
    borderColor: '#ff6b6b',
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
  inlineInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  availableText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#ff6b6b',
  },
  spacer: {
    flex: 1,
  },
  actions: {
    paddingBottom: 16,
  },
  confirmingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmingText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },
});

export default SendScene;
