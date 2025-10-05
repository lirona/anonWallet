import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DataPersistKeys, useDataPersist } from '@/hooks/useDataPersist';
import { smartWalletService, webAuthnService } from '@/services';
import { useAppSlice } from '@/slices';
import { colors } from '@/theme/colors';
import config from '@/utils/config';

export default function WalletCreationScreen() {
  const { dispatch, setUser, setLoggedIn } = useAppSlice();
  const { setPersistData } = useDataPersist();
  const [isCreating, setIsCreating] = useState(false);
  const [progressText, setProgressText] = useState('');

  const handleCreateWallet = async () => {
    // TODO: REMOVE THIS TEMPORARY HARDCODED WALLET LOGIC WHEN PASSKEYS ARE WORKING
    // This is a temporary workaround to test the rest of the app while passkeys are being debugged
    if (config.hardcodedUserWallet) {
      setIsCreating(true);
      setProgressText('Using test wallet...');

      try {
        // Use hardcoded wallet address for testing
        const userData = {
          passkeyRawId: 'test-passkey-id', // Dummy value
          walletAddress: config.hardcodedUserWallet,
        };

        await setPersistData(DataPersistKeys.USER, userData);
        dispatch(setUser(userData));
        dispatch(setLoggedIn(true));

        console.log('🧪 Using hardcoded test wallet:', config.hardcodedUserWallet);
        router.push('/wallet-home');
      } catch (error) {
        Alert.alert('Error', `Failed to set up test wallet: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsCreating(false);
        setProgressText('');
      }
      return;
    }

    // TODO: UNCOMMENT THIS WHEN PASSKEYS ARE WORKING ON ANDROID
    /*
    setIsCreating(true);

    try {
      // 1. Create passkey
      setProgressText('Creating passkey...');
      console.log('🔐 Step 1: Creating passkey...');
      const { publicKey, rawId } = await webAuthnService.createPasskey('My Wallet');
      console.log('✅ Passkey created');

      // 2. Calculate wallet address (before deployment)
      setProgressText('Calculating wallet address...');
      console.log('🧮 Step 2: Calculating wallet address...');
      const walletAddress = await smartWalletService.getWalletAddress(publicKey);
      console.log('✅ Wallet address:', walletAddress);

      // 3. Fund wallet with 0.01 ETH (must fund BEFORE deployment since user pays gas)
      setProgressText('Funding wallet...');
      console.log('💰 Step 3: Funding wallet with 0.01 ETH...');
      await smartWalletService.fundWallet(walletAddress, '0.01');
      console.log('✅ Wallet funded');

      // 4. Deploy wallet via UserOp (user pays for gas)
      setProgressText('Deploying wallet...');
      console.log('🏗️ Step 4: Deploying wallet via UserOp...');
      await smartWalletService.deployWallet(publicKey, rawId);
      console.log('✅ Wallet deployed');

      // Wait for deployment to be mined
      setProgressText('Waiting for deployment...');
      console.log('⏳ Waiting 15 seconds for deployment to be mined...');
      await new Promise(resolve => setTimeout(resolve, 15000));

      // 5. Test transfer: Send 0.001 ETH to test address
      setProgressText('Testing transaction...');
      console.log('🧪 Step 5: Sending test transaction (0.001 ETH)...');
      await smartWalletService.sendTokens(
        '0x0E1774FD4f836E6Ba2E22d0e11F4c69684ae4EB7',
        '0.001',
        rawId,
        walletAddress
      );
      console.log('✅ Test transaction completed');

      // 6. Save to AsyncStorage
      const userData = {
        passkeyRawId: rawId,
        walletAddress,
      };
      await setPersistData(DataPersistKeys.USER, userData);

      // 7. Update Redux
      dispatch(setUser(userData));
      dispatch(setLoggedIn(true));

      // 8. Navigate to wallet home
      router.push('/wallet-home');
      console.log('🎉 Wallet creation complete!');
    } catch (error) {
      console.error('❌ Wallet creation failed:', error);
      Alert.alert(
        'Error',
        `Failed to create wallet: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsCreating(false);
      setProgressText('');
    }
    */
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>ANON</Text>

        <Text style={styles.title}>Welcome to Anon Wallet</Text>

        <Text style={styles.subtitle}>
          Create your secure wallet with biometric authentication
        </Text>

        <TouchableOpacity
          style={[styles.button, isCreating && styles.buttonDisabled]}
          onPress={handleCreateWallet}
          activeOpacity={0.8}
          disabled={isCreating}
        >
          {isCreating ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={colors.white} />
              <Text style={styles.buttonText}>{progressText}</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Create Wallet</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 4,
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 48,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});